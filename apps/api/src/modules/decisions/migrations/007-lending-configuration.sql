CREATE TABLE decisions.lending_configurations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,branch_id uuid NOT NULL,product_version_id uuid NOT NULL,
 body jsonb NOT NULL,published_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
 CHECK(body->>'format'='connected-principal-configuration/v1' AND body->>'status'='fictional'
   AND (body->>'id')::uuid=id AND (body->>'organizationId')::uuid=organization_id
   AND (body->>'branchId')::uuid=branch_id AND (body->>'productVersionId')::uuid=product_version_id)
);
ALTER TABLE decisions.lending_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions.lending_configurations FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_scope ON decisions.lending_configurations USING (
 organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
);
GRANT SELECT ON decisions.lending_configurations TO agap_runtime;
-- Only the table-owning definer may use this member read path. Runtime members
-- cannot select the roster/configuration; FORCE RLS stays on for managed owners.
CREATE POLICY member_guard_owner_read ON decisions.lending_configurations FOR SELECT USING (
 current_user=(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='decisions.lending_configurations'::regclass)
 AND organization_id=platform.current_organization() AND platform.current_member() IS NOT NULL
 AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.organization_id=decisions.lending_configurations.organization_id
   AND a.branch_id=decisions.lending_configurations.branch_id AND a.member_id=platform.current_member())
);
CREATE TRIGGER immutable_configuration BEFORE UPDATE OR DELETE ON decisions.lending_configurations
 FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record();

CREATE TABLE decisions.conflict_declarations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,branch_id uuid NOT NULL,
 user_id uuid NOT NULL,input_version bigint NOT NULL CHECK(input_version BETWEEN 1 AND 9007199254740991),
 status text NOT NULL CHECK(status IN ('clear','restricted')),reference text NOT NULL CHECK(length(reference) BETWEEN 1 AND 2000),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES identity.staff_users(organization_id,id)
);
ALTER TABLE decisions.conflict_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions.conflict_declarations FORCE ROW LEVEL SECURITY;
CREATE POLICY staff_scope ON decisions.conflict_declarations USING (
 organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)
) WITH CHECK (organization_id=platform.current_organization() AND platform.current_member() IS NULL
 AND user_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND platform.allowed_branch(branch_id)
 AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=decisions.conflict_declarations.application_id AND a.organization_id=decisions.conflict_declarations.organization_id
   AND a.branch_id=decisions.conflict_declarations.branch_id AND a.assessment_input_version=decisions.conflict_declarations.input_version));
GRANT SELECT,INSERT ON decisions.conflict_declarations TO agap_runtime;
CREATE POLICY member_guard_owner_read ON decisions.conflict_declarations FOR SELECT USING (
 current_user=(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid='decisions.conflict_declarations'::regclass)
 AND organization_id=platform.current_organization() AND platform.current_member() IS NOT NULL
 AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.organization_id=decisions.conflict_declarations.organization_id
   AND a.id=decisions.conflict_declarations.application_id AND a.member_id=platform.current_member())
);
CREATE TRIGGER immutable_declaration BEFORE UPDATE OR DELETE ON decisions.conflict_declarations
 FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record();

-- Current participant validity without exposing private identity subjects/sessions.
CREATE FUNCTION decisions.current_participants(app uuid,users uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('userId',u.id,'active',u.active,
   'organizationId',u.organization_id,'branchIds',u.branch_ids,'roles',u.roles) ORDER BY u.id),'[]'::jsonb)
 FROM identity.staff_users u JOIN applications.applications a ON a.organization_id=u.organization_id AND a.id=app
 WHERE a.organization_id=platform.current_organization() AND platform.current_member() IS NULL
 AND platform.allowed_branch(a.branch_id) AND u.id=ANY(users)
$$;
REVOKE ALL ON FUNCTION decisions.current_participants(uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.current_participants(uuid,uuid[]) TO agap_runtime;
