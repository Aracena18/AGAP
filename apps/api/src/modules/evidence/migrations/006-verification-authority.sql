CREATE FUNCTION evidence.is_verifier() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT platform.current_member() IS NULL AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=platform.current_organization() AND u.active AND 'verifier'=ANY(u.roles))
$$;
REVOKE ALL ON FUNCTION evidence.is_verifier() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.is_verifier() TO agap_runtime;
ALTER POLICY staff_verification_only ON evidence.verifications WITH CHECK(evidence.is_verifier());
