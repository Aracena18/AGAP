-- Login may lock a verified linkage, but cannot grant/revoke member access.
CREATE FUNCTION identity.member_link_for_login(trusted_issuer text,verified_subject text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE found_id uuid;
BEGIN
  SELECT id INTO found_id FROM identity.member_links
  WHERE issuer=trusted_issuer AND subject=verified_subject AND active FOR SHARE;
  RETURN found_id;
END $$;
REVOKE ALL ON FUNCTION identity.member_link_for_login(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.member_link_for_login(text,text) TO agap_identity;
