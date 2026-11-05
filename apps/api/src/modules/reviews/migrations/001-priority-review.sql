CREATE SCHEMA reviews;
REVOKE ALL ON SCHEMA reviews FROM PUBLIC;
GRANT USAGE ON SCHEMA reviews TO agap_runtime;
CREATE FUNCTION reviews.can_guard(app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization() AND
 ((platform.current_member()=a.member_id AND EXISTS(SELECT 1 FROM identity.member_links l WHERE l.id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid AND l.member_id=a.member_id AND l.organization_id=a.organization_id AND l.active)) OR
 (platform.current_member() IS NULL AND platform.allowed_branch(a.branch_id) AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=a.organization_id AND u.active AND u.roles && ARRAY['officer','reviewer','auditor','cashier','financial_authorizer']::text[]))))
$$;
CREATE FUNCTION reviews.can_read(app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT platform.current_member() IS NULL AND reviews.can_guard(app) AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.active AND u.roles && ARRAY['officer','reviewer','auditor']::text[])
$$;
REVOKE ALL ON FUNCTION reviews.can_guard(uuid),reviews.can_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reviews.can_guard(uuid),reviews.can_read(uuid) TO agap_runtime;
CREATE TABLE reviews.events(id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,version bigint NOT NULL CHECK(version>1),kind text NOT NULL,body jsonb NOT NULL,actor_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,application_id,version),FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id));
CREATE TABLE reviews.requests(id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,body jsonb NOT NULL,basis_hash text NOT NULL,origin text NOT NULL CHECK(origin IN ('model','simulated')),provenance jsonb NOT NULL,state text NOT NULL CHECK(state IN ('running','completed','failed')),lease_token uuid NOT NULL,lease_until timestamptz NOT NULL,result jsonb,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id));
CREATE TABLE reviews.notices(id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,escalation_id uuid NOT NULL,recipient_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,escalation_id,recipient_id),FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id));
CREATE TABLE reviews.acknowledgments(notice_id uuid PRIMARY KEY REFERENCES reviews.notices(id),organization_id uuid NOT NULL,recipient_id uuid NOT NULL,acknowledged_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE reviews.queue_snapshots(id uuid PRIMARY KEY,organization_id uuid NOT NULL,actor_id uuid NOT NULL,scope_hash text NOT NULL,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['events','requests','notices'] LOOP
 EXECUTE format('ALTER TABLE reviews.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('ALTER TABLE reviews.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY scoped ON reviews.%I USING(organization_id=platform.current_organization() AND reviews.can_read(application_id)) WITH CHECK(organization_id=platform.current_organization() AND reviews.can_read(application_id))',t);
END LOOP; END $$;
ALTER TABLE reviews.acknowledgments ENABLE ROW LEVEL SECURITY; ALTER TABLE reviews.acknowledgments FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON reviews.acknowledgments USING(organization_id=platform.current_organization() AND recipient_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND EXISTS(SELECT 1 FROM reviews.notices n WHERE n.id=notice_id AND n.recipient_id=recipient_id)) WITH CHECK(organization_id=platform.current_organization() AND recipient_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND EXISTS(SELECT 1 FROM reviews.notices n WHERE n.id=notice_id AND n.recipient_id=recipient_id));
ALTER TABLE reviews.queue_snapshots ENABLE ROW LEVEL SECURITY; ALTER TABLE reviews.queue_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON reviews.queue_snapshots USING(organization_id=platform.current_organization() AND actor_id=NULLIF(current_setting('agap.user_id',true),'')::uuid) WITH CHECK(organization_id=platform.current_organization() AND actor_id=NULLIF(current_setting('agap.user_id',true),'')::uuid);
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['events','notices','acknowledgments','queue_snapshots'] LOOP EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON reviews.%I FOR EACH ROW EXECUTE FUNCTION evidence.immutable()',t); END LOOP; END $$;
GRANT INSERT ON reviews.events,reviews.requests TO agap_runtime;
GRANT SELECT,INSERT ON reviews.notices,reviews.acknowledgments,reviews.queue_snapshots TO agap_runtime;
DROP POLICY scoped ON reviews.events;
CREATE POLICY scoped ON reviews.events USING(organization_id=platform.current_organization() AND reviews.can_guard(application_id)) WITH CHECK(organization_id=platform.current_organization() AND reviews.can_read(application_id));
DROP POLICY scoped ON reviews.requests;
CREATE POLICY scoped ON reviews.requests USING(organization_id=platform.current_organization() AND reviews.can_guard(application_id)) WITH CHECK(organization_id=platform.current_organization() AND reviews.can_read(application_id));
CREATE VIEW reviews.staff_events WITH(security_barrier=true) AS SELECT * FROM reviews.events WHERE reviews.can_read(application_id);
CREATE VIEW reviews.staff_requests WITH(security_barrier=true) AS SELECT * FROM reviews.requests WHERE reviews.can_read(application_id);
GRANT SELECT ON reviews.staff_events,reviews.staff_requests TO agap_runtime;
GRANT SELECT(id,application_id,state,lease_token,lease_until) ON reviews.requests TO agap_runtime;
GRANT UPDATE(state,lease_token,lease_until,result) ON reviews.requests TO agap_runtime;
CREATE INDEX review_event_order ON reviews.events(organization_id,application_id,version);
CREATE INDEX review_recipient ON reviews.notices(organization_id,recipient_id,created_at,id);
-- This bounded guard projection contains no document text, check reasons or staff notes.
CREATE FUNCTION reviews.guard_events(app uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT CASE WHEN reviews.can_guard(app) THEN COALESCE(jsonb_agg(jsonb_build_object('kind',kind,'body',CASE WHEN kind='concern' THEN jsonb_build_object('id',body->'id','basisHash',body->'basisHash','state',body->'state','material',body->'material') WHEN kind='check' THEN jsonb_build_object('concernId',body->'concernId','basisHash',body->'basisHash','state',body->'state','material',body->'material') WHEN kind='escalation' THEN jsonb_build_object('id',body->'id','concernIds',body->'concernIds','reviewerId',body->'reviewerId','basisHash',body->'basisHash','state',body->'state') WHEN kind='disposition' THEN jsonb_build_object('escalationId',body->'escalationId','basisHash',body->'basisHash','state',body->'state') ELSE '{}'::jsonb END) ORDER BY version),'[]'::jsonb) ELSE NULL END FROM reviews.events WHERE application_id=app AND organization_id=platform.current_organization()
$$;
CREATE FUNCTION reviews.material_context(app uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications; assessment jsonb; policy jsonb; sources jsonb; missing boolean;
BEGIN
 IF NOT reviews.can_guard(app) THEN RETURN NULL; END IF;
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization();
 SELECT jsonb_build_object('id',id,'status',body->'status','effectiveFrom',body->'effectiveFrom','effectiveThrough',body->'effectiveThrough','hash',encode(sha256(convert_to(body::text,'UTF8')),'hex')) INTO policy FROM credit.policies WHERE organization_id=a.organization_id ORDER BY published_at DESC,id LIMIT 1;
 SELECT jsonb_build_object('id',id,'inputVersion',body->'inputVersion','policyVersionId',body->'policyVersionId','status',body->'status','periodStart',body->'periodStart','periodEnd',body->'periodEnd','hash',encode(sha256(convert_to(body::text,'UTF8')),'hex'),'scenarios',COALESCE((SELECT jsonb_agg(jsonb_build_object('offerId',s->'offerId','checks',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c->'id','passed',c->'passed')) FROM jsonb_array_elements(s->'checks') c),'[]'::jsonb))) FROM jsonb_array_elements(body->'scenarios') s),'[]'::jsonb)) INTO assessment FROM credit.assessments WHERE application_id=app AND organization_id=a.organization_id ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'textVersionId',p.text_version_id,'state',CASE WHEN r.source_id IS NOT NULL THEN 'blocked' WHEN s.kind='statement' THEN 'cleared' ELSE p.state END,'verification',COALESCE((SELECT v.body->>'outcome' FROM evidence.verifications v WHERE v.source_id=s.id ORDER BY v.recorded_at DESC,v.id DESC LIMIT 1),'not_checked')) ORDER BY s.id),'[]'::jsonb) INTO sources FROM evidence.sources s LEFT JOIN evidence.processing p ON p.source_id=s.id LEFT JOIN evidence.retirements r ON r.source_id=s.id WHERE s.application_id=app;
 SELECT EXISTS(SELECT 1 FROM (SELECT DISTINCT ON(id) body,source_id FROM evidence.facts WHERE application_id=app ORDER BY id,revision DESC) f WHERE f.body->'input'->>'relevance'='included' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(sources) s WHERE s->>'id'=f.source_id::text AND s->>'state'='cleared')) INTO missing;
 RETURN jsonb_build_object('applicationId',a.id,'status',a.status,'assignedOfficerId',a.assigned_officer_id,'applicationVersion',a.version,'inputVersion',a.assessment_input_version,'sources',sources,'policy',policy,'assessment',assessment,'unclearedFacts',missing,'pendingRequests',(SELECT count(*) FROM reviews.requests WHERE application_id=app AND state='running'));
END $$;
REVOKE ALL ON FUNCTION reviews.guard_events(uuid),reviews.material_context(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reviews.guard_events(uuid),reviews.material_context(uuid) TO agap_runtime;
