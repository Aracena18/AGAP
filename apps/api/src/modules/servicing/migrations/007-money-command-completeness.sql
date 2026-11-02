CREATE FUNCTION servicing.require_money_command() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM servicing.money_revisions r WHERE r.organization_id=NEW.organization_id AND r.command_id=NEW.id
    AND r.version=1 AND r.branch_id=NEW.branch_id AND r.body=NEW.header) THEN
    RAISE EXCEPTION 'Command requires exact initial revision' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER money_command_complete AFTER INSERT ON servicing.money_commands
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION servicing.require_money_command();
REVOKE ALL ON FUNCTION servicing.require_money_command() FROM PUBLIC;
