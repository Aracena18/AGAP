-- Versioned successor; preserve all Phase 4 tables and restrictive transitions.
-- Accounting's migrations must precede this migration in the reviewed registry.
CREATE TABLE servicing.money_commands (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL, loan_id uuid NOT NULL,
  application_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('disbursement','repayment')),
  event_id uuid NOT NULL, provider_key uuid NOT NULL, schedule_index integer,
  header_text text NOT NULL, header jsonb GENERATED ALWAYS AS (header_text::jsonb) STORED,
  UNIQUE(organization_id,id), UNIQUE(organization_id,event_id), UNIQUE(organization_id,provider_key),
  UNIQUE(organization_id,loan_id,schedule_index),
  FOREIGN KEY(organization_id,loan_id) REFERENCES servicing.originations(organization_id,id),
  CHECK((kind='repayment')=(schedule_index IS NOT NULL)), CHECK(schedule_index IS NULL OR schedule_index>=0)
);
CREATE UNIQUE INDEX money_first_release ON servicing.money_commands(organization_id,loan_id) WHERE kind='disbursement';
CREATE TABLE servicing.money_revisions (
  organization_id uuid NOT NULL, branch_id uuid NOT NULL, command_id uuid NOT NULL,
  version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991), actor_id uuid NOT NULL,
  body_text text NOT NULL, body jsonb GENERATED ALWAYS AS (body_text::jsonb) STORED,
  body_hash text NOT NULL CHECK(body_hash=encode(sha256(convert_to(body_text,'UTF8')),'hex')),
  PRIMARY KEY(organization_id,command_id,version),
  FOREIGN KEY(organization_id,command_id) REFERENCES servicing.money_commands(organization_id,id),
  FOREIGN KEY(organization_id,actor_id) REFERENCES identity.staff_users(organization_id,id),
  CHECK(body->>'format' IS NOT DISTINCT FROM 'servicing-command-v2' AND body->>'mode' IS NOT DISTINCT FROM 'simulation'
    AND (body->>'id')::uuid IS NOT DISTINCT FROM command_id AND (body->>'organizationId')::uuid IS NOT DISTINCT FROM organization_id
    AND (body->>'branchId')::uuid IS NOT DISTINCT FROM branch_id AND (body->>'version')::bigint IS NOT DISTINCT FROM version
    AND body#>>'{payload,currency}' IS NOT DISTINCT FROM 'PHP'
    AND COALESCE((body#>>'{payload,amountCentavos}')::numeric BETWEEN 1 AND 9007199254740991,false)
    AND mod((body#>>'{payload,amountCentavos}')::numeric,1)=0
    AND (body#>>'{payload,loanId}')::uuid IS NOT DISTINCT FROM (body->>'loanId')::uuid
    AND body->>'state' IN ('prepared','authorized','submitted','unknown','failed','confirmed_unposted','confirmed'))
);
CREATE TABLE servicing.postings (
  event_id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL, loan_id uuid NOT NULL,
  command_id uuid NOT NULL, command_version bigint NOT NULL, kind text NOT NULL CHECK(kind IN ('disbursement','repayment')),
  amount_centavos bigint NOT NULL CHECK(amount_centavos BETWEEN 1 AND 9007199254740991),
  effective_date date NOT NULL, recorded_at timestamptz NOT NULL, journal_id uuid NOT NULL,
  posting_rule_id uuid NOT NULL, allocation_id uuid NOT NULL UNIQUE, receipt_id uuid UNIQUE, schedule_index integer,
  principal_after bigint NOT NULL CHECK(principal_after BETWEEN 0 AND 9007199254740991),
  UNIQUE(organization_id,event_id), UNIQUE(organization_id,command_id), UNIQUE(organization_id,journal_id),
  UNIQUE(organization_id,loan_id,schedule_index),
  FOREIGN KEY(organization_id,command_id,command_version) REFERENCES servicing.money_revisions(organization_id,command_id,version),
  FOREIGN KEY(organization_id,journal_id) REFERENCES accounting.journals(organization_id,id),
  CHECK((kind='repayment')=(receipt_id IS NOT NULL)), CHECK((kind='repayment')=(schedule_index IS NOT NULL))
);
CREATE UNIQUE INDEX one_posted_release ON servicing.postings(organization_id,loan_id) WHERE kind='disbursement';
CREATE TABLE servicing.money_movements (
  organization_id uuid NOT NULL, branch_id uuid NOT NULL, producer text NOT NULL, movement_id uuid NOT NULL,
  command_id uuid NOT NULL, PRIMARY KEY(organization_id,producer,movement_id),
  FOREIGN KEY(organization_id,command_id) REFERENCES servicing.money_commands(organization_id,id)
);

CREATE FUNCTION servicing.validate_money_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b jsonb := NEW.body_text::jsonb; prev jsonb; head servicing.money_commands; origin servicing.originations; legacy jsonb; allowed boolean; initial_state text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('servicing:money:'||NEW.organization_id::text||':'||NEW.command_id::text,0));
  SELECT * INTO STRICT head FROM servicing.money_commands WHERE organization_id=NEW.organization_id AND id=NEW.command_id;
  SELECT * INTO STRICT origin FROM servicing.originations WHERE organization_id=NEW.organization_id AND id=head.loan_id;
  IF b#>>'{policy,format}' IS DISTINCT FROM 'principal-only-v1' OR b#>>'{policy,interestCentavos}' IS DISTINCT FROM '0'
    OR b#>>'{policy,feesCentavos}' IS DISTINCT FROM '0' OR b#>>'{policy,graceDays}' IS DISTINCT FROM '0'
    OR b#>>'{policy,allocation}' IS DISTINCT FROM 'scheduled-exact'
    OR (b#>>'{policy,organizationId}')::uuid IS DISTINCT FROM NEW.organization_id
    OR b#>>'{policy,productVersionId}' IS DISTINCT FROM origin.body#>>'{offer,productVersionId}'
    OR origin.body#>>'{offer,principalCentavos}' IS DISTINCT FROM origin.body#>>'{offer,netReceivedCentavos}'
    OR origin.body#>>'{offer,feesPaidSeparatelyCentavos}' IS DISTINCT FROM '0'
    OR (SELECT sum((x->>'amountCentavos')::numeric) FROM jsonb_array_elements(origin.body#>'{offer,payments}') x)
      IS DISTINCT FROM (origin.body#>>'{offer,principalCentavos}')::numeric THEN
    RAISE EXCEPTION 'Unsupported financial components' USING ERRCODE='23514';
  END IF;
  IF head.branch_id IS DISTINCT FROM origin.branch_id OR head.application_id IS DISTINCT FROM origin.application_id
    OR NEW.branch_id IS DISTINCT FROM origin.branch_id OR (b->>'loanId')::uuid IS DISTINCT FROM origin.id
    OR (b->>'eventId')::uuid IS DISTINCT FROM head.event_id OR (b->>'providerKey')::uuid IS DISTINCT FROM head.provider_key
    OR b->>'kind' IS DISTINCT FROM head.kind OR b->'scheduleIndex' IS DISTINCT FROM head.header->'scheduleIndex'
    OR NEW.actor_id IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN
    RAISE EXCEPTION 'Money scope mismatch' USING ERRCODE='23514';
  END IF;
  SELECT body INTO prev FROM servicing.money_revisions WHERE organization_id=NEW.organization_id AND command_id=NEW.command_id ORDER BY version DESC LIMIT 1;
  IF prev IS NULL THEN
    allowed := NEW.version=1 AND b=head.header;
    IF head.kind='disbursement' THEN
      SELECT body INTO legacy FROM servicing.command_revisions WHERE organization_id=NEW.organization_id AND command_id=NEW.command_id
        AND version=(b->>'legacyVersion')::bigint;
      allowed := allowed AND servicing.staff_role('financial_authorizer') AND legacy->>'state'='confirmed_unposted'
        AND legacy->'conflicts'='[]'::jsonb AND legacy->'payload'=b->'payload' AND legacy->'observations'=b->'observations'
        AND legacy->>'businessEventId'=b->>'eventId' AND legacy->>'providerKey'=b->>'providerKey'
        AND legacy->>'preparedBy'=b->>'preparedBy' AND legacy->'authorization'->>'userId'=b->'authorization'->>'userId'
        AND b->>'state'='confirmed_unposted';
    ELSE
      allowed := allowed AND servicing.staff_role('cashier') AND b->>'state'='prepared'
        AND b->'authorization'='null'::jsonb AND b->'submission'='null'::jsonb AND b->'observations'='[]'::jsonb
        AND (b->>'preparedBy')::uuid=NEW.actor_id AND EXISTS(SELECT 1 FROM servicing.postings p WHERE p.organization_id=NEW.organization_id AND p.loan_id=head.loan_id AND p.kind='disbursement');
    END IF;
  ELSE
    allowed := NEW.version=(prev->>'version')::bigint+1
      AND (b-ARRAY['version','state','authorization','submission','observations','conflicts','posting']) IS NOT DISTINCT FROM (prev-ARRAY['version','state','authorization','submission','observations','conflicts','posting']);
    initial_state:=prev->>'state';
    IF initial_state='prepared' THEN
      allowed := allowed AND b->>'state'='authorized' AND servicing.staff_role('financial_authorizer')
        AND (b#>>'{authorization,userId}')::uuid=NEW.actor_id AND NEW.actor_id<>(b->>'preparedBy')::uuid
        AND b->'observations'=prev->'observations' AND b->'submission'=prev->'submission';
    ELSIF initial_state='authorized' THEN
      allowed := allowed AND b->>'state'='submitted' AND b->'authorization'=prev->'authorization'
        AND b->'submission'->>'id' IS NOT NULL AND b->'observations'=prev->'observations'
        AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer'));
    ELSIF b->>'state'='confirmed' THEN
      allowed := allowed AND initial_state='confirmed_unposted' AND servicing.staff_role('financial_authorizer')
        AND NEW.actor_id<>(b->>'preparedBy')::uuid AND b->'conflicts'='[]'::jsonb AND b->'posting'<>'null'::jsonb
        AND b->'observations'=prev->'observations' AND b->'authorization'=prev->'authorization' AND b->'submission'=prev->'submission';
    ELSE
      allowed := allowed AND initial_state IN ('submitted','unknown','failed','confirmed_unposted')
        AND (b->>'state'=initial_state OR initial_state IN ('submitted','unknown') AND b->>'state' IN ('unknown','failed','confirmed_unposted'))
        AND jsonb_array_length(b->'observations')=jsonb_array_length(prev->'observations')+1
        AND (b->'observations')-(jsonb_array_length(b->'observations')-1)=prev->'observations'
        AND b->'authorization'=prev->'authorization' AND b->'submission'=prev->'submission'
        AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer'));
    END IF;
  END IF;
  IF head.kind='repayment' AND ((b#>>'{payload,amountCentavos}')::numeric IS DISTINCT FROM
    (origin.body#>'{offer,payments}'->head.schedule_index->>'amountCentavos')::numeric
    OR b#>>'{payload,effectiveDate}' IS DISTINCT FROM origin.body#>'{offer,payments}'->head.schedule_index->>'date') THEN
    RAISE EXCEPTION 'Unsupported repayment schedule' USING ERRCODE='23514';
  END IF;
  IF allowed IS DISTINCT FROM true OR (b->>'state'='confirmed') IS DISTINCT FROM (b->'posting'<>'null'::jsonb) THEN
    RAISE EXCEPTION 'Invalid versioned money transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_money_revision BEFORE INSERT ON servicing.money_revisions FOR EACH ROW EXECUTE FUNCTION servicing.validate_money_revision();

CREATE FUNCTION servicing.require_posted_effects() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE b jsonb; p servicing.postings; c servicing.money_commands; policy jsonb; before_amount numeric; journal accounting.journals;
BEGIN
  IF TG_TABLE_NAME='money_revisions' THEN
    IF NEW.body->>'state'<>'confirmed' THEN RETURN NULL; END IF;
    SELECT * INTO p FROM servicing.postings WHERE organization_id=NEW.organization_id AND command_id=NEW.command_id AND command_version=NEW.version;
    IF NOT FOUND THEN RAISE EXCEPTION 'Posted effects missing' USING ERRCODE='23514'; END IF;
  ELSE p:=NEW;
  END IF;
  SELECT body INTO b FROM servicing.money_revisions WHERE organization_id=p.organization_id AND command_id=p.command_id AND version=p.command_version;
  SELECT * INTO STRICT c FROM servicing.money_commands WHERE organization_id=p.organization_id AND id=p.command_id;
  SELECT * INTO STRICT journal FROM accounting.journals WHERE organization_id=p.organization_id AND id=p.journal_id;
  policy:=b->'policy';
  IF b->>'state' IS DISTINCT FROM 'confirmed' OR p.branch_id IS DISTINCT FROM c.branch_id OR p.loan_id IS DISTINCT FROM c.loan_id
    OR p.kind IS DISTINCT FROM c.kind OR p.event_id IS DISTINCT FROM c.event_id OR p.amount_centavos IS DISTINCT FROM (b#>>'{payload,amountCentavos}')::bigint
    OR p.effective_date IS DISTINCT FROM (b#>>'{payload,effectiveDate}')::date OR p.schedule_index IS DISTINCT FROM c.schedule_index
    OR (b#>>'{posting,journalId}')::uuid IS DISTINCT FROM p.journal_id OR (b#>>'{posting,receiptId}')::uuid IS DISTINCT FROM p.receipt_id
    OR (b#>>'{posting,eventId}')::uuid IS DISTINCT FROM p.event_id OR (b#>>'{posting,principalAfterCentavos}')::bigint IS DISTINCT FROM p.principal_after
    OR journal.source_event_id IS DISTINCT FROM p.event_id OR journal.posting_kind IS DISTINCT FROM p.kind
    OR journal.posting_rule_version_id IS DISTINCT FROM p.posting_rule_id OR journal.effective_date IS DISTINCT FROM p.effective_date
    OR p.recorded_at IS DISTINCT FROM (b#>>'{posting,postedAt}')::timestamptz
    OR p.posting_rule_id IS DISTINCT FROM (policy->>(CASE WHEN p.kind='disbursement' THEN 'releaseRuleId' ELSE 'repaymentRuleId' END))::uuid THEN
    RAISE EXCEPTION 'Posted linkage mismatch' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(b->'observations') o WHERE o#>>'{input,state}'='confirmed'
    AND o#>>'{input,verified}'='true' AND (o#>>'{input,amountMinorUnits}')::bigint=p.amount_centavos
    AND o#>>'{input,currency}'='PHP' AND (o#>>'{input,effectiveDate}')::date=p.effective_date AND o#>>'{input,movementId}' IS NOT NULL) THEN
    RAISE EXCEPTION 'Known settlement missing' USING ERRCODE='23514';
  END IF;
  IF (SELECT count(*) FROM accounting.journal_lines l WHERE l.organization_id=p.organization_id AND l.journal_id=p.journal_id)<>2
    OR NOT EXISTS(SELECT 1 FROM accounting.journal_lines l WHERE l.organization_id=p.organization_id AND l.journal_id=p.journal_id
      AND l.account_id=(policy->>'principalAccountId')::uuid AND l.side=CASE WHEN p.kind='disbursement' THEN 'debit' ELSE 'credit' END AND l.amount_centavos=p.amount_centavos)
    OR NOT EXISTS(SELECT 1 FROM accounting.journal_lines l WHERE l.organization_id=p.organization_id AND l.journal_id=p.journal_id
      AND l.account_id=(policy->>'cashAccountId')::uuid AND l.side=CASE WHEN p.kind='disbursement' THEN 'credit' ELSE 'debit' END AND l.amount_centavos=p.amount_centavos) THEN
    RAISE EXCEPTION 'Principal mapping mismatch' USING ERRCODE='23514';
  END IF;
  SELECT COALESCE(sum(CASE WHEN kind='disbursement' THEN amount_centavos ELSE -amount_centavos END),0) INTO before_amount
    FROM servicing.postings WHERE organization_id=p.organization_id AND loan_id=p.loan_id AND event_id<>p.event_id;
  IF p.principal_after IS DISTINCT FROM (before_amount+(CASE WHEN p.kind='disbursement' THEN p.amount_centavos ELSE -p.amount_centavos END)) THEN
    RAISE EXCEPTION 'Principal conservation failed' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER posted_effects AFTER INSERT ON servicing.postings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_posted_effects();
CREATE CONSTRAINT TRIGGER confirmed_effects AFTER INSERT ON servicing.money_revisions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_posted_effects();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['money_commands','money_revisions','postings','money_movements'] LOOP
    EXECUTE format('ALTER TABLE servicing.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE servicing.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY staff_scope ON servicing.%I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'') OR servicing.staff_role(''auditor''))) WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'')))',t);
    EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON servicing.%I FOR EACH ROW EXECUTE FUNCTION servicing.immutable_record()',t);
  END LOOP;
END $$;
GRANT SELECT,INSERT ON servicing.money_commands,servicing.money_revisions,servicing.postings,servicing.money_movements TO agap_runtime;
REVOKE ALL ON FUNCTION servicing.validate_money_revision(),servicing.require_posted_effects() FROM PUBLIC;

DROP POLICY staff_scope ON servicing.money_movements;
CREATE POLICY private_movement_scope ON servicing.money_movements
  USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL
    AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')))
  WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
    AND (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')));
REVOKE SELECT ON servicing.money_movements FROM agap_runtime;
CREATE FUNCTION servicing.money_movement_conflict(producer_name text, movement uuid, target uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT (servicing.staff_role('cashier') OR servicing.staff_role('financial_authorizer')) OR NOT EXISTS(
    SELECT 1 FROM servicing.money_commands WHERE organization_id=platform.current_organization() AND id=target AND platform.allowed_branch(branch_id)) THEN
    RAISE EXCEPTION 'Scoped financial command required' USING ERRCODE='42501';
  END IF;
  RETURN EXISTS(SELECT 1 FROM servicing.money_movements WHERE organization_id=platform.current_organization() AND producer=producer_name AND movement_id=movement AND command_id<>target)
    OR EXISTS(SELECT 1 FROM servicing.movement_claims WHERE organization_id=platform.current_organization() AND producer=producer_name AND movement_id=movement AND command_id<>target);
END $$;
REVOKE ALL ON FUNCTION servicing.money_movement_conflict(text,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.money_movement_conflict(text,uuid,uuid) TO agap_runtime;
