CREATE TABLE accounting.trial_balance_runs (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES platform.organizations(id),created_by uuid NOT NULL,
 created_at timestamptz NOT NULL,from_date date NOT NULL,through_date date NOT NULL,body jsonb NOT NULL,
 UNIQUE(organization_id,id),FOREIGN KEY(organization_id,created_by) REFERENCES identity.staff_users(organization_id,id),
 CHECK(through_date>=from_date AND through_date-from_date<366)
);
CREATE INDEX trial_balance_history ON accounting.trial_balance_runs(organization_id,created_at DESC,id DESC);
ALTER TABLE accounting.trial_balance_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting.trial_balance_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY trial_balance_scope ON accounting.trial_balance_runs USING(organization_id=platform.current_organization() AND accounting.can_reconcile());
GRANT SELECT ON accounting.trial_balance_runs TO agap_runtime;
CREATE TRIGGER immutable_trial_balance BEFORE UPDATE OR DELETE ON accounting.trial_balance_runs FOR EACH ROW EXECUTE FUNCTION accounting.immutable_reconciliation();
CREATE FUNCTION accounting.save_trial_balance(data jsonb,correlation text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE org uuid:=platform.current_organization();actor uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid;
 recorded timestamptz:=clock_timestamp();saved jsonb;run_id uuid;audit_id uuid:=gen_random_uuid();
BEGIN
 IF NOT accounting.can_reconcile() THEN RAISE EXCEPTION 'Complete auditor scope required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(data) IS DISTINCT FROM 'object'
  OR data-ARRAY['id','organizationId','createdBy','createdAt','engineVersion','evidenceSha256','fromDate','throughDate','cutoffAt','databaseSnapshot','currency','status','issues','accounts','totals','balanced','sourceJournalCount','sourceLineCount','postedThrough']<>'{}'::jsonb
  OR NOT(data ?& ARRAY['id','organizationId','createdBy','createdAt','engineVersion','evidenceSha256','fromDate','throughDate','cutoffAt','databaseSnapshot','currency','status','issues','accounts','totals','balanced','sourceJournalCount','sourceLineCount','postedThrough'])
  OR data->>'organizationId' IS DISTINCT FROM org::text OR data->>'createdBy' IS DISTINCT FROM actor::text
  OR data->>'engineVersion' IS DISTINCT FROM 'trial-balance-v1' OR data->>'currency' IS DISTINCT FROM 'PHP'
  OR COALESCE(data->>'evidenceSha256','') !~ '^[a-f0-9]{64}$' OR COALESCE(data->>'status','') NOT IN ('available','empty','unavailable')
  OR jsonb_typeof(data->'accounts') IS DISTINCT FROM 'array' OR jsonb_array_length(data->'accounts')>5000
  OR jsonb_typeof(data->'issues') IS DISTINCT FROM 'array' OR correlation IS NULL OR length(correlation) NOT BETWEEN 1 AND 200
 THEN RAISE EXCEPTION 'Invalid trial balance evidence' USING ERRCODE='23514'; END IF;
 run_id:=(data->>'id')::uuid;saved:=jsonb_set(data,'{createdAt}',to_jsonb(recorded));
 INSERT INTO accounting.trial_balance_runs(id,organization_id,created_by,created_at,from_date,through_date,body)
 VALUES(run_id,org,actor,recorded,(data->>'fromDate')::date,(data->>'throughDate')::date,saved);
 INSERT INTO platform.audit_events(id,organization_id,user_id,event_type,aggregate_id,aggregate_version,correlation_id)
 VALUES(audit_id,org,actor,'accounting.trial_balance_recorded',run_id,1,correlation);
 INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(audit_id,org,'accounting.trial_balance_recorded',jsonb_build_object('id',audit_id,'type','accounting.trial_balance_recorded','schemaVersion',1,'organizationId',org,'aggregateId',run_id,'aggregateVersion',1,'occurredAt',recorded,'correlationId',correlation,'payload','{}'::jsonb));
 RETURN saved;
END $$;
REVOKE ALL ON FUNCTION accounting.save_trial_balance(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounting.save_trial_balance(jsonb,text) TO agap_runtime;
