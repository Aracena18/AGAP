CREATE TABLE monitoring.corrections (
 organization_id uuid NOT NULL,prior_id uuid PRIMARY KEY,next_id uuid NOT NULL UNIQUE,reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 2000),
 FOREIGN KEY(organization_id,prior_id) REFERENCES monitoring.requests(organization_id,id),
 FOREIGN KEY(organization_id,next_id) REFERENCES monitoring.requests(organization_id,id),CHECK(prior_id<>next_id)
);
ALTER TABLE monitoring.corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring.corrections FORCE ROW LEVEL SECURITY;
CREATE POLICY own_correction ON monitoring.corrections USING(organization_id=platform.current_organization() AND platform.current_member() IS NOT NULL AND EXISTS(SELECT 1 FROM monitoring.requests r WHERE r.id=prior_id AND r.member_id=platform.current_member()));
CREATE TRIGGER immutable_correction BEFORE UPDATE OR DELETE ON monitoring.corrections FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence();
CREATE FUNCTION monitoring.correct_support(prior uuid,data jsonb,captured_position jsonb,correlation text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE original monitoring.requests;successor uuid;event uuid:=gen_random_uuid();
BEGIN
 SELECT * INTO original FROM monitoring.requests WHERE id=prior AND organization_id=platform.current_organization() AND member_id=platform.current_member() FOR UPDATE;
 IF original.id IS NULL THEN RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002'; END IF;
 IF EXISTS(SELECT 1 FROM monitoring.corrections WHERE prior_id=prior) THEN RAISE EXCEPTION 'Correct the latest submission' USING ERRCODE='PC409'; END IF;
 IF jsonb_typeof(data->'reason') IS DISTINCT FROM 'string' OR length(btrim(data->>'reason')) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Correction reason required' USING ERRCODE='23514'; END IF;
 successor:=monitoring.submit_support(data-'reason',captured_position,correlation);
 INSERT INTO monitoring.corrections(organization_id,prior_id,next_id,reason) VALUES(original.organization_id,prior,successor,data->>'reason');
 INSERT INTO portal.events(id,organization_id,member_id,link_id,event_type,aggregate_id,aggregate_version,correlation_id)
 VALUES(event,original.organization_id,original.member_id,NULLIF(current_setting('agap.member_link_id',true),'')::uuid,'support.corrected',successor,1,correlation);
 INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(event,original.organization_id,'support.corrected',jsonb_build_object('id',event,'type','support.corrected','schemaVersion',1,'organizationId',original.organization_id,'aggregateId',successor,'aggregateVersion',1,'occurredAt',clock_timestamp(),'correlationId',correlation,'payload','{}'::jsonb));
 RETURN successor;
END $$;
CREATE FUNCTION monitoring.correction_link(request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF platform.current_member() IS NULL OR NOT EXISTS(SELECT 1 FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization() AND member_id=platform.current_member()) THEN RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002'; END IF;
 RETURN jsonb_build_object('requestId',request,'replacesId',(SELECT prior_id FROM monitoring.corrections WHERE next_id=request),'replacedById',(SELECT next_id FROM monitoring.corrections WHERE prior_id=request));
END $$;
-- Lock only visible current assignments before reading any private answers.
CREATE FUNCTION monitoring.summary_inputs(starts date,ends date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE ids uuid[];
BEGIN
 IF platform.current_member() IS NOT NULL OR NOT EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=platform.current_organization() AND u.active AND 'officer'=ANY(u.roles)) THEN RAISE EXCEPTION 'Officer required' USING ERRCODE='42501'; END IF;
 IF starts IS NULL OR ends IS NULL OR ends<starts OR ends-starts>=366 THEN RAISE EXCEPTION 'Invalid dates' USING ERRCODE='23514'; END IF;
 SELECT array_agg(id) INTO ids FROM (SELECT r.id FROM monitoring.requests r WHERE r.organization_id=platform.current_organization() AND r.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND monitoring.staff_role('officer',r.branch_id) AND (r.submitted_at AT TIME ZONE 'Asia/Manila')::date BETWEEN starts AND ends ORDER BY r.id LIMIT 1001 FOR SHARE) locked;
 IF cardinality(ids)>1000 THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM unnest(ids) id WHERE NOT EXISTS(SELECT 1 FROM monitoring.disclosures d WHERE d.request_id=id)) THEN RAISE EXCEPTION 'Incomplete support records' USING ERRCODE='P0503'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(d.check_in ORDER BY d.request_id) FROM monitoring.disclosures d WHERE d.request_id=ANY(ids)),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION monitoring.correct_support(uuid,jsonb,jsonb,text),monitoring.correction_link(uuid),monitoring.summary_inputs(date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.correct_support(uuid,jsonb,jsonb,text),monitoring.correction_link(uuid),monitoring.summary_inputs(date,date) TO agap_runtime;
