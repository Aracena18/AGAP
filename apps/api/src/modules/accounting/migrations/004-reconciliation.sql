-- Reporting reads preserve financial history. No payment/provider operation is enabled.
CREATE FUNCTION accounting.can_reconcile() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT platform.current_member() IS NULL AND EXISTS (
    SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid
      AND u.organization_id=platform.current_organization() AND u.active AND 'auditor'=ANY(u.roles)
  ) AND NOT EXISTS(SELECT 1 FROM platform.branches b WHERE b.organization_id=platform.current_organization() AND NOT platform.allowed_branch(b.id))
$$;
REVOKE ALL ON FUNCTION accounting.can_reconcile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounting.can_reconcile() TO agap_runtime;

CREATE TABLE accounting.reconciliation_mappings (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id),
  posting_rule_version_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('disbursement','repayment')),
  currency text NOT NULL CHECK(currency='PHP'), effective_from date NOT NULL, effective_through date NOT NULL,
  cash_account_id uuid NOT NULL, principal_account_id uuid NOT NULL,
  review_reference text NOT NULL CHECK(length(btrim(review_reference)) BETWEEN 1 AND 2000),
  UNIQUE(organization_id,id), UNIQUE(organization_id,posting_rule_version_id),
  FOREIGN KEY(organization_id,posting_rule_version_id) REFERENCES accounting.posting_rules(organization_id,id),
  FOREIGN KEY(organization_id,cash_account_id) REFERENCES accounting.accounts(organization_id,id),
  FOREIGN KEY(organization_id,principal_account_id) REFERENCES accounting.accounts(organization_id,id),
  CHECK(effective_from<=effective_through AND cash_account_id<>principal_account_id)
);
CREATE TABLE accounting.reconciliation_runs (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), created_by uuid NOT NULL,
  created_at timestamptz NOT NULL, from_date date NOT NULL, through_date date NOT NULL,
  status text NOT NULL CHECK(status IN ('matched','discrepancy','pending','unavailable','empty')),
  body jsonb NOT NULL CHECK(jsonb_typeof(body)='object'),
  UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,created_by) REFERENCES identity.staff_users(organization_id,id),
  CHECK(through_date>=from_date AND through_date-from_date<31)
);
CREATE INDEX reconciliation_runs_page ON accounting.reconciliation_runs(organization_id,created_at DESC,id DESC);
CREATE FUNCTION accounting.immutable_reconciliation() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Reconciliation evidence is append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER immutable_reconciliation_run BEFORE UPDATE OR DELETE ON accounting.reconciliation_runs FOR EACH ROW EXECUTE FUNCTION accounting.immutable_reconciliation();
CREATE TRIGGER immutable_reconciliation_mapping BEFORE UPDATE OR DELETE ON accounting.reconciliation_mappings FOR EACH ROW EXECUTE FUNCTION accounting.immutable_reconciliation();
ALTER TABLE accounting.reconciliation_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.reconciliation_mappings FORCE ROW LEVEL SECURITY;
ALTER TABLE accounting.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.reconciliation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY auditor_report_mapping ON accounting.reconciliation_mappings USING(organization_id=platform.current_organization() AND accounting.can_reconcile());
CREATE POLICY auditor_report_run ON accounting.reconciliation_runs USING(organization_id=platform.current_organization() AND accounting.can_reconcile());
GRANT SELECT ON accounting.reconciliation_mappings,accounting.reconciliation_runs TO agap_runtime;

CREATE FUNCTION accounting.save_reconciliation(data jsonb, correlation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE org uuid:=platform.current_organization(); actor uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid;
  recorded timestamptz:=clock_timestamp(); saved jsonb; run_id uuid; audit_id uuid:=gen_random_uuid();
BEGIN
  IF NOT accounting.can_reconcile() THEN RAISE EXCEPTION 'Full organization auditor scope required' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(data) IS DISTINCT FROM 'object'
    OR data-ARRAY['id','organizationId','createdBy','createdAt','checkerVersion','evidenceSha256','mappingVersionIds','report']<>'{}'::jsonb
    OR NOT (data ?& ARRAY['id','organizationId','createdBy','createdAt','checkerVersion','evidenceSha256','mappingVersionIds','report'])
    OR data->>'organizationId' IS DISTINCT FROM org::text OR data->>'createdBy' IS DISTINCT FROM actor::text
    OR data#>>'{report,scope,organizationId}' IS DISTINCT FROM org::text
    OR data->>'checkerVersion' IS DISTINCT FROM 'principal-reconciliation-v1'
    OR COALESCE(data->>'evidenceSha256','') !~ '^[a-f0-9]{64}$'
    OR jsonb_typeof(data->'mappingVersionIds') IS DISTINCT FROM 'array'
    OR jsonb_typeof(data#>'{report,events}') IS DISTINCT FROM 'array'
    OR jsonb_array_length(data#>'{report,events}')>5000
    OR correlation IS NULL OR length(correlation) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid reconciliation evidence' USING ERRCODE='23514';
  END IF;
  run_id:=(data->>'id')::uuid;
  saved:=jsonb_set(data,'{createdAt}',to_jsonb(recorded));
  INSERT INTO accounting.reconciliation_runs(id,organization_id,created_by,created_at,from_date,through_date,status,body)
    VALUES(run_id,org,actor,recorded,(data#>>'{report,scope,fromDate}')::date,(data#>>'{report,scope,throughDate}')::date,data#>>'{report,status}',saved);
  INSERT INTO platform.audit_events(id,organization_id,user_id,event_type,aggregate_id,aggregate_version,correlation_id)
    VALUES(audit_id,org,actor,'accounting.reconciliation_recorded',run_id,1,correlation);
  INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(audit_id,org,'accounting.reconciliation_recorded',
    jsonb_build_object('id',audit_id,'type','accounting.reconciliation_recorded','schemaVersion',1,'organizationId',org,
      'aggregateId',run_id,'aggregateVersion',1,'occurredAt',recorded,'correlationId',correlation,'payload','{}'::jsonb));
  RETURN saved;
END $$;
REVOKE ALL ON FUNCTION accounting.save_reconciliation(jsonb,text),accounting.immutable_reconciliation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounting.save_reconciliation(jsonb,text) TO agap_runtime;
