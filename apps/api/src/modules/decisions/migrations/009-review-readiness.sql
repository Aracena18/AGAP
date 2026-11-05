-- Additive staff-review history. Integrated decision/document bytes stay intact.
CREATE TABLE decisions.review_streams (
 organization_id uuid NOT NULL,application_id uuid NOT NULL,branch_id uuid NOT NULL,member_id uuid NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 PRIMARY KEY(organization_id,application_id),UNIQUE(organization_id,application_id,branch_id,member_id),
 FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
 FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE TABLE decisions.review_events (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,branch_id uuid NOT NULL,member_id uuid NOT NULL,
 review_version bigint NOT NULL CHECK(review_version BETWEEN 2 AND 9007199254740991),actor_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('confirm_current','raise_concern','check_concern','assign_review','review_disposition','reassign_preparation')),
 evidence_basis_hash text,payload_text text NOT NULL CHECK(octet_length(payload_text) BETWEEN 2 AND 16384),
 payload jsonb GENERATED ALWAYS AS(payload_text::jsonb) STORED,
 payload_sha256 text NOT NULL CHECK(payload_sha256=encode(sha256(convert_to(payload_text,'UTF8')),'hex')),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(organization_id,application_id,review_version),UNIQUE(organization_id,application_id,id),
 FOREIGN KEY(organization_id,application_id,branch_id,member_id) REFERENCES decisions.review_streams(organization_id,application_id,branch_id,member_id),
 FOREIGN KEY(organization_id,actor_id) REFERENCES identity.staff_users(organization_id,id),
 CHECK((jsonb_typeof(payload)='object' AND payload->>'kind'=kind) IS TRUE),
 CHECK(((kind='reassign_preparation' AND evidence_basis_hash IS NULL) OR
   (kind<>'reassign_preparation' AND evidence_basis_hash ~ '^[a-f0-9]{64}$' AND payload#>>'{data,evidenceBasisHash}'=evidence_basis_hash)) IS TRUE)
);
CREATE TRIGGER immutable_review_event BEFORE UPDATE OR DELETE ON decisions.review_events FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record();
CREATE TABLE decisions.review_notices (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,branch_id uuid NOT NULL,
 concern_id uuid NOT NULL,assignment_id uuid NOT NULL,recipient_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(organization_id,assignment_id),UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,application_id,assignment_id) REFERENCES decisions.review_events(organization_id,application_id,id),
 FOREIGN KEY(organization_id,application_id,concern_id) REFERENCES decisions.review_events(organization_id,application_id,id),
 FOREIGN KEY(organization_id,recipient_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE decisions.review_notice_acknowledgments (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,notice_id uuid NOT NULL,
 recipient_id uuid NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(organization_id,notice_id,recipient_id),
 FOREIGN KEY(organization_id,notice_id) REFERENCES decisions.review_notices(organization_id,id),
 FOREIGN KEY(organization_id,recipient_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TRIGGER immutable_review_notice BEFORE UPDATE OR DELETE ON decisions.review_notices FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record();
CREATE TRIGGER immutable_notice_acknowledgment BEFORE UPDATE OR DELETE ON decisions.review_notice_acknowledgments FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['review_streams','review_events','review_notices'] LOOP
   EXECUTE format('ALTER TABLE decisions.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('ALTER TABLE decisions.%I FORCE ROW LEVEL SECURITY',t);
   EXECUTE format('CREATE POLICY staff_scope ON decisions.%I USING(organization_id=platform.current_organization()
     AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) WITH CHECK(organization_id=platform.current_organization()
     AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id))',t);
 END LOOP;
END $$;
CREATE POLICY member_guard_scope ON decisions.review_streams FOR SELECT USING(
 organization_id=platform.current_organization() AND member_id=platform.current_member());
CREATE POLICY member_guard_scope ON decisions.review_events FOR SELECT USING(
 organization_id=platform.current_organization() AND member_id=platform.current_member());
ALTER TABLE decisions.review_notice_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions.review_notice_acknowledgments FORCE ROW LEVEL SECURITY;
CREATE POLICY recipient_scope ON decisions.review_notice_acknowledgments USING(organization_id=platform.current_organization()
 AND platform.current_member() IS NULL AND recipient_id=NULLIF(current_setting('agap.user_id',true),'')::uuid);
CREATE VIEW decisions.staff_review_streams WITH(security_barrier=true) AS SELECT * FROM decisions.review_streams
 WHERE organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
 AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'));
CREATE VIEW decisions.staff_review_events WITH(security_barrier=true) AS SELECT * FROM decisions.review_events
 WHERE organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
 AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'));
CREATE VIEW decisions.own_review_notices WITH(security_barrier=true) AS SELECT n.*,
 (SELECT a.recorded_at FROM decisions.review_notice_acknowledgments a WHERE a.organization_id=n.organization_id AND a.notice_id=n.id AND a.recipient_id=n.recipient_id) AS acknowledged_at
 FROM decisions.review_notices n WHERE n.organization_id=platform.current_organization() AND platform.current_member() IS NULL
 AND platform.allowed_branch(n.branch_id) AND n.recipient_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND decisions.staff_role('reviewer');
GRANT SELECT ON decisions.staff_review_streams,decisions.staff_review_events,decisions.own_review_notices TO agap_runtime;
CREATE INDEX review_notice_recipient ON decisions.review_notices(organization_id,recipient_id,created_at DESC,id DESC);

-- A restriction is not self-clearable, including after an input revision.
CREATE FUNCTION decisions.prevent_self_clearance() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('agap:connected-lending:'||NEW.organization_id::text,0));
 IF NEW.status='clear' AND EXISTS(SELECT 1 FROM decisions.conflict_declarations d WHERE d.organization_id=NEW.organization_id
   AND d.application_id=NEW.application_id AND d.user_id=NEW.user_id AND d.status='restricted') THEN
   RAISE EXCEPTION 'A recorded restriction requires another eligible participant or an approved independent resolution' USING ERRCODE='AG409';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER prevent_self_clearance BEFORE INSERT ON decisions.conflict_declarations FOR EACH ROW EXECUTE FUNCTION decisions.prevent_self_clearance();
REVOKE ALL ON FUNCTION decisions.prevent_self_clearance() FROM PUBLIC;

CREATE FUNCTION decisions.record_conflict_declaration(app uuid,expected bigint,status text,reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications%ROWTYPE; uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid; event uuid:=gen_random_uuid();
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('agap:connected-lending:'||platform.current_organization()::text,0));
 SELECT * INTO a FROM applications.applications WHERE organization_id=platform.current_organization() AND id=app AND platform.allowed_branch(branch_id) FOR UPDATE;
 IF a.id IS NULL OR platform.current_member() IS NOT NULL OR NOT(decisions.staff_role('officer') OR decisions.staff_role('reviewer')) THEN
   RAISE EXCEPTION 'Scoped decision actor required' USING ERRCODE='AG403'; END IF;
 IF expected<>a.version THEN RAISE EXCEPTION 'Application changed' USING ERRCODE='AG412'; END IF;
 IF status NOT IN ('clear','restricted') OR length(btrim(reference)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Declaration required' USING ERRCODE='AG409'; END IF;
 INSERT INTO decisions.conflict_declarations(id,organization_id,application_id,branch_id,user_id,input_version,status,reference)
   VALUES(event,a.organization_id,app,a.branch_id,uid,a.assessment_input_version,status,reference);
 UPDATE applications.applications SET version=version+1,updated_at=clock_timestamp() WHERE organization_id=a.organization_id AND id=app RETURNING * INTO a;
 INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by)
   VALUES(gen_random_uuid(),a.organization_id,app,a.version,to_jsonb(a),uid);
 RETURN jsonb_build_object('id',event,'version',a.version);
END $$;
REVOKE ALL ON FUNCTION decisions.record_conflict_declaration(uuid,bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.record_conflict_declaration(uuid,bigint,text,text) TO agap_runtime;

CREATE FUNCTION decisions.record_review_event(app uuid,expected bigint,event uuid,body text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications%ROWTYPE; s decisions.review_streams%ROWTYPE; uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid;
 p jsonb:=body::jsonb; k text:=p->>'kind'; basis text:=p#>>'{data,evidenceBasisHash}'; target uuid; concern uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('agap:connected-lending:'||platform.current_organization()::text,0));
 SELECT * INTO a FROM applications.applications WHERE organization_id=platform.current_organization() AND id=app AND platform.allowed_branch(branch_id) FOR UPDATE;
 IF a.id IS NULL OR platform.current_member() IS NOT NULL THEN RAISE EXCEPTION 'Staff review access required' USING ERRCODE='AG403'; END IF;
 IF expected<>a.version THEN RAISE EXCEPTION 'Application changed' USING ERRCODE='AG412'; END IF;
 IF k='reassign_preparation' THEN
   target:=(p#>>'{data,officerId}')::uuid;
   IF NOT decisions.staff_role('administrator') OR a.status NOT IN ('assessment_ready','recommended') OR target IS NOT DISTINCT FROM a.assigned_officer_id
     OR NOT identity.assignable_officer(a.organization_id,target,a.branch_id)
     OR EXISTS(SELECT 1 FROM decisions.conflict_declarations d WHERE d.organization_id=a.organization_id AND d.application_id=app AND d.user_id=target AND d.status='restricted') THEN
     RAISE EXCEPTION 'Eligible separate preparation reassignment required' USING ERRCODE='AG403'; END IF;
   basis:=NULL;
 ELSIF k IN ('confirm_current','raise_concern','check_concern','assign_review') THEN
   IF NOT decisions.staff_role('officer') OR uid IS DISTINCT FROM a.assigned_officer_id THEN
     RAISE EXCEPTION 'Current assigned officer required' USING ERRCODE='AG403'; END IF;
 ELSIF k='review_disposition' THEN
   IF NOT decisions.staff_role('reviewer') OR uid IS NOT DISTINCT FROM a.assigned_officer_id THEN
     RAISE EXCEPTION 'Separate reviewer required' USING ERRCODE='AG403'; END IF;
 ELSE RAISE EXCEPTION 'Unsupported review event' USING ERRCODE='AG409'; END IF;
 IF k IN ('check_concern','assign_review','review_disposition') THEN
   concern:=(p->>'concernId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM decisions.review_events e WHERE e.organization_id=a.organization_id AND e.application_id=app AND e.id=concern AND e.kind='raise_concern') THEN
     RAISE EXCEPTION 'Current source concern required' USING ERRCODE='AG409'; END IF;
 END IF;
 IF k='review_disposition' AND NOT EXISTS(SELECT 1 FROM decisions.review_events e WHERE e.organization_id=a.organization_id AND e.application_id=app
   AND e.id=(p#>>'{data,assignmentId}')::uuid AND e.kind='assign_review' AND e.payload->>'concernId'=p->>'concernId'
   AND (e.payload#>>'{data,reviewerId}')::uuid=uid AND e.evidence_basis_hash=basis) THEN
   RAISE EXCEPTION 'Exact assigned reviewer required' USING ERRCODE='AG403'; END IF;
 INSERT INTO decisions.review_streams(organization_id,application_id,branch_id,member_id) VALUES(a.organization_id,app,a.branch_id,a.member_id) ON CONFLICT DO NOTHING;
 UPDATE decisions.review_streams SET version=version+1 WHERE organization_id=a.organization_id AND application_id=app RETURNING * INTO s;
 INSERT INTO decisions.review_events(id,organization_id,application_id,branch_id,member_id,review_version,actor_id,kind,evidence_basis_hash,payload_text,payload_sha256)
   VALUES(event,a.organization_id,app,a.branch_id,a.member_id,s.version,uid,k,basis,body,encode(sha256(convert_to(body,'UTF8')),'hex'));
 IF k='assign_review' THEN
   target:=(p#>>'{data,reviewerId}')::uuid;
   IF target=uid OR NOT EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.organization_id=a.organization_id AND u.id=target AND u.active AND a.branch_id=ANY(u.branch_ids) AND 'reviewer'=ANY(u.roles)) THEN
     RAISE EXCEPTION 'Active separate reviewer required' USING ERRCODE='AG403'; END IF;
   INSERT INTO decisions.review_notices(id,organization_id,application_id,branch_id,concern_id,assignment_id,recipient_id)
     VALUES(gen_random_uuid(),a.organization_id,app,a.branch_id,concern,event,target);
 END IF;
 UPDATE applications.applications SET version=version+1,assigned_officer_id=CASE WHEN k='reassign_preparation' THEN target ELSE assigned_officer_id END,
   updated_at=clock_timestamp() WHERE organization_id=a.organization_id AND id=app RETURNING * INTO a;
 INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by)
   VALUES(gen_random_uuid(),a.organization_id,app,a.version,to_jsonb(a),uid);
 RETURN jsonb_build_object('id',event,'version',a.version);
END $$;
REVOKE ALL ON FUNCTION decisions.record_review_event(uuid,bigint,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.record_review_event(uuid,bigint,uuid,text) TO agap_runtime;

CREATE FUNCTION decisions.acknowledge_review_notice(notice uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE n decisions.review_notices%ROWTYPE; result uuid; uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid;
BEGIN
 SELECT * INTO n FROM decisions.review_notices WHERE organization_id=platform.current_organization() AND id=notice
   AND platform.current_member() IS NULL AND recipient_id=uid AND platform.allowed_branch(branch_id) AND decisions.staff_role('reviewer');
 IF n.id IS NULL THEN RAISE EXCEPTION 'Own notice required' USING ERRCODE='AG403'; END IF;
 INSERT INTO decisions.review_notice_acknowledgments(id,organization_id,notice_id,recipient_id) VALUES(gen_random_uuid(),n.organization_id,n.id,uid)
   ON CONFLICT(organization_id,notice_id,recipient_id) DO NOTHING RETURNING id INTO result;
 IF result IS NULL THEN SELECT id INTO result FROM decisions.review_notice_acknowledgments WHERE organization_id=n.organization_id AND notice_id=n.id AND recipient_id=uid; END IF;
 -- Acknowledgment does not advance the application/review stream or resolve a concern.
 RETURN jsonb_build_object('id',result,'version',1);
END $$;
REVOKE ALL ON FUNCTION decisions.acknowledge_review_notice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.acknowledge_review_notice(uuid) TO agap_runtime;

CREATE FUNCTION decisions.review_candidate_names(app uuid,users uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('userId',u.id,'displayName',u.display_name) ORDER BY u.id),'[]'::jsonb)
 FROM applications.applications a JOIN identity.staff_users u ON u.organization_id=a.organization_id
 WHERE a.id=app AND a.organization_id=platform.current_organization() AND platform.allowed_branch(a.branch_id)
 AND platform.current_member() IS NULL AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'))
 AND u.id=ANY(users) AND a.branch_id=ANY(u.branch_ids)
$$;
REVOKE ALL ON FUNCTION decisions.review_candidate_names(uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.review_candidate_names(uuid,uuid[]) TO agap_runtime;

-- Add readiness to the existing narrow currentness guard. Replacing the function
-- preserves its identity for both previously compiled member/release callers.
CREATE OR REPLACE FUNCTION decisions.current_basis_guard(app uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=platform.current_member(); a applications.applications%ROWTYPE; s decisions.streams%ROWTYPE;
 r decisions.records%ROWTYPE; b jsonb; w jsonb; current_configuration uuid; current_policy uuid; current_assessment uuid;
 current_facts jsonb; valid boolean:=false; participants_clear boolean:=false;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('agap:connected-lending:' || platform.current_organization()::text,0));
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization()
   AND ((member IS NOT NULL AND member_id=decisions.member_scope()) OR (member IS NULL AND platform.allowed_branch(branch_id)
     AND (decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer'))));
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM decisions.streams WHERE organization_id=a.organization_id AND application_id=app AND member_id=a.member_id;
 SELECT * INTO r FROM decisions.records WHERE organization_id=a.organization_id AND application_id=app AND id=s.decision_id;
 IF r.id IS NULL OR r.snapshot_format<>'decision-snapshot/v2' THEN RETURN NULL; END IF;
 b:=r.snapshot->'basis'; w:=b->'workflowBasis';
 SELECT id INTO current_configuration FROM decisions.lending_configurations WHERE organization_id=a.organization_id AND branch_id=a.branch_id
   AND product_version_id=(w#>>'{policy,offers,0,productVersionId}')::uuid ORDER BY published_at DESC,id DESC LIMIT 1;
 SELECT id INTO current_policy FROM credit.policies WHERE organization_id=a.organization_id
   AND (body->>'status'='fictional' OR (body->>'status'='approved' AND length(body->>'approvalReference')>0)) ORDER BY published_at DESC,id LIMIT 1;
 SELECT id INTO current_assessment FROM credit.assessments WHERE organization_id=a.organization_id AND application_id=app ORDER BY created_at DESC,id DESC LIMIT 1;
 SELECT COALESCE(jsonb_agg(f.body ORDER BY f.id),'[]'::jsonb) INTO current_facts FROM
   (SELECT DISTINCT ON(id) id,body FROM evidence.facts WHERE organization_id=a.organization_id AND application_id=app ORDER BY id,revision DESC) f;
 SELECT count(*)=2 AND bool_and(u.active AND a.branch_id=ANY(u.branch_ids) AND
   CASE WHEN u.id=r.reviewer_id THEN 'reviewer'=ANY(u.roles) ELSE 'officer'=ANY(u.roles) END
   AND COALESCE((SELECT d.status='clear' FROM decisions.conflict_declarations d WHERE d.organization_id=a.organization_id AND d.application_id=app
     AND d.user_id=u.id AND d.input_version=a.assessment_input_version ORDER BY d.recorded_at DESC,d.id DESC LIMIT 1),false))
 INTO participants_clear FROM identity.staff_users u WHERE u.organization_id=a.organization_id
   AND u.id IN(r.reviewer_id,(b#>>'{recommendation,preparedBy}')::uuid);
 valid:=COALESCE(a.status='decision_recorded' AND r.outcome='approve' AND a.assessment_input_version=r.input_version
   AND a.purpose=b#>>'{application,purpose}' AND a.requested_principal_centavos=(b#>>'{application,requestedPrincipalCentavos}')::bigint
   AND a.requested_term_months=(b#>>'{application,requestedTermMonths}')::integer AND a.currency=b#>>'{application,currency}'
   AND a.assigned_officer_id=(b#>>'{recommendation,preparedBy}')::uuid AND s.recommendation_id=r.recommendation_id
   AND current_configuration=(b#>>'{integration,configurationId}')::uuid AND current_policy=(w#>>'{policy,id}')::uuid
   AND current_assessment=(w#>>'{assessment,id}')::uuid AND current_facts=w->'facts'
   AND EXISTS(SELECT 1 FROM credit.assessments ca WHERE ca.id=current_assessment AND ca.organization_id=a.organization_id
     AND ca.application_id=app AND ca.body=w->'assessment' AND ca.input_snapshot->'facts'=w->'facts' AND ca.input_snapshot->'policy'=w->'policy')
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(w->'sources') commitment WHERE NOT EXISTS(
     SELECT 1 FROM evidence.sources es LEFT JOIN evidence.processing p ON p.source_id=es.id
     WHERE es.organization_id=a.organization_id AND es.application_id=app AND es.id=(commitment->>'sourceId')::uuid
     AND es.version=(commitment->>'sourceVersion')::bigint AND es.kind=commitment->>'kind' AND es.source_date=(commitment->>'date')::date
     AND es.sha256 IS NOT DISTINCT FROM commitment->>'originalSha256'
     AND (CASE WHEN es.kind='statement' THEN encode(sha256(convert_to(es.statement,'UTF8')),'hex') ELSE NULL END) IS NOT DISTINCT FROM commitment->>'statementSha256'
     AND p.text_version_id IS NOT DISTINCT FROM (commitment->>'textVersionId')::uuid
     AND p.text_sha256 IS NOT DISTINCT FROM commitment->>'textSha256'
     AND (es.kind='statement' OR p.state='cleared') AND commitment->>'state'='cleared'
     AND NOT EXISTS(SELECT 1 FROM evidence.retirements retired WHERE retired.organization_id=a.organization_id AND retired.source_id=es.id)
     AND COALESCE((SELECT v.body->>'outcome' FROM evidence.verifications v WHERE v.organization_id=a.organization_id AND v.source_id=es.id
       ORDER BY v.recorded_at DESC,v.id DESC LIMIT 1),'not_checked')=commitment->>'verification'))
   AND participants_clear,false);
 -- Restrictions remain binding across input revisions and cannot be self-cleared.
 valid:=valid AND (SELECT count(*) FROM evidence.sources es WHERE es.organization_id=a.organization_id AND es.application_id=app)=jsonb_array_length(w->'sources')
   AND NOT EXISTS(SELECT 1 FROM decisions.conflict_declarations d WHERE d.organization_id=a.organization_id
   AND d.application_id=app AND d.status='restricted' AND d.user_id IN(r.reviewer_id,(b#>>'{recommendation,preparedBy}')::uuid));
 IF b#>>'{integration,format}'='connected-review/v2' THEN
   valid:=valid AND COALESCE(b#>>'{reviewReadiness,state}'='current' AND b#>>'{reviewReadiness,mode}'='manual'
     AND EXISTS(SELECT 1 FROM decisions.review_streams rs JOIN decisions.review_events e ON e.organization_id=rs.organization_id
       AND e.application_id=rs.application_id AND e.review_version=rs.version
       WHERE rs.organization_id=a.organization_id AND rs.application_id=app AND rs.version=(b#>>'{reviewReadiness,revision}')::bigint
       AND e.id=(b#>>'{reviewReadiness,confirmationId}')::uuid AND e.kind='confirm_current' AND e.actor_id=a.assigned_officer_id
       AND e.actor_id=(b#>>'{reviewReadiness,confirmedBy}')::uuid AND e.evidence_basis_hash=b#>>'{reviewReadiness,evidenceBasisHash}'
       AND e.payload#>>'{data,mode}'='manual' AND (e.payload#>>'{data,reviewedSources}')::boolean
       AND (e.payload#>>'{data,reviewedScenarios}')::boolean
       AND (SELECT count(*) FROM decisions.review_events complete WHERE complete.organization_id=rs.organization_id
         AND complete.application_id=rs.application_id)=rs.version-1)
     AND jsonb_typeof(b#>'{reviewReadiness,reviewParticipantIds}')='array'
     AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(b#>'{reviewReadiness,reviewParticipantIds}') person WHERE NOT EXISTS(
       SELECT 1 FROM identity.staff_users u WHERE u.organization_id=a.organization_id AND u.id=person::uuid AND u.active
       AND a.branch_id=ANY(u.branch_ids) AND 'reviewer'=ANY(u.roles)
       AND NOT EXISTS(SELECT 1 FROM decisions.conflict_declarations d WHERE d.organization_id=a.organization_id AND d.application_id=app
         AND d.user_id=u.id AND d.status='restricted')
       AND COALESCE((SELECT d.status='clear' FROM decisions.conflict_declarations d WHERE d.organization_id=a.organization_id AND d.application_id=app
         AND d.user_id=u.id AND d.input_version=a.assessment_input_version ORDER BY d.recorded_at DESC,d.id DESC LIMIT 1),false))),false);
 ELSE
   -- An older approval cannot silently absorb new review events it never bound.
   valid:=valid AND b#>>'{integration,format}'='connected-review/v1' AND NOT EXISTS(
     SELECT 1 FROM decisions.review_events e WHERE e.organization_id=a.organization_id AND e.application_id=app);
 END IF;
 RETURN jsonb_build_object('applicationId',app,'organizationId',a.organization_id,'memberId',a.member_id,
   'applicationVersion',a.version,'inputVersion',a.assessment_input_version,'applicationStatus',a.status,
   'basisHash',CASE WHEN valid THEN r.basis_hash ELSE repeat('0',64) END,'recommendationId',s.recommendation_id,'participantsClear',valid);
END $$;
REVOKE ALL ON FUNCTION decisions.current_basis_guard(uuid) FROM PUBLIC;
