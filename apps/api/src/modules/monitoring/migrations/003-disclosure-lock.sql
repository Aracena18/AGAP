-- Row locking needs write privilege in PostgreSQL. Keep that privilege inside a
-- bounded owner function rather than granting runtime UPDATE on request metadata.
CREATE FUNCTION monitoring.lock_disclosure(request uuid, exclusive boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE found_id uuid;
BEGIN
 IF exclusive THEN
  SELECT id INTO found_id FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization() FOR UPDATE;
 ELSE
  SELECT id INTO found_id FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization() FOR SHARE;
 END IF;
 IF found_id IS NULL OR platform.current_member() IS NOT NULL OR NOT monitoring.can_read(request,true) THEN
  RAISE EXCEPTION 'Request unavailable' USING ERRCODE='P0002';
 END IF;
END $$;
REVOKE ALL ON FUNCTION monitoring.lock_disclosure(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.lock_disclosure(uuid,boolean) TO agap_runtime;
