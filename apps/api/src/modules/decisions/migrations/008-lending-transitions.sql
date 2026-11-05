-- Owner bridge: persist workflow-only revisions on the supplied transaction.
CREATE FUNCTION decisions.advance_application(app uuid,expected bigint,action text) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE a applications.applications%ROWTYPE; s decisions.streams%ROWTYPE; r decisions.records%ROWTYPE;
 uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid; member uuid:=platform.current_member(); target text;
BEGIN
 SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE='AG403'; END IF;
 IF a.version<>expected THEN RAISE EXCEPTION 'Application changed' USING ERRCODE='AG412'; END IF;
 SELECT * INTO s FROM decisions.streams WHERE application_id=app AND organization_id=a.organization_id;
 IF action='accept' THEN
   IF member IS DISTINCT FROM a.member_id OR member IS DISTINCT FROM decisions.member_scope()
     OR a.status<>'decision_recorded' OR NOT EXISTS(SELECT 1 FROM decisions.acceptances c
       WHERE c.organization_id=a.organization_id AND c.application_id=app AND c.decision_id=s.decision_id AND c.member_id=member) THEN
     RAISE EXCEPTION 'Current own-member acceptance required' USING ERRCODE='AG403';
   END IF;
   target:=a.status;
 ELSIF member IS NULL AND platform.allowed_branch(a.branch_id) THEN
   IF action='recommend' THEN
     IF NOT decisions.staff_role('officer') OR uid IS DISTINCT FROM a.assigned_officer_id
       OR a.status NOT IN ('assessment_ready','recommended') OR NOT EXISTS(SELECT 1 FROM decisions.recommendations rec
         WHERE rec.organization_id=a.organization_id AND rec.id=s.recommendation_id AND rec.application_id=app
         AND rec.prepared_by=uid AND (rec.body->>'inputVersion')::bigint=a.assessment_input_version) THEN
       RAISE EXCEPTION 'Current assigned-officer recommendation required' USING ERRCODE='AG403';
     END IF;
     target:='recommended';
   ELSIF action IN ('approve','decline','return') THEN
     SELECT * INTO r FROM decisions.records WHERE organization_id=a.organization_id AND application_id=app AND id=s.decision_id;
     IF NOT decisions.staff_role('reviewer') OR r.id IS NULL OR r.reviewer_id IS DISTINCT FROM uid OR r.outcome<>action
       OR r.input_version<>a.assessment_input_version OR (r.snapshot#>>'{basis,application,version}')::bigint<>expected
       OR uid IS NOT DISTINCT FROM a.assigned_officer_id
       OR (action<>'return' AND a.status<>'recommended')
       OR (action='return' AND a.status NOT IN ('submitted','evidence_review','clarification','assessment_ready','recommended')) THEN
       RAISE EXCEPTION 'Current separate-reviewer record required' USING ERRCODE='AG403';
     END IF;
     target:=CASE WHEN action='return' THEN 'clarification' ELSE 'decision_recorded' END;
   ELSE RAISE EXCEPTION 'Unsupported lending transition' USING ERRCODE='AG403'; END IF;
 ELSE RAISE EXCEPTION 'Lending access required' USING ERRCODE='AG403'; END IF;
 UPDATE applications.applications SET status=target,version=version+1,updated_at=now()
   WHERE organization_id=a.organization_id AND id=app RETURNING * INTO a;
 INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by,recorded_member_id)
   VALUES(gen_random_uuid(),a.organization_id,app,a.version,to_jsonb(a),uid,member);
 RETURN a.version;
END $$;
REVOKE ALL ON FUNCTION decisions.advance_application(uuid,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.advance_application(uuid,bigint,text) TO agap_runtime;

-- Member guard returns only hashes/versions/eligibility, never a staff snapshot.
-- Credit objects referenced by this PL/pgSQL function exist before runtime use;
-- central migration order still installs credit after decisions.
CREATE FUNCTION decisions.current_basis_guard(app uuid) RETURNS jsonb
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
 RETURN jsonb_build_object('applicationId',app,'organizationId',a.organization_id,'memberId',a.member_id,
   'applicationVersion',a.version,'inputVersion',a.assessment_input_version,'applicationStatus',a.status,
   'basisHash',CASE WHEN valid THEN r.basis_hash ELSE repeat('0',64) END,'recommendationId',s.recommendation_id,'participantsClear',valid);
END $$;
REVOKE ALL ON FUNCTION decisions.current_basis_guard(uuid) FROM PUBLIC;

CREATE FUNCTION decisions.member_basis_guard(app uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 PERFORM decisions.member_scope();
 RETURN decisions.current_basis_guard(app);
END $$;
REVOKE ALL ON FUNCTION decisions.member_basis_guard(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.member_basis_guard(uuid) TO agap_runtime;

CREATE FUNCTION decisions.staff_release_basis(app uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE guard jsonb; r decisions.records%ROWTYPE; a applications.applications%ROWTYPE; accepted decisions.acceptances%ROWTYPE; doc decisions.documents%ROWTYPE;
BEGIN
 IF platform.current_member() IS NOT NULL OR NOT (decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer')) THEN
   RAISE EXCEPTION 'Financial staff access required' USING ERRCODE='AG403'; END IF;
 guard:=decisions.current_basis_guard(app);
 IF guard IS NULL OR (guard->>'participantsClear')::boolean IS DISTINCT FROM true THEN RETURN NULL; END IF;
 SELECT * INTO a FROM applications.applications WHERE organization_id=platform.current_organization() AND id=app AND platform.allowed_branch(branch_id);
 SELECT rec.* INTO r FROM decisions.records rec JOIN decisions.streams s ON s.organization_id=rec.organization_id AND s.decision_id=rec.id
   WHERE s.organization_id=a.organization_id AND s.application_id=app;
 SELECT * INTO accepted FROM decisions.acceptances WHERE organization_id=a.organization_id AND decision_id=r.id AND member_id=a.member_id;
 SELECT * INTO doc FROM decisions.documents WHERE organization_id=a.organization_id AND decision_id=r.id AND id=r.document_id;
 IF accepted.id IS NULL OR doc.id IS NULL OR doc.sha256 IS DISTINCT FROM r.snapshot#>>'{document,sha256}' THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('saved',jsonb_build_object('snapshot',r.snapshot,'snapshotHash',r.snapshot_hash),
   'applicationVersion',a.version,'applicationStatus',a.status,'currentDecisionId',r.id,
   'publishedDocument',jsonb_build_object('id',doc.id,'sha256',doc.sha256),
   'acceptance',jsonb_build_object('id',accepted.id,'decisionId',r.id,'memberId',accepted.member_id,'linkId',accepted.link_id,
     'documentId',doc.id,'documentSha256',doc.sha256,'snapshotHash',r.snapshot_hash,'acceptedAt',accepted.recorded_at,
     'acknowledgment',true,'provenance','linked_member'));
END $$;
REVOKE ALL ON FUNCTION decisions.staff_release_basis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.staff_release_basis(uuid) TO agap_runtime;
