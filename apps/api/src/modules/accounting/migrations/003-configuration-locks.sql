-- Keep the exact account/rule definitions stable through the financial commit.
CREATE FUNCTION accounting.guard_rule_definition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM accounting.journals WHERE organization_id=OLD.organization_id AND posting_rule_version_id=OLD.id) THEN
    RAISE EXCEPTION 'A used posting-rule version is immutable; create a new version' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_used_rule BEFORE UPDATE OR DELETE ON accounting.posting_rules FOR EACH ROW EXECUTE FUNCTION accounting.guard_rule_definition();

CREATE FUNCTION accounting.guard_rule_mapping() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE definition jsonb;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.rule_id<>OLD.rule_id) THEN
    RAISE EXCEPTION 'Mapping rule identity cannot change' USING ERRCODE='23514';
  END IF;
  definition:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  PERFORM 1 FROM accounting.posting_rules WHERE organization_id=(definition->>'organization_id')::uuid AND id=(definition->>'rule_id')::uuid FOR UPDATE;
  IF EXISTS(SELECT 1 FROM accounting.journals WHERE organization_id=(definition->>'organization_id')::uuid AND posting_rule_version_id=(definition->>'rule_id')::uuid) THEN
    RAISE EXCEPTION 'A used posting-rule mapping is immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_used_mapping BEFORE INSERT OR UPDATE OR DELETE ON accounting.rule_accounts FOR EACH ROW EXECUTE FUNCTION accounting.guard_rule_mapping();

CREATE FUNCTION accounting.guard_account_definition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'active')=(to_jsonb(OLD)-'active') THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM accounting.journal_lines WHERE organization_id=OLD.organization_id AND account_id=OLD.id) THEN
    RAISE EXCEPTION 'A used account definition is immutable; active status may change' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_used_account BEFORE UPDATE OR DELETE ON accounting.accounts FOR EACH ROW EXECUTE FUNCTION accounting.guard_account_definition();

CREATE FUNCTION accounting.lock_posting_configuration() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE rule accounting.posting_rules%ROWTYPE; account accounting.accounts%ROWTYPE; expected_accounts integer; locked_accounts integer:=0;
BEGIN
  -- The period is first, including for privileged direct inserts used by tests.
  PERFORM 1 FROM accounting.periods WHERE organization_id=NEW.organization_id AND id=NEW.period_id
    AND state='open' AND NEW.effective_date BETWEEN starts_on AND ends_on FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The posting period is not open' USING ERRCODE='AG409'; END IF;
  SELECT * INTO rule FROM accounting.posting_rules WHERE organization_id=NEW.organization_id AND id=NEW.posting_rule_version_id FOR SHARE;
  IF NOT FOUND OR rule.currency<>NEW.currency OR (NEW.reversal_of_journal_id IS NULL AND
    (rule.posting_kind<>NEW.posting_kind OR NEW.effective_date<rule.effective_from OR (rule.effective_to IS NOT NULL AND NEW.effective_date>rule.effective_to))) THEN
    RAISE EXCEPTION 'Posting rule changed or is unavailable' USING ERRCODE='AG422';
  END IF;
  SELECT count(DISTINCT value->>'accountId') INTO expected_accounts FROM jsonb_array_elements(NEW.request->'lines');
  FOR account IN SELECT a.* FROM accounting.accounts a WHERE a.organization_id=NEW.organization_id
    AND a.id IN (SELECT (value->>'accountId')::uuid FROM jsonb_array_elements(NEW.request->'lines')) ORDER BY a.id FOR SHARE OF a LOOP
    locked_accounts:=locked_accounts+1;
    IF NOT account.active OR account.currency<>NEW.currency THEN RAISE EXCEPTION 'Posting account changed or is unavailable' USING ERRCODE='AG422'; END IF;
  END LOOP;
  IF locked_accounts<>expected_accounts THEN RAISE EXCEPTION 'Posting account is unavailable' USING ERRCODE='AG422'; END IF;
  IF NEW.reversal_of_journal_id IS NULL AND EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.request->'lines') e WHERE NOT EXISTS(
    SELECT 1 FROM accounting.rule_accounts r WHERE r.organization_id=NEW.organization_id AND r.rule_id=rule.id
      AND r.account_id=(e->>'accountId')::uuid AND r.side=e->>'side')) THEN
    RAISE EXCEPTION 'Posting mapping changed or is unavailable' USING ERRCODE='AG422';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stable_posting_configuration BEFORE INSERT ON accounting.journals FOR EACH ROW EXECUTE FUNCTION accounting.lock_posting_configuration();
REVOKE ALL ON FUNCTION accounting.guard_rule_definition(),accounting.guard_rule_mapping(),accounting.guard_account_definition(),accounting.lock_posting_configuration() FROM PUBLIC;
