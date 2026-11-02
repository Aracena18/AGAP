ALTER POLICY staff_verification_only ON evidence.verifications WITH CHECK(
 platform.current_member() IS NULL AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=evidence.verifications.organization_id AND u.active AND 'verifier'=ANY(u.roles))
);
ALTER POLICY assigned_assessment_only ON credit.assessments WITH CHECK(
 platform.current_member() IS NULL AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=credit.assessments.application_id AND a.organization_id=credit.assessments.organization_id AND a.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid)
);
