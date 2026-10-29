CREATE TABLE applications.assignment_changes (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, application_version bigint NOT NULL,
  officer_id uuid NOT NULL, recorded_by uuid NOT NULL, reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
  FOREIGN KEY(organization_id,officer_id) REFERENCES identity.staff_users(organization_id,id),
  FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id),
  UNIQUE(organization_id,application_id,application_version)
);
ALTER TABLE applications.assignment_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications.assignment_changes FORCE ROW LEVEL SECURITY;
CREATE POLICY assignment_scope ON applications.assignment_changes USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=assignment_changes.organization_id)) WITH CHECK(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=assignment_changes.organization_id));
GRANT SELECT,INSERT ON applications.assignment_changes TO agap_runtime;
