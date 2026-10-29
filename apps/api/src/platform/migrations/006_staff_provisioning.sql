CREATE TABLE identity.staff_provisionings (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, staff_id uuid NOT NULL,
  operator_reference text NOT NULL, reason text NOT NULL, snapshot jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,staff_id) REFERENCES identity.staff_users(organization_id,id)
);
REVOKE ALL ON identity.staff_provisionings FROM PUBLIC,agap_runtime,agap_identity;

CREATE FUNCTION identity.assignable_officer(org_id uuid,staff_id uuid,branch_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE found_id uuid;
BEGIN
  SELECT u.id INTO found_id FROM identity.staff_users u
    WHERE u.id=staff_id AND u.organization_id=org_id AND u.active AND 'officer'=ANY(u.roles) AND branch_id=ANY(u.branch_ids)
    FOR SHARE OF u;
  RETURN found_id IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION identity.assignable_officer(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.assignable_officer(uuid,uuid,uuid) TO agap_runtime;
