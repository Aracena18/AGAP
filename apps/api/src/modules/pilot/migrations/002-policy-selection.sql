-- Preserve pilot member/release checks and use the shared review-start selector.
CREATE OR REPLACE FUNCTION decisions.pilot_current_guard(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
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
 SELECT credit.policy_for_review(a.organization_id,(r.snapshot#>>'{basis,datedAssessment,periodStart}')::date,true)->>'id' INTO latest;
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
