-- Additive safeguards after exercising the initial candidate on the test DB.
CREATE POLICY origination_writer ON servicing.originations AS RESTRICTIVE FOR INSERT
  WITH CHECK(servicing.staff_role('cashier') AND prepared_by=NULLIF(current_setting('agap.user_id',true),'')::uuid);
CREATE POLICY claim_writer ON servicing.release_claims AS RESTRICTIVE FOR INSERT
  WITH CHECK(servicing.staff_role('cashier'));
CREATE POLICY revision_writer ON servicing.command_revisions AS RESTRICTIVE FOR INSERT
  WITH CHECK(actor_id=NULLIF(current_setting('agap.user_id',true),'')::uuid);

ALTER TABLE servicing.command_revisions ADD CONSTRAINT integer_amount CHECK(
  mod((body->>'amountCentavos')::numeric,1)=0
  AND (body#>>'{payload,amountCentavos}')::numeric IS NOT DISTINCT FROM (body->>'amountCentavos')::numeric
  AND (body#>>'{origination,offer,netReceivedCentavos}')::numeric IS NOT DISTINCT FROM (body->>'amountCentavos')::numeric
  AND body#>>'{payload,currency}' IS NOT DISTINCT FROM 'PHP'
  AND (body#>>'{payload,loanId}')::uuid IS NOT DISTINCT FROM (body->>'loanId')::uuid);

CREATE FUNCTION servicing.validate_origin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM applications.applications a WHERE a.organization_id=NEW.organization_id
    AND a.id=NEW.application_id AND a.branch_id=NEW.branch_id AND a.member_id=NEW.member_id) THEN
    RAISE EXCEPTION 'Invalid origination scope' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_origin BEFORE INSERT ON servicing.originations FOR EACH ROW EXECUTE FUNCTION servicing.validate_origin();

CREATE FUNCTION servicing.require_claim_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM servicing.command_revisions r WHERE r.organization_id=NEW.organization_id
    AND r.command_id=NEW.command_id AND r.version=1 AND r.branch_id=NEW.branch_id) THEN
    RAISE EXCEPTION 'First release claim requires initial revision' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER require_claim_revision AFTER INSERT ON servicing.release_claims
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_claim_revision();

CREATE FUNCTION servicing.validate_observation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM servicing.command_revisions r WHERE r.organization_id=NEW.organization_id
    AND r.command_id=NEW.command_id AND r.version=NEW.command_version AND r.branch_id=NEW.branch_id
    AND r.body->'observations'->-1=NEW.body_text::jsonb AND r.body->'history'->-1->>'action' IN ('observe','reconcile')
    AND r.actor_id=NULLIF(current_setting('agap.user_id',true),'')::uuid
    AND (NEW.body_text::jsonb->>'recordedBy')::uuid=r.actor_id) THEN
    RAISE EXCEPTION 'Observation must match its recorded command revision' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_observation BEFORE INSERT ON servicing.observations FOR EACH ROW EXECUTE FUNCTION servicing.validate_observation();
REVOKE ALL ON FUNCTION servicing.validate_origin(),servicing.require_claim_revision(),servicing.validate_observation() FROM PUBLIC;
