-- Azure's migration owner is not a superuser. Keep FORCE RLS effective.
CREATE OR REPLACE FUNCTION evidence.enqueue(source uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE s evidence.sources; saved_member text:=current_setting('agap.member_id',true);
 BEGIN
  SELECT * INTO s FROM evidence.sources WHERE id=source AND organization_id=platform.current_organization();
  IF s.id IS NULL OR NOT evidence.can_access(s.application_id) OR s.kind<>'document' THEN RAISE EXCEPTION 'Source unavailable' USING ERRCODE='42501'; END IF;
  -- After member/source authorization, cross only this fixed queue bridge. The
  -- caller still has no queue privileges; restore its claim before returning.
  PERFORM set_config('agap.member_id','',true);
  INSERT INTO platform.jobs(id,organization_id,kind,payload) VALUES(s.id,s.organization_id,'evidence.process',jsonb_build_object('sourceId',s.id)) ON CONFLICT(id) DO NOTHING;
  PERFORM set_config('agap.member_id',COALESCE(saved_member,''),true);
 END $$;
CREATE FUNCTION evidence.worker_branches() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 BEGIN
  IF NOT pg_has_role(session_user,'agap_worker','MEMBER') THEN RAISE EXCEPTION 'Worker only' USING ERRCODE='42501'; END IF;
  RETURN(SELECT COALESCE(jsonb_agg(b.id),'[]'::jsonb) FROM platform.branches b WHERE b.organization_id=platform.current_organization());
 END $$;
REVOKE ALL ON FUNCTION evidence.worker_branches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.worker_branches() TO agap_worker;
