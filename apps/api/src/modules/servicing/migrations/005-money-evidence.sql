-- New rows gain an actual database recording instant; old Phase 4 rows remain
-- explicitly unknown rather than inventing historical recording times.
ALTER TABLE servicing.money_revisions ADD COLUMN recorded_at timestamptz NOT NULL DEFAULT clock_timestamp();
ALTER TABLE servicing.command_revisions ADD COLUMN recorded_at timestamptz;
ALTER TABLE servicing.command_revisions ALTER COLUMN recorded_at SET DEFAULT clock_timestamp();
CREATE FUNCTION servicing.full_report_scope() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT servicing.staff_role('auditor') AND NOT EXISTS(SELECT 1 FROM platform.branches
    WHERE organization_id=platform.current_organization() AND NOT platform.allowed_branch(id))
$$;
REVOKE ALL ON FUNCTION servicing.full_report_scope() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.full_report_scope() TO agap_runtime;

CREATE FUNCTION servicing.require_money_movement() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM servicing.money_revisions r WHERE r.organization_id=NEW.organization_id
    AND r.branch_id=NEW.branch_id AND r.command_id=NEW.command_id AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.body->'observations') o
      WHERE o#>>'{input,producer}'=NEW.producer AND (o#>>'{input,movementId}')::uuid=NEW.movement_id)) THEN
    RAISE EXCEPTION 'Movement identity requires matching persisted evidence' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER money_movement_evidence AFTER INSERT ON servicing.money_movements
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_money_movement();
REVOKE ALL ON FUNCTION servicing.require_money_movement() FROM PUBLIC;
