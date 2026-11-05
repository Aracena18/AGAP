-- Fictional prototype only; the application gate is closed for real records.
CREATE TABLE monitoring.assisted_check_ins (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,source_request_id uuid NOT NULL,member_id uuid NOT NULL,branch_id uuid NOT NULL,
 prepared_by uuid NOT NULL,prepared_by_name text NOT NULL,prepared_user_version bigint NOT NULL,assignment_version bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','withdrawn','declined','confirmed')),resulting_request_id uuid UNIQUE,
 UNIQUE(organization_id,id),FOREIGN KEY(organization_id,source_request_id) REFERENCES monitoring.requests(organization_id,id),
 FOREIGN KEY(organization_id,resulting_request_id) REFERENCES monitoring.requests(organization_id,id),
 FOREIGN KEY(organization_id,branch_id,member_id) REFERENCES members.members(organization_id,branch_id,id),
 FOREIGN KEY(organization_id,prepared_by) REFERENCES identity.staff_users(organization_id,id),
 CHECK((state='confirmed')=(resulting_request_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_current_assisted_draft ON monitoring.assisted_check_ins(source_request_id,assignment_version,prepared_user_version) WHERE state='pending';
CREATE INDEX assisted_member_page ON monitoring.assisted_check_ins(organization_id,member_id,created_at DESC,id DESC);
CREATE TABLE monitoring.assisted_check_in_revisions (
 organization_id uuid NOT NULL,draft_id uuid NOT NULL,version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),state text NOT NULL CHECK(state IN ('pending','withdrawn','declined','confirmed')),
 content jsonb NOT NULL,notice_version text NOT NULL,payload_sha256 text NOT NULL CHECK(payload_sha256~'^[a-f0-9]{64}$'),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),staff_id uuid,member_id uuid,member_link_id uuid,member_session_id uuid,confirmation_method text,
 action_reason text,resulting_request_id uuid,
 PRIMARY KEY(draft_id,version),FOREIGN KEY(organization_id,draft_id) REFERENCES monitoring.assisted_check_ins(organization_id,id),
 FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id),
 FOREIGN KEY(member_link_id) REFERENCES identity.member_links(id),
 FOREIGN KEY(organization_id,resulting_request_id) REFERENCES monitoring.requests(organization_id,id),
 FOREIGN KEY(organization_id,staff_id) REFERENCES identity.staff_users(organization_id,id),
 CHECK(num_nonnulls(staff_id,member_id)=1),CHECK((member_id IS NOT NULL)=(member_link_id IS NOT NULL AND member_session_id IS NOT NULL)),
 CHECK((state='confirmed')=(confirmation_method IS NOT NULL AND resulting_request_id IS NOT NULL)),
 CHECK(confirmation_method IS NULL OR confirmation_method='member_session')
);
-- No runtime EXECUTE on helpers or raw table access. Policies run as the owner.
CREATE FUNCTION monitoring.assisted_authorized(source uuid,preparer uuid,user_version bigint,assignment bigint) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM monitoring.requests r JOIN identity.staff_users u ON u.id=preparer AND u.organization_id=r.organization_id
 WHERE r.id=source AND r.organization_id=platform.current_organization() AND r.assigned_officer_id=preparer
 AND u.active AND u.version=user_version AND 'officer'=ANY(u.roles) AND r.branch_id=ANY(u.branch_ids)
 AND assignment=(SELECT max(a.version) FROM monitoring.assignments a WHERE a.request_id=r.id))
$$;
ALTER TABLE monitoring.assisted_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring.assisted_check_ins FORCE ROW LEVEL SECURITY;
CREATE POLICY assisted_scope ON monitoring.assisted_check_ins USING(organization_id=platform.current_organization() AND
 (member_id=platform.current_member() OR (platform.current_member() IS NULL AND prepared_by=NULLIF(current_setting('agap.user_id',true),'')::uuid
 AND monitoring.staff_role('officer',branch_id) AND monitoring.assisted_authorized(source_request_id,prepared_by,prepared_user_version,assignment_version))));
ALTER TABLE monitoring.assisted_check_in_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring.assisted_check_in_revisions FORCE ROW LEVEL SECURITY;
CREATE POLICY assisted_revision_scope ON monitoring.assisted_check_in_revisions USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM monitoring.assisted_check_ins d WHERE d.id=draft_id));
CREATE FUNCTION monitoring.assisted_visible(d monitoring.assisted_check_ins) RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT d.organization_id=platform.current_organization() AND (d.member_id=platform.current_member() OR
 (platform.current_member() IS NULL AND d.prepared_by=NULLIF(current_setting('agap.user_id',true),'')::uuid AND monitoring.staff_role('officer',d.branch_id)
 AND monitoring.assisted_authorized(d.source_request_id,d.prepared_by,d.prepared_user_version,d.assignment_version)))
$$;
CREATE TRIGGER immutable_assisted_revision BEFORE UPDATE OR DELETE ON monitoring.assisted_check_in_revisions FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence();
CREATE FUNCTION monitoring.assisted_identity_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['version','state','resulting_request_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['version','state','resulting_request_id']) THEN
  RAISE EXCEPTION 'Assisted identity is immutable' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_assisted_identity BEFORE UPDATE OR DELETE ON monitoring.assisted_check_ins FOR EACH ROW EXECUTE FUNCTION monitoring.assisted_identity_immutable();
CREATE FUNCTION monitoring.assisted_content(data jsonb,loan uuid) RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF jsonb_typeof(data) IS DISTINCT FROM 'object' OR data-ARRAY['message','contactPreference','checkIn']<>'{}'::jsonb
 OR jsonb_typeof(data->'message') IS DISTINCT FROM 'string' OR length(btrim(data->>'message')) NOT BETWEEN 1 AND 2000
 OR data->>'contactPreference' IS NULL OR data->>'contactPreference' NOT IN ('portal','phone')
 OR jsonb_typeof(data->'checkIn') IS DISTINCT FROM 'object' OR (data->'checkIn')-ARRAY['canMeetEssentials','borrowedToRepay','financialStrain']<>'{}'::jsonb
 OR COALESCE(data->'checkIn'->>'canMeetEssentials','') NOT IN ('yes','no','declined','unavailable')
 OR COALESCE(data->'checkIn'->>'borrowedToRepay','') NOT IN ('yes','no','declined','unavailable')
 OR COALESCE(data->'checkIn'->>'financialStrain','') NOT IN ('reported','not_reported','declined','unavailable') THEN
  RAISE EXCEPTION 'Explicit check-in fields required' USING ERRCODE='23514';
 END IF;
 RETURN data||jsonb_build_object('loanId',loan);
END $$;
CREATE FUNCTION monitoring.assisted_read(draft uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE d monitoring.assisted_check_ins;r monitoring.assisted_check_in_revisions;eligible boolean;
BEGIN
 SELECT * INTO d FROM monitoring.assisted_check_ins WHERE id=draft AND monitoring.assisted_visible(assisted_check_ins);
 IF d.id IS NULL THEN RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002'; END IF;
 IF platform.current_member() IS NULL THEN
  PERFORM monitoring.lock_disclosure(d.source_request_id,false);
  SELECT * INTO d FROM monitoring.assisted_check_ins WHERE id=draft AND monitoring.assisted_visible(assisted_check_ins);
  IF d.id IS NULL THEN RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002'; END IF;
 END IF;
 SELECT * INTO STRICT r FROM monitoring.assisted_check_in_revisions WHERE draft_id=d.id AND version=d.version;
 eligible:=d.state='pending' AND monitoring.assisted_authorized(d.source_request_id,d.prepared_by,d.prepared_user_version,d.assignment_version);
 RETURN jsonb_build_object('id',d.id,'sourceRequestId',d.source_request_id,'version',d.version,'state',d.state,'fictional',true,
 'preparedAt',d.created_at,'updatedAt',r.recorded_at,'preparedByName',d.prepared_by_name,'content',r.content,'noticeVersion',r.notice_version,'payloadSha256',r.payload_sha256,
 'confirmationAllowed',eligible,'reviewMessage',CASE WHEN d.state='pending' AND NOT eligible THEN 'Staff access or assignment changed. Ask the cooperative to prepare a new draft.' ELSE NULL END,'resultingRequestId',d.resulting_request_id);
END $$;
CREATE FUNCTION monitoring.assisted_list(source uuid,cursor_id uuid,page_size integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE items jsonb;next_id uuid;ids uuid[];
BEGIN
 IF page_size IS NULL OR page_size NOT BETWEEN 1 AND 25 THEN RAISE EXCEPTION 'Invalid page size' USING ERRCODE='23514'; END IF;
 IF platform.current_member() IS NULL THEN
  IF source IS NULL THEN RAISE EXCEPTION 'Source required' USING ERRCODE='P0002'; END IF;
  PERFORM monitoring.lock_disclosure(source,false);
 ELSIF source IS NOT NULL THEN RAISE EXCEPTION 'Own member list required' USING ERRCODE='P0002'; END IF;
 IF cursor_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM monitoring.assisted_check_ins WHERE id=cursor_id AND monitoring.assisted_visible(assisted_check_ins) AND (source IS NULL OR source_request_id=source)) THEN RAISE EXCEPTION 'Invalid cursor' USING ERRCODE='PA422'; END IF;
 SELECT array_agg(id ORDER BY created_at DESC,id DESC) INTO ids FROM (SELECT id,created_at FROM monitoring.assisted_check_ins WHERE monitoring.assisted_visible(assisted_check_ins) AND (source IS NULL OR source_request_id=source)
 AND (cursor_id IS NULL OR (created_at,id)<(SELECT created_at,id FROM monitoring.assisted_check_ins WHERE id=cursor_id AND monitoring.assisted_visible(assisted_check_ins))) ORDER BY created_at DESC,id DESC LIMIT page_size+1) page;
 IF cardinality(ids)>page_size THEN next_id:=ids[page_size]; END IF;
 SELECT COALESCE(jsonb_agg(monitoring.assisted_read(id) ORDER BY n),'[]'::jsonb) INTO items FROM unnest(ids[1:page_size]) WITH ORDINALITY AS page(id,n);
 RETURN jsonb_build_object('items',items,'nextCursor',next_id);
END $$;
CREATE FUNCTION monitoring.assisted_prepare(source uuid,data jsonb,notice text,expected bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r monitoring.requests;u identity.staff_users;draft uuid:=gen_random_uuid();body jsonb;assignment bigint;
BEGIN
 PERFORM monitoring.lock_disclosure(source,false);
 SELECT * INTO STRICT r FROM monitoring.requests WHERE id=source;
 IF r.version<>expected THEN RAISE EXCEPTION 'Source changed' USING ERRCODE='P0412'; END IF;
 SELECT * INTO STRICT u FROM identity.staff_users WHERE id=r.assigned_officer_id AND organization_id=r.organization_id;
 SELECT max(version) INTO assignment FROM monitoring.assignments WHERE request_id=source;
 IF notice IS NULL OR length(btrim(notice)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Notice required' USING ERRCODE='23514'; END IF;
 body:=monitoring.assisted_content(data,(SELECT loan_id FROM monitoring.disclosures WHERE request_id=source));
 INSERT INTO monitoring.assisted_check_ins(id,organization_id,source_request_id,member_id,branch_id,prepared_by,prepared_by_name,prepared_user_version,assignment_version)
 VALUES(draft,r.organization_id,source,r.member_id,r.branch_id,u.id,u.display_name,u.version,assignment);
 INSERT INTO monitoring.assisted_check_in_revisions(organization_id,draft_id,version,state,content,notice_version,payload_sha256,staff_id)
 VALUES(r.organization_id,draft,1,'pending',body,notice,encode(sha256(convert_to(jsonb_build_object('content',body,'noticeVersion',notice)::text,'UTF8')),'hex'),u.id);
 RETURN jsonb_build_object('id',draft,'version',1,'state','pending','resultingRequestId',NULL);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Pending draft exists' USING ERRCODE='PA409';
END $$;
CREATE FUNCTION monitoring.assisted_staff_change(draft uuid,change text,data jsonb,notice text,expected bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE d monitoring.assisted_check_ins;r monitoring.assisted_check_in_revisions;body jsonb;new_state text;
BEGIN
 IF platform.current_member() IS NOT NULL THEN RAISE EXCEPTION 'Staff required' USING ERRCODE='P0002'; END IF;
 PERFORM monitoring.assisted_read(draft);
 SELECT * INTO STRICT d FROM monitoring.assisted_check_ins WHERE id=draft FOR UPDATE;
 IF d.version<>expected THEN RAISE EXCEPTION 'Draft changed' USING ERRCODE='P0412'; END IF;
 IF d.state<>'pending' THEN RAISE EXCEPTION 'Draft closed' USING ERRCODE='PA409'; END IF;
 SELECT * INTO STRICT r FROM monitoring.assisted_check_in_revisions WHERE draft_id=draft AND version=d.version;
 IF change='revise' THEN
  IF notice IS NULL OR length(btrim(notice)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Notice required' USING ERRCODE='23514'; END IF;
  body:=monitoring.assisted_content(data,(r.content->>'loanId')::uuid);new_state:='pending';
 ELSIF change='withdraw' THEN
  IF jsonb_typeof(data->'reason') IS DISTINCT FROM 'string' OR length(btrim(data->>'reason')) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Reason required' USING ERRCODE='23514'; END IF;
  body:=r.content;notice:=r.notice_version;new_state:='withdrawn';
 ELSE RAISE EXCEPTION 'Unsupported action' USING ERRCODE='23514'; END IF;
 UPDATE monitoring.assisted_check_ins SET version=version+1,state=new_state WHERE id=draft;
 INSERT INTO monitoring.assisted_check_in_revisions(organization_id,draft_id,version,state,content,notice_version,payload_sha256,staff_id,action_reason)
 VALUES(d.organization_id,draft,d.version+1,new_state,body,notice,encode(sha256(convert_to(jsonb_build_object('content',body,'noticeVersion',notice)::text,'UTF8')),'hex'),d.prepared_by,CASE WHEN change='withdraw' THEN data->>'reason' END);
 RETURN jsonb_build_object('id',draft,'version',d.version+1,'state',new_state,'resultingRequestId',NULL);
END $$;
CREATE FUNCTION monitoring.assisted_member_change(draft uuid,change text,expected bigint,payload_hash text,notice text,captured_position jsonb,correlation text,session_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE d monitoring.assisted_check_ins;r monitoring.assisted_check_in_revisions;request uuid;new_state text;event uuid:=gen_random_uuid();
BEGIN
 IF platform.current_member() IS NULL OR NOT identity.assert_member(session_id,NULLIF(current_setting('agap.member_link_id',true),'')::uuid,platform.current_organization(),platform.current_member()) THEN RAISE EXCEPTION 'Own member required' USING ERRCODE='P0002'; END IF;
 SELECT * INTO d FROM monitoring.assisted_check_ins WHERE id=draft AND organization_id=platform.current_organization() AND member_id=platform.current_member();
 IF d.id IS NULL THEN RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002'; END IF;
 -- Same authority -> source -> draft lock order as staff commands. Recheck after waiting.
 IF change='confirm' THEN
  PERFORM 1 FROM identity.staff_users WHERE id=d.prepared_by AND organization_id=d.organization_id FOR SHARE;
  PERFORM 1 FROM monitoring.requests WHERE id=d.source_request_id FOR SHARE;
 END IF;
 SELECT * INTO STRICT d FROM monitoring.assisted_check_ins WHERE id=draft AND organization_id=platform.current_organization() AND member_id=platform.current_member() FOR UPDATE;
 IF d.version<>expected THEN RAISE EXCEPTION 'Draft changed' USING ERRCODE='P0412'; END IF;
 IF d.state<>'pending' THEN RAISE EXCEPTION 'Draft closed' USING ERRCODE='PA409'; END IF;
 SELECT * INTO STRICT r FROM monitoring.assisted_check_in_revisions WHERE draft_id=draft AND version=d.version;
 IF change='confirm' THEN
  IF NOT monitoring.assisted_authorized(d.source_request_id,d.prepared_by,d.prepared_user_version,d.assignment_version) THEN RAISE EXCEPTION 'Staff review required' USING ERRCODE='PA409'; END IF;
  IF payload_hash IS DISTINCT FROM r.payload_sha256 OR notice IS DISTINCT FROM r.notice_version THEN RAISE EXCEPTION 'Review exact draft and notice' USING ERRCODE='PA409'; END IF;
  request:=monitoring.submit_support(r.content||jsonb_build_object('sharingConfirmed',true,'noticeVersion',notice),captured_position,correlation);new_state:='confirmed';
 ELSIF change='decline' THEN new_state:='declined';
 ELSE RAISE EXCEPTION 'Unsupported action' USING ERRCODE='23514'; END IF;
 UPDATE monitoring.assisted_check_ins SET version=version+1,state=new_state,resulting_request_id=request WHERE id=draft;
 INSERT INTO monitoring.assisted_check_in_revisions(organization_id,draft_id,version,state,content,notice_version,payload_sha256,member_id,member_link_id,member_session_id,confirmation_method,resulting_request_id)
 VALUES(d.organization_id,draft,d.version+1,new_state,r.content,r.notice_version,r.payload_sha256,platform.current_member(),NULLIF(current_setting('agap.member_link_id',true),'')::uuid,session_id,CASE WHEN change='confirm' THEN 'member_session' END,request);
 INSERT INTO portal.events(id,organization_id,member_id,link_id,event_type,aggregate_id,aggregate_version,correlation_id)
 VALUES(event,d.organization_id,platform.current_member(),NULLIF(current_setting('agap.member_link_id',true),'')::uuid,'support.assisted.'||new_state,draft,d.version+1,correlation);
 INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(event,d.organization_id,'support.assisted.'||new_state,jsonb_build_object('id',event,'type','support.assisted.'||new_state,'schemaVersion',1,'organizationId',d.organization_id,'aggregateId',draft,'aggregateVersion',d.version+1,'occurredAt',clock_timestamp(),'correlationId',correlation,'payload','{}'::jsonb));
 RETURN jsonb_build_object('id',draft,'version',d.version+1,'state',new_state,'resultingRequestId',request);
END $$;
REVOKE ALL ON FUNCTION monitoring.assisted_authorized(uuid,uuid,bigint,bigint),monitoring.assisted_visible(monitoring.assisted_check_ins),monitoring.assisted_identity_immutable(),monitoring.assisted_content(jsonb,uuid),monitoring.assisted_read(uuid),monitoring.assisted_list(uuid,uuid,integer),monitoring.assisted_prepare(uuid,jsonb,text,bigint),monitoring.assisted_staff_change(uuid,text,jsonb,text,bigint),monitoring.assisted_member_change(uuid,text,bigint,text,text,jsonb,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.assisted_read(uuid),monitoring.assisted_list(uuid,uuid,integer),monitoring.assisted_prepare(uuid,jsonb,text,bigint),monitoring.assisted_staff_change(uuid,text,jsonb,text,bigint),monitoring.assisted_member_change(uuid,text,bigint,text,text,jsonb,text,uuid) TO agap_runtime;
