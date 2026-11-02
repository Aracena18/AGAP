-- A global deduplication identity cannot be reserved without its committed fact.
CREATE FUNCTION servicing.require_movement_evidence() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM servicing.observations o JOIN servicing.release_claims c
    ON c.organization_id=o.organization_id AND c.command_id=o.command_id
    WHERE o.organization_id=NEW.organization_id AND o.command_id=NEW.command_id
    AND c.branch_id=NEW.branch_id AND o.branch_id=NEW.branch_id
    AND o.body#>>'{input,producer}'=NEW.producer
    AND (o.body#>>'{input,movementId}')::uuid=NEW.movement_id) THEN
    RAISE EXCEPTION 'Movement claim requires matching committed observation' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER require_movement_evidence AFTER INSERT ON servicing.movement_claims
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_movement_evidence();
REVOKE ALL ON FUNCTION servicing.require_movement_evidence() FROM PUBLIC;
