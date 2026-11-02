CREATE POLICY staff_verification_only ON evidence.verifications AS RESTRICTIVE FOR INSERT WITH CHECK(
 platform.current_member() IS NULL AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=organization_id AND u.active AND 'verifier'=ANY(u.roles))
);
CREATE POLICY assigned_assessment_only ON credit.assessments AS RESTRICTIVE FOR INSERT WITH CHECK(
 platform.current_member() IS NULL AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=organization_id AND a.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid)
);
-- Confirmation identity is retained separately from model/verification histories.
ALTER TABLE evidence.facts ADD COLUMN recorded_by uuid DEFAULT NULLIF(current_setting('agap.user_id',true),'')::uuid;
ALTER TABLE evidence.facts ADD COLUMN recorded_member_id uuid DEFAULT platform.current_member();
ALTER TABLE evidence.facts ADD CONSTRAINT confirmation_actor CHECK(num_nonnulls(recorded_by,recorded_member_id)=1) NOT VALID;
ALTER TABLE evidence.facts ADD FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id);
ALTER TABLE evidence.facts ADD FOREIGN KEY(organization_id,recorded_member_id) REFERENCES members.members(organization_id,id);
CREATE INDEX evidence_source_application ON evidence.sources(organization_id,application_id,created_at);
CREATE INDEX evidence_fact_current ON evidence.facts(organization_id,application_id,id,revision DESC);
CREATE INDEX evidence_assessment_history ON credit.assessments(organization_id,application_id,created_at DESC);
