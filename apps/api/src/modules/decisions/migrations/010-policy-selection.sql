-- Preserve every currentness/scope/readiness guard; change only policy selection.
-- credit.policy_for_review is installed by the evidence migration before traffic.
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
 SELECT (credit.policy_for_review(a.organization_id,(w#>>'{assessment,periodStart}')::date,true)->>'id')::uuid INTO current_policy;
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
