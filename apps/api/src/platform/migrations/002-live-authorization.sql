ALTER TABLE identity.staff_users ADD COLUMN version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991);

-- A narrow definer function rechecks the server-established context and holds
-- staff/session rows through the command. Runtime roles cannot read credentials.
CREATE FUNCTION identity.assert_actor(session_id uuid, staff_id uuid, org_id uuid, branches uuid[], staff_roles text[])
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE found_id uuid;
BEGIN
  SELECT u.id INTO found_id FROM identity.staff_users u JOIN identity.sessions s ON s.user_id=u.id
    WHERE s.id=session_id AND u.id=staff_id AND u.organization_id=org_id AND u.active AND s.expires_at>now()
      AND u.branch_ids @> branches AND branches @> u.branch_ids AND u.roles @> staff_roles AND staff_roles @> u.roles
    FOR SHARE OF u,s;
  RETURN found_id IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION identity.assert_actor(uuid,uuid,uuid,uuid[],text[]) FROM PUBLIC;
GRANT USAGE ON SCHEMA identity TO agap_runtime;
GRANT EXECUTE ON FUNCTION identity.assert_actor(uuid,uuid,uuid,uuid[],text[]) TO agap_runtime,agap_identity;
GRANT USAGE ON SCHEMA platform TO agap_identity;
GRANT EXECUTE ON FUNCTION platform.current_organization(), platform.allowed_branch(uuid) TO agap_identity;
GRANT SELECT,INSERT,UPDATE ON platform.idempotency TO agap_identity;
GRANT INSERT ON platform.audit_events,platform.outbox TO agap_identity;
GRANT UPDATE(active,version) ON identity.staff_users TO agap_identity;
CREATE TABLE identity.staff_revocations (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, staff_id uuid NOT NULL, staff_version bigint NOT NULL,
  revoked_by uuid NOT NULL, reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,staff_id) REFERENCES identity.staff_users(organization_id,id),
  FOREIGN KEY(organization_id,revoked_by) REFERENCES identity.staff_users(organization_id,id)
);
ALTER TABLE identity.staff_revocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity.staff_revocations FORCE ROW LEVEL SECURITY;
CREATE POLICY revocation_scope ON identity.staff_revocations USING(organization_id=platform.current_organization()) WITH CHECK(organization_id=platform.current_organization());
GRANT SELECT,INSERT ON identity.staff_revocations TO agap_identity;
