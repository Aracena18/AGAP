-- Additive fictional movement intake; old command/decision bytes are unchanged.
CREATE TABLE servicing.fictional_movements (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,branch_id uuid NOT NULL,loan_id uuid NOT NULL,command_id uuid NOT NULL,
 provider_key uuid NOT NULL,business_event_id uuid NOT NULL,submission_id uuid NOT NULL,payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 kind text NOT NULL CHECK(kind IN ('disbursement','repayment')),amount_centavos bigint NOT NULL CHECK(amount_centavos BETWEEN 1 AND 9007199254740991),
 effective_date date NOT NULL,currency text NOT NULL CHECK(currency='PHP'),created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(organization_id,id),UNIQUE(organization_id,command_id),UNIQUE(organization_id,provider_key),UNIQUE(organization_id,business_event_id),
 FOREIGN KEY(organization_id,loan_id) REFERENCES servicing.originations(organization_id,id),
 FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
 FOREIGN KEY(organization_id,created_by) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE servicing.fictional_movement_observations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,branch_id uuid NOT NULL,movement_id uuid NOT NULL,revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 command_version bigint NOT NULL CHECK(command_version BETWEEN 1 AND 9007199254740991),recorded_by uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 state text NOT NULL CHECK(state IN ('confirmed','failed','unknown')),body_text text NOT NULL CHECK(octet_length(body_text) BETWEEN 2 AND 8192),
 body jsonb GENERATED ALWAYS AS(body_text::jsonb) STORED,body_hash text NOT NULL CHECK(body_hash=encode(sha256(convert_to(body_text,'UTF8')),'hex')),
 UNIQUE(organization_id,movement_id,revision),
 FOREIGN KEY(organization_id,movement_id) REFERENCES servicing.fictional_movements(organization_id,id),
 FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id),
 CHECK((body->>'id')::uuid IS NOT DISTINCT FROM id AND body->>'state' IS NOT DISTINCT FROM state
   AND body->>'mode' IS NOT DISTINCT FROM 'simulation' AND body->>'producer' IS NOT DISTINCT FROM 'fictional-sql-adapter-v1'
   AND (body->>'verified')::boolean IS NOT DISTINCT FROM (state<>'unknown'))
);
CREATE TABLE servicing.action_notes (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,branch_id uuid NOT NULL,command_id uuid NOT NULL,command_version bigint NOT NULL CHECK(command_version BETWEEN 1 AND 9007199254740991),
 command_stream text NOT NULL CHECK(command_stream IN ('release-v1','money-v2')),
 action text NOT NULL CHECK(action IN ('authorize','submit','observe','finalize','status_check')),reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 recorded_by uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(organization_id,command_id,command_stream,command_version,action),
 FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['fictional_movements','fictional_movement_observations','action_notes'] LOOP
  EXECUTE format('ALTER TABLE servicing.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE servicing.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY staff_scope ON servicing.%I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL
    AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'') OR servicing.staff_role(''auditor'')))
    WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
    AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'')))',t);
  EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON servicing.%I FOR EACH ROW EXECUTE FUNCTION servicing.immutable_record()',t);
  EXECUTE format('CREATE VIEW servicing.staff_%I WITH(security_barrier=true) AS SELECT * FROM servicing.%I WHERE organization_id=platform.current_organization()
    AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'') OR servicing.staff_role(''auditor''))',t,t);
  EXECUTE format('GRANT INSERT ON servicing.%I TO agap_runtime',t);
  EXECUTE format('GRANT SELECT ON servicing.staff_%I TO agap_runtime',t);
 END LOOP;
END $$;
CREATE FUNCTION servicing.require_fictional_intent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE c jsonb;
BEGIN
 IF NEW.created_by IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN RAISE EXCEPTION 'Actual actor required' USING ERRCODE='42501'; END IF;
 SELECT r.body INTO c FROM servicing.money_revisions r WHERE r.organization_id=NEW.organization_id AND r.command_id=NEW.command_id ORDER BY r.version DESC LIMIT 1;
 IF c IS NULL THEN SELECT r.body INTO c FROM servicing.command_revisions r WHERE r.organization_id=NEW.organization_id AND r.command_id=NEW.command_id ORDER BY r.version DESC LIMIT 1; END IF;
 IF c IS NULL OR c->>'mode'<>'simulation' OR c->>'state'<>'submitted' OR (c->>'loanId')::uuid IS DISTINCT FROM NEW.loan_id
   OR (c->>'providerKey')::uuid IS DISTINCT FROM NEW.provider_key OR COALESCE(c->>'eventId',c->>'businessEventId')::uuid IS DISTINCT FROM NEW.business_event_id
   OR (c#>>'{submission,id}')::uuid IS DISTINCT FROM NEW.submission_id OR c->>'payloadHash' IS DISTINCT FROM NEW.payload_hash
   OR (c#>>'{payload,amountCentavos}')::bigint IS DISTINCT FROM NEW.amount_centavos OR (c#>>'{payload,effectiveDate}')::date IS DISTINCT FROM NEW.effective_date
   OR c#>>'{payload,currency}' IS DISTINCT FROM NEW.currency OR c->>'kind' IS DISTINCT FROM NEW.kind
   OR (c->>'organizationId')::uuid IS DISTINCT FROM NEW.organization_id OR (c->>'branchId')::uuid IS DISTINCT FROM NEW.branch_id THEN
   RAISE EXCEPTION 'Exact committed fictional submission required' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fictional_intent BEFORE INSERT ON servicing.fictional_movements FOR EACH ROW EXECUTE FUNCTION servicing.require_fictional_intent();
REVOKE ALL ON FUNCTION servicing.require_fictional_intent() FROM PUBLIC;
CREATE FUNCTION servicing.require_intake_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE m servicing.fictional_movements%ROWTYPE; prior bigint; p jsonb:=NEW.body_text::jsonb;
BEGIN
 SELECT * INTO m FROM servicing.fictional_movements WHERE organization_id=NEW.organization_id AND id=NEW.movement_id;
 SELECT COALESCE(max(revision),0) INTO prior FROM servicing.fictional_movement_observations WHERE organization_id=NEW.organization_id AND movement_id=NEW.movement_id;
 IF m.id IS NULL OR m.branch_id IS DISTINCT FROM NEW.branch_id OR NEW.recorded_by IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid
   OR NEW.revision<>prior+1 OR (p->>'commandId')::uuid IS DISTINCT FROM m.command_id OR (p->>'businessEventId')::uuid IS DISTINCT FROM m.business_event_id
   OR (p->>'providerKey')::uuid IS DISTINCT FROM m.provider_key
   OR (NEW.state='confirmed' AND ((p->>'movementId')::uuid IS DISTINCT FROM m.id OR (p->>'amountMinorUnits')::bigint IS DISTINCT FROM m.amount_centavos
     OR p->>'currency' IS DISTINCT FROM m.currency OR (p->>'effectiveDate')::date IS DISTINCT FROM m.effective_date)) THEN
   RAISE EXCEPTION 'Exact permanent movement observation required' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER intake_observation BEFORE INSERT ON servicing.fictional_movement_observations FOR EACH ROW EXECUTE FUNCTION servicing.require_intake_observation();
REVOKE ALL ON FUNCTION servicing.require_intake_observation() FROM PUBLIC;
CREATE FUNCTION servicing.require_action_note() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE present boolean;
BEGIN
 IF NEW.recorded_by IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN RAISE EXCEPTION 'Actual actor required' USING ERRCODE='42501'; END IF;
 IF NEW.command_stream='release-v1' THEN
  SELECT EXISTS(SELECT 1 FROM servicing.command_revisions r WHERE r.organization_id=NEW.organization_id AND r.branch_id=NEW.branch_id AND r.command_id=NEW.command_id AND r.version=NEW.command_version) INTO present;
 ELSE
  SELECT EXISTS(SELECT 1 FROM servicing.money_revisions r WHERE r.organization_id=NEW.organization_id AND r.branch_id=NEW.branch_id AND r.command_id=NEW.command_id AND r.version=NEW.command_version) INTO present;
 END IF;
 IF NOT present THEN RAISE EXCEPTION 'Exact saved command revision required' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER action_note BEFORE INSERT ON servicing.action_notes FOR EACH ROW EXECUTE FUNCTION servicing.require_action_note();
REVOKE ALL ON FUNCTION servicing.require_action_note() FROM PUBLIC;
CREATE VIEW servicing.staff_lending_applications WITH(security_barrier=true) AS
 SELECT a.id,a.organization_id,a.branch_id,r.recorded_at,r.snapshot#>>'{basis,application,memberName}' AS member_label,a.purpose,
   (SELECT (offer->>'principalCentavos')::bigint FROM jsonb_array_elements(r.snapshot#>'{basis,offers}') offer WHERE offer->>'id'=r.snapshot#>>'{input,offerVersionId}' LIMIT 1) AS principal_centavos,
   EXISTS(SELECT 1 FROM decisions.acceptances accepted WHERE accepted.organization_id=a.organization_id AND accepted.application_id=a.id
     AND accepted.decision_id=r.id AND accepted.member_id=a.member_id AND accepted.document_id=r.document_id) AS acceptance_recorded,o.id AS loan_id
 FROM applications.applications a JOIN decisions.streams s ON s.organization_id=a.organization_id AND s.application_id=a.id
 JOIN decisions.records r ON r.organization_id=a.organization_id AND r.id=s.decision_id AND r.application_id=a.id
 LEFT JOIN servicing.originations o ON o.organization_id=a.organization_id AND o.application_id=a.id
 WHERE a.organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(a.branch_id)
   AND r.outcome='approve' AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer') OR servicing.staff_role('auditor'));
GRANT SELECT ON servicing.staff_lending_applications TO agap_runtime;
