-- GL-01 candidate. Robert registers this directory after consuming-owner review.
CREATE SCHEMA accounting;
REVOKE ALL ON SCHEMA accounting FROM PUBLIC;

CREATE TABLE accounting.accounts (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  code text NOT NULL, label text NOT NULL, currency text NOT NULL CHECK(currency='PHP'),
  active boolean NOT NULL DEFAULT true, UNIQUE(organization_id,id), UNIQUE(organization_id,code)
);
CREATE TABLE accounting.posting_rules (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  posting_kind text NOT NULL, currency text NOT NULL CHECK(currency='PHP'),
  effective_from date NOT NULL, effective_to date, CHECK(effective_to IS NULL OR effective_to>=effective_from),
  UNIQUE(organization_id,id)
);
CREATE TABLE accounting.rule_accounts (
  organization_id uuid NOT NULL, rule_id uuid NOT NULL, account_id uuid NOT NULL,
  side text NOT NULL CHECK(side IN ('debit','credit')), PRIMARY KEY(organization_id,rule_id,account_id,side),
  FOREIGN KEY(organization_id,rule_id) REFERENCES accounting.posting_rules(organization_id,id),
  FOREIGN KEY(organization_id,account_id) REFERENCES accounting.accounts(organization_id,id)
);
CREATE TABLE accounting.periods (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  starts_on date NOT NULL, ends_on date NOT NULL, state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','closing','closed')),
  CHECK(ends_on>=starts_on), UNIQUE(organization_id,id)
);
CREATE FUNCTION accounting.guard_period() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  -- Configuration is operator-owned. Serialize definitions without an extension.
  PERFORM 1 FROM platform.organizations WHERE id=NEW.organization_id FOR UPDATE;
  IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.organization_id<>OLD.organization_id OR NEW.starts_on<>OLD.starts_on OR NEW.ends_on<>OLD.ends_on
    OR (NEW.state<>OLD.state AND NOT ((OLD.state='open' AND NEW.state='closing') OR (OLD.state='closing' AND NEW.state='closed')))) THEN
    RAISE EXCEPTION 'Period identity/dates are immutable and closing cannot be undone' USING ERRCODE='23514';
  END IF;
  IF EXISTS(SELECT 1 FROM accounting.periods p WHERE p.organization_id=NEW.organization_id AND p.id<>NEW.id
    AND daterange(p.starts_on,p.ends_on,'[]') && daterange(NEW.starts_on,NEW.ends_on,'[]')) THEN
    RAISE EXCEPTION 'Accounting periods cannot overlap' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_period BEFORE INSERT OR UPDATE ON accounting.periods FOR EACH ROW EXECUTE FUNCTION accounting.guard_period();

CREATE TABLE accounting.journals (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, source_event_id uuid NOT NULL,
  posting_kind text NOT NULL, posting_rule_version_id uuid NOT NULL, effective_date date NOT NULL,
  period_id uuid NOT NULL, currency text NOT NULL CHECK(currency='PHP'), reversal_of_journal_id uuid,
  request jsonb NOT NULL, posted_by uuid NOT NULL, posted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,source_event_id),
  FOREIGN KEY(organization_id,period_id) REFERENCES accounting.periods(organization_id,id),
  FOREIGN KEY(organization_id,posting_rule_version_id) REFERENCES accounting.posting_rules(organization_id,id),
  FOREIGN KEY(organization_id,posted_by) REFERENCES identity.staff_users(organization_id,id),
  FOREIGN KEY(organization_id,reversal_of_journal_id) REFERENCES accounting.journals(organization_id,id),
  CHECK(reversal_of_journal_id IS NULL OR reversal_of_journal_id<>id)
);
CREATE UNIQUE INDEX one_full_reversal ON accounting.journals(organization_id,reversal_of_journal_id) WHERE reversal_of_journal_id IS NOT NULL;
CREATE TABLE accounting.journal_lines (
  organization_id uuid NOT NULL, journal_id uuid NOT NULL, line_number integer NOT NULL CHECK(line_number BETWEEN 1 AND 100),
  account_id uuid NOT NULL, side text NOT NULL CHECK(side IN ('debit','credit')),
  amount_centavos bigint NOT NULL CHECK(amount_centavos BETWEEN 1 AND 9007199254740991),
  PRIMARY KEY(organization_id,journal_id,line_number),
  FOREIGN KEY(organization_id,journal_id) REFERENCES accounting.journals(organization_id,id),
  FOREIGN KEY(organization_id,account_id) REFERENCES accounting.accounts(organization_id,id)
);
CREATE FUNCTION accounting.immutable_posting() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Posted accounting history is immutable; append a linked reversal' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_journal BEFORE UPDATE OR DELETE ON accounting.journals FOR EACH ROW EXECUTE FUNCTION accounting.immutable_posting();
CREATE TRIGGER immutable_line BEFORE UPDATE OR DELETE ON accounting.journal_lines FOR EACH ROW EXECUTE FUNCTION accounting.immutable_posting();
CREATE FUNCTION accounting.check_journal_balance() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE journal uuid; org uuid; line_count integer; balance numeric; total numeric;
BEGIN
  journal:=(to_jsonb(NEW)->>(CASE WHEN TG_TABLE_NAME='journals' THEN 'id' ELSE 'journal_id' END))::uuid;
  org:=NEW.organization_id;
  SELECT count(*),COALESCE(sum(CASE WHEN side='debit' THEN amount_centavos ELSE -amount_centavos END),0),
    COALESCE(sum(amount_centavos) FILTER(WHERE side='debit'),0)
    INTO line_count,balance,total FROM accounting.journal_lines WHERE organization_id=org AND journal_id=journal;
  IF line_count<2 OR line_count>100 OR balance<>0 OR total NOT BETWEEN 1 AND 9007199254740991 THEN
    RAISE EXCEPTION 'A journal requires balanced nonzero safe-centavo lines' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER balanced_journal AFTER INSERT ON accounting.journals DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting.check_journal_balance();
CREATE CONSTRAINT TRIGGER balanced_lines AFTER INSERT ON accounting.journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION accounting.check_journal_balance();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['accounts','posting_rules','rule_accounts','periods','journals','journal_lines'] LOOP
    EXECUTE format('ALTER TABLE accounting.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE accounting.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY staff_organization ON accounting.%I USING (organization_id=platform.current_organization() AND platform.current_member() IS NULL) WITH CHECK (organization_id=platform.current_organization() AND platform.current_member() IS NULL)',t);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA accounting TO agap_runtime;
-- Financial writes go only through the bounded posting function in 002.
GRANT SELECT ON ALL TABLES IN SCHEMA accounting TO agap_runtime;

CREATE FUNCTION accounting.assert_posting_actor() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid;
BEGIN
  SELECT u.id INTO actor FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid
    AND u.organization_id=platform.current_organization() AND u.active
    AND u.roles && ARRAY['cashier','financial_authorizer','accountant']::text[]
    AND platform.current_member() IS NULL FOR SHARE;
  IF actor IS NULL THEN RAISE EXCEPTION 'Accounting posting is forbidden' USING ERRCODE='AG403'; END IF;
  RETURN actor;
END $$;
CREATE FUNCTION accounting.lock_period(day date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE period_id uuid; period_state text;
BEGIN
  PERFORM accounting.assert_posting_actor();
  SELECT id,state INTO period_id,period_state FROM accounting.periods WHERE organization_id=platform.current_organization()
    AND day BETWEEN starts_on AND ends_on FOR SHARE;
  IF period_id IS NULL OR period_state<>'open' THEN
    RAISE EXCEPTION 'The posting date needs an open accounting period' USING ERRCODE='AG409';
  END IF;
  RETURN period_id;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA accounting FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounting.lock_period(date) TO agap_runtime;
