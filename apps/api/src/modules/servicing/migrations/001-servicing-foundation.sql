-- PAY-01 candidate: append-only, simulation-only command foundation. No posting.
CREATE SCHEMA servicing;
REVOKE ALL ON SCHEMA servicing FROM PUBLIC;
GRANT USAGE ON SCHEMA servicing TO agap_runtime;

CREATE FUNCTION servicing.staff_role(wanted text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT platform.current_member() IS NULL AND EXISTS (
    SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid
    AND u.organization_id=platform.current_organization() AND u.active AND wanted=ANY(u.roles))
$$;

CREATE TABLE servicing.originations (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL, member_id uuid NOT NULL,
  application_id uuid NOT NULL, prepared_by uuid NOT NULL,
  body_text text NOT NULL, body jsonb GENERATED ALWAYS AS (body_text::jsonb) STORED,
  body_hash text NOT NULL CHECK(body_hash=encode(sha256(convert_to(body_text,'UTF8')),'hex')),
  UNIQUE(organization_id,id), UNIQUE(organization_id,application_id),
  FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
  FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id),
  FOREIGN KEY(organization_id,prepared_by) REFERENCES identity.staff_users(organization_id,id),
  CHECK((body->>'id')::uuid IS NOT DISTINCT FROM id
    AND (body->>'organizationId')::uuid IS NOT DISTINCT FROM organization_id
    AND (body->>'branchId')::uuid IS NOT DISTINCT FROM branch_id
    AND (body->>'memberId')::uuid IS NOT DISTINCT FROM member_id
    AND (body->>'applicationId')::uuid IS NOT DISTINCT FROM application_id
    AND body->>'state' IS NOT DISTINCT FROM 'pending_release')
);
CREATE TABLE servicing.release_claims (
  command_id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL,
  origination_id uuid NOT NULL, business_event_id uuid NOT NULL, provider_key uuid NOT NULL,
  UNIQUE(organization_id,command_id), UNIQUE(organization_id,origination_id),
  UNIQUE(organization_id,business_event_id), UNIQUE(organization_id,provider_key),
  FOREIGN KEY(organization_id,origination_id) REFERENCES servicing.originations(organization_id,id)
);
CREATE TABLE servicing.command_revisions (
  organization_id uuid NOT NULL, branch_id uuid NOT NULL, command_id uuid NOT NULL,
  version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
  state text NOT NULL CHECK(state IN ('prepared','authorized','submitted','unknown','failed','confirmed_unposted')),
  actor_id uuid NOT NULL, body_text text NOT NULL,
  body jsonb GENERATED ALWAYS AS (body_text::jsonb) STORED,
  body_hash text NOT NULL CHECK(body_hash=encode(sha256(convert_to(body_text,'UTF8')),'hex')),
  PRIMARY KEY(organization_id,command_id,version),
  FOREIGN KEY(organization_id,command_id) REFERENCES servicing.release_claims(organization_id,command_id),
  FOREIGN KEY(organization_id,actor_id) REFERENCES identity.staff_users(organization_id,id),
  CHECK((body->>'id')::uuid IS NOT DISTINCT FROM command_id
    AND (body->>'organizationId')::uuid IS NOT DISTINCT FROM organization_id
    AND (body->>'branchId')::uuid IS NOT DISTINCT FROM branch_id
    AND (body->>'version')::bigint IS NOT DISTINCT FROM version
    AND body->>'state' IS NOT DISTINCT FROM state
    AND body->>'mode' IS NOT DISTINCT FROM 'simulation'
    AND body->>'kind' IS NOT DISTINCT FROM 'disbursement'
    AND body->>'currency' IS NOT DISTINCT FROM 'PHP'
    AND body->'receiptId' IS NOT DISTINCT FROM 'null'::jsonb
    AND body->'journalId' IS NOT DISTINCT FROM 'null'::jsonb
    AND COALESCE((body->>'amountCentavos')::numeric BETWEEN 1 AND 9007199254740991,false)
    AND COALESCE(jsonb_array_length(body->'history')=version,false)),
  CHECK(state='prepared' OR COALESCE((body->>'authorizedBy')::uuid<>(body->>'preparedBy')::uuid,false))
);
CREATE TABLE servicing.movement_claims (
  organization_id uuid NOT NULL, branch_id uuid NOT NULL, producer text NOT NULL,
  movement_id uuid NOT NULL, command_id uuid NOT NULL,
  PRIMARY KEY(organization_id,producer,movement_id),
  FOREIGN KEY(organization_id,command_id) REFERENCES servicing.release_claims(organization_id,command_id)
);
CREATE TABLE servicing.observations (
  id uuid NOT NULL, organization_id uuid NOT NULL, branch_id uuid NOT NULL, command_id uuid NOT NULL,
  command_version bigint NOT NULL, body_text text NOT NULL,
  body jsonb GENERATED ALWAYS AS (body_text::jsonb) STORED,
  body_hash text NOT NULL CHECK(body_hash=encode(sha256(convert_to(body_text,'UTF8')),'hex')),
  PRIMARY KEY(organization_id,id),
  FOREIGN KEY(organization_id,command_id,command_version)
    REFERENCES servicing.command_revisions(organization_id,command_id,version),
  CHECK((body#>>'{input,id}')::uuid IS NOT DISTINCT FROM id
    AND (body#>>'{input,commandId}')::uuid IS NOT DISTINCT FROM command_id)
);

CREATE FUNCTION servicing.immutable_record() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Servicing history is immutable' USING ERRCODE='23514'; END $$;

-- SQL independently binds aliases, scope, sequence and unchanged history/payload.
CREATE FUNCTION servicing.validate_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b jsonb := NEW.body_text::jsonb; previous jsonb; claim servicing.release_claims; origin servicing.originations; h jsonb; allowed boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('servicing:command:'||NEW.organization_id::text||':'||NEW.command_id::text,0));
  SELECT * INTO STRICT claim FROM servicing.release_claims WHERE organization_id=NEW.organization_id AND command_id=NEW.command_id;
  SELECT * INTO STRICT origin FROM servicing.originations WHERE organization_id=NEW.organization_id AND id=claim.origination_id;
  IF NEW.branch_id IS DISTINCT FROM origin.branch_id OR claim.branch_id IS DISTINCT FROM origin.branch_id
    OR (b->>'loanId')::uuid IS DISTINCT FROM origin.id OR (b->>'applicationId')::uuid IS DISTINCT FROM origin.application_id
    OR b->'origination' IS DISTINCT FROM origin.body OR (b->>'providerKey')::uuid IS DISTINCT FROM claim.provider_key
    OR (b->>'businessEventId')::uuid IS DISTINCT FROM claim.business_event_id THEN
    RAISE EXCEPTION 'Servicing binding mismatch' USING ERRCODE='23514';
  END IF;
  SELECT body INTO previous FROM servicing.command_revisions WHERE organization_id=NEW.organization_id AND command_id=NEW.command_id ORDER BY version DESC LIMIT 1;
  h := b->'history'->-1;
  IF previous IS NULL THEN
    allowed := NEW.version=1 AND NEW.state='prepared' AND h->>'action'='prepare' AND h->'from'='null'::jsonb
      AND (b->>'preparedBy')::uuid=NEW.actor_id AND servicing.staff_role('cashier');
  ELSE
    allowed := NEW.version=(previous->>'version')::bigint+1 AND b->>'payloadHash'=previous->>'payloadHash'
      AND (b-ARRAY['state','version','authorizedBy','authorization','submission','providerReference','observations','conflicts','history'])
        IS NOT DISTINCT FROM (previous-ARRAY['state','version','authorizedBy','authorization','submission','providerReference','observations','conflicts','history'])
      AND (b->'history')- (jsonb_array_length(b->'history')-1) IS NOT DISTINCT FROM previous->'history'
      AND h->>'from'=previous->>'state';
    IF h->>'action'='authorize' THEN
      allowed := allowed AND previous->>'state'='prepared' AND NEW.state='authorized'
        AND (b->>'authorizedBy')::uuid=NEW.actor_id AND servicing.staff_role('financial_authorizer')
        AND b->'observations'=previous->'observations' AND b->'submission'=previous->'submission';
    ELSIF h->>'action'='submit' THEN
      allowed := allowed AND previous->>'state'='authorized' AND NEW.state='submitted'
        AND b->'authorization'=previous->'authorization' AND b->'authorizedBy'=previous->'authorizedBy'
        AND b->'observations'=previous->'observations' AND b->'submission'->>'id' IS NOT NULL
        AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer'));
    ELSIF h->>'action' IN ('observe','reconcile') THEN
      allowed := allowed AND previous->>'state' IN ('submitted','unknown','failed','confirmed_unposted')
        AND (NEW.state=previous->>'state' OR previous->>'state' IN ('submitted','unknown') AND NEW.state IN ('unknown','failed','confirmed_unposted'))
        AND b->'authorization'=previous->'authorization' AND b->'authorizedBy'=previous->'authorizedBy'
        AND b->'submission'=previous->'submission'
        AND jsonb_array_length(b->'observations')=jsonb_array_length(previous->'observations')+1
        AND (b->'observations')-(jsonb_array_length(b->'observations')-1)=previous->'observations'
        AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer'));
    ELSE allowed := false;
    END IF;
  END IF;
  IF allowed IS DISTINCT FROM true OR h->>'to' IS DISTINCT FROM NEW.state OR (h->>'actorId')::uuid IS DISTINCT FROM NEW.actor_id THEN
    RAISE EXCEPTION 'Invalid servicing transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_revision BEFORE INSERT ON servicing.command_revisions FOR EACH ROW EXECUTE FUNCTION servicing.validate_revision();

-- An observation revision cannot commit without its separately indexed evidence.
CREATE FUNCTION servicing.require_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item jsonb := NEW.body->'observations'->-1;
BEGIN
  IF NEW.body->'history'->-1->>'action' IN ('observe','reconcile') AND NOT EXISTS (
    SELECT 1 FROM servicing.observations o WHERE o.organization_id=NEW.organization_id AND o.command_id=NEW.command_id
    AND o.command_version=NEW.version AND o.body=item) THEN
    RAISE EXCEPTION 'Missing settlement observation' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER require_observation AFTER INSERT ON servicing.command_revisions
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_observation();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['originations','release_claims','command_revisions','movement_claims','observations'] LOOP
    EXECUTE format('ALTER TABLE servicing.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE servicing.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY staff_scope ON servicing.%I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'') OR servicing.staff_role(''auditor''))) WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'')))',t);
    EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON servicing.%I FOR EACH ROW EXECUTE FUNCTION servicing.immutable_record()',t);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA servicing FROM PUBLIC,agap_runtime;
GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA servicing TO agap_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA servicing FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.staff_role(text) TO agap_runtime;

-- Private organization-wide deduplication index. Runtime cannot enumerate it.
DROP POLICY staff_scope ON servicing.movement_claims;
CREATE POLICY movement_scope ON servicing.movement_claims
  USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL
    AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')))
  WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL
    AND platform.allowed_branch(branch_id) AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')));
REVOKE SELECT ON servicing.movement_claims FROM agap_runtime;
-- Returns only a conflict flag for the caller's scoped command, never another
-- branch's command identity. Works with a non-BYPASSRLS definer as well.
CREATE FUNCTION servicing.movement_conflict(producer_name text, movement uuid, target uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')) THEN
    RAISE EXCEPTION 'Financial intake role required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM servicing.release_claims WHERE organization_id=platform.current_organization()
    AND command_id=target AND platform.allowed_branch(branch_id)) THEN
    RAISE EXCEPTION 'Scoped command required' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS(SELECT 1 FROM servicing.movement_claims WHERE organization_id=platform.current_organization()
    AND producer=producer_name AND movement_id=movement AND command_id<>target);
END $$;
REVOKE ALL ON FUNCTION servicing.movement_conflict(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.movement_conflict(text,uuid,uuid) TO agap_runtime;
