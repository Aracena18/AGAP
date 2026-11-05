-- Fictional pilot configuration is operator-published, immutable and never a real policy.
CREATE TABLE decisions.pilot_configurations(
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES platform.organizations(id),branch_id uuid NOT NULL,
 body text NOT NULL,sha256 text NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'),published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
 CHECK(body::jsonb->>'format'='fictional-principal-pilot-v1'),CHECK((body::jsonb->>'id')::uuid=id),
 CHECK((body::jsonb->>'organizationId')::uuid=organization_id AND (body::jsonb->>'branchId')::uuid=branch_id),
 CHECK(encode(pg_catalog.sha256(convert_to(body,'UTF8')),'hex')=sha256));
CREATE TABLE decisions.pilot_conflicts(
 organization_id uuid NOT NULL,application_id uuid NOT NULL,branch_id uuid NOT NULL,user_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),status text NOT NULL CHECK(status IN ('clear','restricted','unavailable')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 2000),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(organization_id,application_id,user_id,revision),
 FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES identity.staff_users(organization_id,id));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['pilot_configurations','pilot_conflicts'] LOOP
 EXECUTE format('ALTER TABLE decisions.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE decisions.%I FORCE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY pilot_staff ON decisions.%I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id))',t);
 EXECUTE format('CREATE TRIGGER immutable_pilot BEFORE UPDATE OR DELETE ON decisions.%I FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record()',t);
 END LOOP;END $$;
REVOKE ALL ON decisions.pilot_configurations,decisions.pilot_conflicts FROM PUBLIC,agap_runtime;
CREATE VIEW decisions.pilot_staff_configurations WITH(security_barrier=true) AS SELECT * FROM decisions.pilot_configurations WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id);
CREATE VIEW decisions.pilot_staff_conflicts WITH(security_barrier=true) AS SELECT * FROM decisions.pilot_conflicts WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id);
GRANT SELECT ON decisions.pilot_staff_configurations,decisions.pilot_staff_conflicts TO agap_runtime;
CREATE POLICY pilot_member_config_read ON decisions.pilot_configurations FOR SELECT USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.organization_id=decisions.pilot_configurations.organization_id AND a.branch_id=decisions.pilot_configurations.branch_id AND a.member_id=platform.current_member()));
CREATE POLICY pilot_member_conflict_read ON decisions.pilot_conflicts FOR SELECT USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=decisions.pilot_conflicts.organization_id AND a.member_id=platform.current_member()));
GRANT INSERT ON decisions.pilot_conflicts TO agap_runtime;
CREATE POLICY pilot_conflict_writer ON decisions.pilot_conflicts AS RESTRICTIVE FOR INSERT WITH CHECK(
 user_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=decisions.pilot_conflicts.organization_id AND a.branch_id=decisions.pilot_conflicts.branch_id));

CREATE FUNCTION decisions.pilot_current_guard(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=platform.current_member();a applications.applications%ROWTYPE;r decisions.records%ROWTYPE;
 c jsonb;valid boolean:=true;participants boolean:=true;p uuid;declaration jsonb;source jsonb;latest text;
BEGIN
 IF member IS NOT NULL THEN PERFORM decisions.member_scope();
 ELSIF NOT(decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer') OR decisions.staff_role('auditor')) THEN RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() AND (member_id=member OR member IS NULL AND platform.allowed_branch(branch_id));
 IF NOT FOUND THEN RAISE EXCEPTION 'Own application required' USING ERRCODE='42501';END IF;
 SELECT rec.* INTO r FROM decisions.streams s JOIN decisions.records rec ON rec.id=s.decision_id AND rec.organization_id=s.organization_id
 WHERE s.application_id=app AND s.organization_id=a.organization_id AND s.member_id=a.member_id;
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT body::jsonb INTO c FROM decisions.pilot_configurations WHERE organization_id=a.organization_id AND branch_id=a.branch_id ORDER BY published_at DESC,id DESC LIMIT 1;
 valid:=c IS NOT NULL AND c->>'id'=r.snapshot#>>'{basis,pilotConfigurationVersion}' AND a.assessment_input_version=r.input_version;
 SELECT id::text INTO latest FROM credit.policies WHERE organization_id=a.organization_id AND body->>'status'='fictional' ORDER BY published_at DESC,id LIMIT 1;
 valid:=valid AND latest IS NOT DISTINCT FROM r.snapshot#>>'{basis,currentAssessmentPolicyVersionId}';
 FOR source IN SELECT * FROM jsonb_array_elements(COALESCE(r.snapshot#>'{basis,datedSources}','[]'::jsonb)) LOOP
  valid:=valid AND EXISTS(SELECT 1 FROM evidence.sources s LEFT JOIN evidence.processing pr ON pr.source_id=s.id
   WHERE s.id=(source->>'id')::uuid AND s.application_id=app AND s.organization_id=a.organization_id AND s.version=(source->>'version')::bigint
   AND NOT EXISTS(SELECT 1 FROM evidence.retirements re WHERE re.source_id=s.id)
   AND (s.kind='statement' OR pr.state='cleared' AND pr.text_version_id::text IS NOT DISTINCT FROM source->>'textVersionId'));
 END LOOP;
 FOREACH p IN ARRAY ARRAY[r.reviewer_id,(r.snapshot#>>'{basis,recommendation,preparedBy}')::uuid] LOOP
  SELECT jsonb_build_object('status',status,'revision',revision) INTO declaration FROM decisions.pilot_conflicts WHERE organization_id=a.organization_id AND application_id=app AND user_id=p ORDER BY revision DESC LIMIT 1;
  participants:=participants AND COALESCE(declaration->>'status'='clear',false)
    AND declaration->>'revision'=r.snapshot#>>ARRAY['basis','conflictVersions',p::text]
    AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=p AND u.organization_id=a.organization_id AND u.active AND a.branch_id=ANY(u.branch_ids));
 END LOOP;
 RETURN jsonb_build_object('applicationId',app,'organizationId',a.organization_id,'memberId',a.member_id,'applicationVersion',a.version,'inputVersion',a.assessment_input_version,
 'applicationStatus',a.status,'basisHash',CASE WHEN COALESCE(valid,false) THEN r.basis_hash ELSE repeat('0',64) END,'recommendationId',r.recommendation_id,'participantsClear',COALESCE(participants,false));
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_current_guard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_current_guard(uuid) TO agap_runtime;

CREATE FUNCTION decisions.pilot_member_decision(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=decisions.member_scope();r decisions.records%ROWTYPE;v bigint;d decisions.documents%ROWTYPE;offer jsonb;
BEGIN
 SELECT a.version INTO v FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization() AND a.member_id=member;
 IF NOT FOUND THEN RAISE EXCEPTION 'Own application required' USING ERRCODE='42501';END IF;
 SELECT rec.* INTO r FROM decisions.streams s JOIN decisions.records rec ON rec.id=s.decision_id AND rec.organization_id=s.organization_id WHERE s.application_id=app AND s.organization_id=platform.current_organization() AND s.member_id=member;
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT * INTO d FROM decisions.documents WHERE id=r.document_id AND organization_id=r.organization_id AND member_id=member;
 SELECT o INTO offer FROM jsonb_array_elements(r.snapshot#>'{basis,offers}') o WHERE o->>'id'=r.snapshot#>>'{input,offerVersionId}';
 RETURN jsonb_build_object('id',r.id,'applicationVersion',v,'outcome',r.outcome,'explanation',r.member_view->'explanation','recordedAt',r.recorded_at,
 'accepted',EXISTS(SELECT 1 FROM decisions.acceptances ac WHERE ac.organization_id=r.organization_id AND ac.decision_id=r.id),
 'offer',CASE WHEN r.outcome='approve' THEN offer ELSE NULL END,'assessment',r.snapshot#>'{basis,datedAssessment}',
 'document',CASE WHEN d.id IS NULL THEN NULL ELSE jsonb_build_object('id',d.id,'sha256',d.sha256,'text',convert_from(d.bytes,'UTF8')) END);
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_member_decision(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_member_decision(uuid) TO agap_runtime;

CREATE FUNCTION decisions.pilot_financial_basis(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r decisions.records%ROWTYPE;a applications.applications%ROWTYPE;ac decisions.acceptances%ROWTYPE;guard jsonb;doc decisions.documents%ROWTYPE;appjson jsonb;
BEGIN
 IF NOT(decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer')) THEN RAISE EXCEPTION 'Financial access required' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE='42501';END IF;
 SELECT rec.* INTO r FROM decisions.streams s JOIN decisions.records rec ON rec.id=s.decision_id AND rec.organization_id=s.organization_id WHERE s.application_id=app AND s.organization_id=a.organization_id;
 IF NOT FOUND THEN RETURN NULL;END IF;
 guard:=decisions.pilot_current_guard(app);
 IF guard->>'basisHash' IS DISTINCT FROM r.basis_hash OR guard->>'participantsClear' IS DISTINCT FROM 'true' THEN RETURN NULL;END IF;
 SELECT * INTO ac FROM decisions.acceptances WHERE organization_id=a.organization_id AND decision_id=r.id AND member_id=a.member_id;
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT * INTO doc FROM decisions.documents WHERE organization_id=a.organization_id AND id=r.document_id;
 SELECT jsonb_build_object('id',a.id,'organizationId',a.organization_id,'branchId',a.branch_id,'memberId',a.member_id,'memberName',m.full_name,
 'purpose',a.purpose,'requestedPrincipalCentavos',a.requested_principal_centavos,'requestedTermMonths',a.requested_term_months,'currency',a.currency,'status',a.status,'version',a.version,
 'assessmentInputVersion',a.assessment_input_version,'assignedOfficerId',a.assigned_officer_id,'createdAt',a.created_at,'updatedAt',a.updated_at) INTO appjson FROM members.members m WHERE m.id=a.member_id AND m.organization_id=a.organization_id;
 RETURN jsonb_build_object('saved',jsonb_build_object('snapshot',r.snapshot,'snapshotHash',r.snapshot_hash),'application',appjson,
 'acceptance',jsonb_build_object('id',ac.id,'decisionId',ac.decision_id,'memberId',ac.member_id,'linkId',ac.link_id,'documentId',ac.document_id,'documentSha256',doc.sha256,'snapshotHash',r.snapshot_hash,'acceptedAt',ac.recorded_at,'acknowledgment',true,'provenance','linked_member'),
 'document',jsonb_build_object('id',doc.id,'sha256',doc.sha256));
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_financial_basis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_financial_basis(uuid) TO agap_runtime;
-- Only the migration/function owner can use these bounded metadata policies.
-- Runtime principals do not inherit this owner and retain existing evidence access.
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['sources','processing','retirements','facts','verifications'] LOOP
 EXECUTE format('CREATE POLICY pilot_bounded_metadata ON evidence.%I FOR SELECT TO %I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND (decisions.staff_role(''cashier'') OR decisions.staff_role(''financial_authorizer'')) AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=platform.current_organization() AND platform.allowed_branch(a.branch_id)))',t,current_user);
 END LOOP;END $$;
CREATE FUNCTION decisions.pilot_transition(app uuid,expected bigint,action text) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications%ROWTYPE;uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid;member uuid:=platform.current_member();nextstatus text;
BEGIN
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE='42501';END IF;
 IF a.version<>expected THEN RAISE EXCEPTION 'Application changed' USING ERRCODE='AG412';END IF;
 IF action='accept' THEN
  IF member IS DISTINCT FROM a.member_id OR NOT EXISTS(SELECT 1 FROM decisions.streams s JOIN decisions.acceptances ac ON ac.organization_id=s.organization_id AND ac.decision_id=s.decision_id WHERE s.organization_id=a.organization_id AND s.application_id=app AND ac.member_id=member) THEN RAISE EXCEPTION 'Member acknowledgment required' USING ERRCODE='42501';END IF;
  PERFORM decisions.member_scope();nextstatus:=a.status;
 ELSIF member IS NOT NULL OR NOT platform.allowed_branch(a.branch_id) THEN RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
 ELSIF action='recommend' THEN
  IF NOT decisions.staff_role('officer') OR a.assigned_officer_id IS DISTINCT FROM uid OR a.status NOT IN ('assessment_ready','recommended') THEN RAISE EXCEPTION 'Assigned officer review required' USING ERRCODE='42501';END IF;nextstatus:='recommended';
 ELSIF action IN ('approve','decline','return') THEN
  IF NOT decisions.staff_role('reviewer') OR a.assigned_officer_id=uid THEN RAISE EXCEPTION 'Separate reviewer required' USING ERRCODE='42501';END IF;
  nextstatus:=CASE WHEN action='return' THEN 'clarification' ELSE 'decision_recorded' END;
 ELSIF action='reopen' THEN
  IF NOT decisions.staff_role('officer') OR a.assigned_officer_id IS DISTINCT FROM uid OR a.status<>'decision_recorded' THEN RAISE EXCEPTION 'Assigned officer required' USING ERRCODE='42501';END IF;
  IF EXISTS(SELECT 1 FROM servicing.originations o JOIN servicing.postings p ON p.loan_id=o.id WHERE o.organization_id=a.organization_id AND o.application_id=app AND p.kind='disbursement') THEN RAISE EXCEPTION 'Posted contracts require support or a separate amendment' USING ERRCODE='AG409';END IF;nextstatus:='evidence_review';
 ELSE RAISE EXCEPTION 'Unsupported transition' USING ERRCODE='42501';END IF;
 UPDATE applications.applications SET status=nextstatus,version=version+1,updated_at=clock_timestamp() WHERE id=app RETURNING * INTO a;
 INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by,recorded_member_id) VALUES(gen_random_uuid(),a.organization_id,a.id,a.version,to_jsonb(a),uid,member);
 RETURN a.version;
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_transition(uuid,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_transition(uuid,bigint,text) TO agap_runtime;
CREATE FUNCTION decisions.pilot_original_authorizer(app uuid) RETURNS TABLE(user_id uuid,active boolean,organization_id uuid,branch_ids uuid[],roles text[]) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT(decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer')) OR NOT EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization() AND platform.allowed_branch(a.branch_id)) THEN RAISE EXCEPTION 'Financial application scope required' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT u.id,u.active,u.organization_id,u.branch_ids,u.roles FROM identity.staff_users u JOIN (
 SELECT (body#>>'{authorization,userId}')::uuid AS id FROM (
 SELECT cr.body FROM servicing.command_revisions cr WHERE cr.organization_id=platform.current_organization() AND cr.body->>'applicationId'=app::text
 UNION ALL SELECT mr.body FROM servicing.money_revisions mr WHERE mr.organization_id=platform.current_organization() AND mr.body->>'applicationId'=app::text
 ) histories WHERE body#>>'{authorization,userId}' IS NOT NULL ORDER BY (body#>>'{authorization,at}')::timestamptz DESC LIMIT 1
 ) auth ON auth.id=u.id WHERE u.organization_id=platform.current_organization();
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_original_authorizer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_original_authorizer(uuid) TO agap_runtime;
CREATE FUNCTION decisions.pilot_review_status(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications%ROWTYPE;member uuid:=platform.current_member();c jsonb;rec jsonb;eligible jsonb;blockers jsonb:='[]'::jsonb;
BEGIN
 IF member IS NOT NULL THEN PERFORM decisions.member_scope();END IF;
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() AND (member_id=member OR member IS NULL AND platform.allowed_branch(branch_id));
 IF NOT FOUND THEN RAISE EXCEPTION 'Application scope required' USING ERRCODE='42501';END IF;
 SELECT body::jsonb INTO c FROM decisions.pilot_configurations WHERE organization_id=a.organization_id AND branch_id=a.branch_id ORDER BY published_at DESC,id DESC LIMIT 1;
 SELECT rr.body INTO rec FROM decisions.streams st JOIN decisions.recommendations rr ON rr.id=st.recommendation_id AND rr.organization_id=st.organization_id WHERE st.application_id=app AND st.organization_id=a.organization_id;
 IF c IS NULL THEN blockers:=blockers||jsonb_build_array('Fictional authority configuration is unavailable.');END IF;
 IF NOT EXISTS(SELECT 1 FROM decisions.pilot_conflicts pc WHERE pc.organization_id=a.organization_id AND pc.application_id=app AND pc.user_id=a.assigned_officer_id AND pc.revision=(SELECT max(x.revision) FROM decisions.pilot_conflicts x WHERE x.organization_id=pc.organization_id AND x.application_id=pc.application_id AND x.user_id=pc.user_id) AND pc.status='clear') THEN blockers:=blockers||jsonb_build_array('The assigned officer must record current conflict clearance.');END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',u.id,'displayName',u.display_name) ORDER BY u.id),'[]'::jsonb) INTO eligible FROM identity.staff_users u
 WHERE u.organization_id=a.organization_id AND u.id IS DISTINCT FROM a.assigned_officer_id AND u.active AND a.branch_id=ANY(u.branch_ids) AND 'reviewer'=ANY(u.roles)
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(c#>'{decisionAuthority,grants}','[]'::jsonb)) g WHERE g->>'userId'=u.id::text AND g->'outcomes'?'approve')
 AND EXISTS(SELECT 1 FROM decisions.pilot_conflicts pc WHERE pc.organization_id=a.organization_id AND pc.application_id=app AND pc.user_id=u.id AND pc.revision=(SELECT max(x.revision) FROM decisions.pilot_conflicts x WHERE x.organization_id=pc.organization_id AND x.application_id=pc.application_id AND x.user_id=pc.user_id) AND pc.status='clear');
 IF jsonb_array_length(eligible)=0 THEN blockers:=blockers||jsonb_build_array('No separate authorized reviewer has current conflict clearance.');END IF;
 RETURN jsonb_build_object('recommendation',CASE WHEN rec IS NULL THEN NULL ELSE jsonb_build_object('id',rec->'id','assessmentId',rec->'assessmentId','inputVersion',rec->'inputVersion','offerVersionId',rec->'offerVersionId') END,'blockers',blockers,'eligibleReviewers',eligible);
END $$;
REVOKE ALL ON FUNCTION decisions.pilot_review_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.pilot_review_status(uuid) TO agap_runtime;

DO $$ BEGIN EXECUTE format('CREATE POLICY pilot_bounded_assessment ON credit.assessments FOR SELECT TO %I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND (decisions.staff_role(''cashier'') OR decisions.staff_role(''financial_authorizer'')) AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=platform.current_organization() AND platform.allowed_branch(a.branch_id)))',current_user);END $$;
