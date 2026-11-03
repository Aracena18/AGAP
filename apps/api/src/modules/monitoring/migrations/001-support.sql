CREATE SCHEMA monitoring;
REVOKE ALL ON SCHEMA monitoring FROM PUBLIC;
GRANT USAGE ON SCHEMA monitoring TO agap_runtime;
CREATE FUNCTION monitoring.staff_role(wanted text, branch uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT platform.current_member() IS NULL AND platform.allowed_branch(branch) AND EXISTS(SELECT 1 FROM identity.staff_users u
 WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=platform.current_organization() AND u.active AND wanted=ANY(u.roles) AND branch=ANY(u.branch_ids))
$$;
REVOKE ALL ON FUNCTION monitoring.staff_role(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.staff_role(text,uuid) TO agap_runtime;
CREATE TABLE monitoring.requests (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, member_id uuid NOT NULL, branch_id uuid NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT clock_timestamp(), status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','assigned','reviewed')),
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991), assigned_officer_id uuid,
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,branch_id,member_id) REFERENCES members.members(organization_id,branch_id,id),
 FOREIGN KEY(organization_id,assigned_officer_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE INDEX support_queue_page ON monitoring.requests(organization_id,id);
CREATE TABLE monitoring.disclosures (
 request_id uuid PRIMARY KEY REFERENCES monitoring.requests(id), organization_id uuid NOT NULL,
 message text NOT NULL CHECK(length(btrim(message)) BETWEEN 1 AND 2000), contact_preference text NOT NULL CHECK(contact_preference IN ('portal','phone')),
 notice_version text NOT NULL CHECK(length(btrim(notice_version)) BETWEEN 1 AND 2000), shared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 loan_id uuid, check_in jsonb NOT NULL CHECK(jsonb_typeof(check_in)='object'), position jsonb,
 FOREIGN KEY(organization_id,request_id) REFERENCES monitoring.requests(organization_id,id)
);
CREATE TABLE monitoring.assignments (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, request_id uuid NOT NULL, version bigint NOT NULL,
 officer_id uuid NOT NULL, assigned_by uuid NOT NULL, reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000), recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(request_id,version), FOREIGN KEY(organization_id,request_id) REFERENCES monitoring.requests(organization_id,id),
 FOREIGN KEY(organization_id,officer_id) REFERENCES identity.staff_users(organization_id,id), FOREIGN KEY(organization_id,assigned_by) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE monitoring.actions (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, request_id uuid NOT NULL, version bigint NOT NULL,
 recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), response text NOT NULL CHECK(length(btrim(response)) BETWEEN 1 AND 2000),
 internal_note text NOT NULL CHECK(length(btrim(internal_note)) BETWEEN 1 AND 2000), follow_up_date date,
 UNIQUE(request_id,version), FOREIGN KEY(organization_id,request_id) REFERENCES monitoring.requests(organization_id,id), FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id)
);
CREATE FUNCTION monitoring.can_read(request uuid, disclosure boolean) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM monitoring.requests r WHERE r.id=request AND r.organization_id=platform.current_organization() AND
 (r.member_id=platform.current_member() OR (monitoring.staff_role('officer',r.branch_id) AND r.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid)
 OR (NOT disclosure AND monitoring.staff_role('administrator',r.branch_id))))
$$;
-- requests policies avoid recursively invoking can_read on the same table.
ALTER TABLE monitoring.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring.requests FORCE ROW LEVEL SECURITY;
CREATE POLICY request_scope ON monitoring.requests USING(organization_id=platform.current_organization() AND (member_id=platform.current_member()
 OR monitoring.staff_role('administrator',branch_id) OR (monitoring.staff_role('officer',branch_id) AND assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid)));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['disclosures','assignments','actions'] LOOP
  EXECUTE format('ALTER TABLE monitoring.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE monitoring.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY support_scope ON monitoring.%I USING(organization_id=platform.current_organization() AND monitoring.can_read(request_id,%L))',t,t<>'assignments');
 END LOOP;
END $$;
CREATE VIEW monitoring.staff_disclosures WITH(security_barrier=true) AS SELECT * FROM monitoring.disclosures WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND monitoring.can_read(request_id,true);
CREATE VIEW monitoring.staff_actions WITH(security_barrier=true) AS SELECT * FROM monitoring.actions WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND monitoring.can_read(request_id,true);
CREATE VIEW monitoring.member_history WITH(security_barrier=true) AS SELECT r.id,r.submitted_at,r.status,d.message,
 (SELECT a.response FROM monitoring.actions a WHERE a.request_id=r.id ORDER BY a.version DESC LIMIT 1) AS response
 FROM monitoring.requests r JOIN monitoring.disclosures d ON d.request_id=r.id WHERE r.member_id=platform.current_member() AND r.organization_id=platform.current_organization();
GRANT SELECT ON monitoring.requests,monitoring.staff_disclosures,monitoring.staff_actions,monitoring.member_history TO agap_runtime;
CREATE FUNCTION monitoring.immutable_evidence() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Support evidence is append-only' USING ERRCODE='42501'; END $$;
CREATE TRIGGER immutable_disclosure BEFORE UPDATE OR DELETE ON monitoring.disclosures FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence();
CREATE TRIGGER immutable_assignment BEFORE UPDATE OR DELETE ON monitoring.assignments FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence();
CREATE TRIGGER immutable_action BEFORE UPDATE OR DELETE ON monitoring.actions FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence();
CREATE FUNCTION monitoring.submit_support(data jsonb, captured_position jsonb, correlation text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=platform.current_member(); org uuid:=platform.current_organization(); branch uuid; request uuid:=gen_random_uuid(); event uuid:=gen_random_uuid();
BEGIN
 IF member IS NULL OR data->>'sharingConfirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Confirmed member sharing required' USING ERRCODE='42501'; END IF;
 SELECT branch_id INTO STRICT branch FROM members.members WHERE id=member AND organization_id=org;
 IF captured_position IS NOT NULL AND captured_position->>'loanId' IS DISTINCT FROM data->>'loanId' THEN RAISE EXCEPTION 'Position does not match loan' USING ERRCODE='23514'; END IF;
 INSERT INTO monitoring.requests(id,organization_id,member_id,branch_id) VALUES(request,org,member,branch);
 INSERT INTO monitoring.disclosures(request_id,organization_id,message,contact_preference,notice_version,loan_id,check_in,position)
 VALUES(request,org,data->>'message',data->>'contactPreference',data->>'noticeVersion',(data->>'loanId')::uuid,
 COALESCE(data->'checkIn','{"canMeetEssentials":"unavailable","borrowedToRepay":"unavailable","financialStrain":"unavailable"}'::jsonb),captured_position);
 INSERT INTO portal.events(id,organization_id,member_id,link_id,event_type,aggregate_id,aggregate_version,correlation_id)
 VALUES(event,org,member,NULLIF(current_setting('agap.member_link_id',true),'')::uuid,'support.submitted',request,1,correlation);
 INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(event,org,'support.submitted',jsonb_build_object('id',event,'type','support.submitted','schemaVersion',1,'organizationId',org,'aggregateId',request,'aggregateVersion',1,'occurredAt',clock_timestamp(),'correlationId',correlation,'payload','{}'::jsonb));
 RETURN request;
END $$;
CREATE FUNCTION monitoring.assign_support(request uuid, officer uuid, reason text, expected bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r monitoring.requests;
BEGIN
 SELECT * INTO STRICT r FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization() FOR UPDATE;
 IF NOT monitoring.staff_role('administrator',r.branch_id) THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF r.version<>expected THEN RAISE EXCEPTION 'Support request changed' USING ERRCODE='P0412'; END IF;
 IF NOT identity.assignable_officer(r.organization_id,officer,r.branch_id) THEN RAISE EXCEPTION 'Officer unavailable' USING ERRCODE='23514'; END IF;
 UPDATE monitoring.requests SET assigned_officer_id=officer,status='assigned',version=version+1 WHERE id=request;
 INSERT INTO monitoring.assignments(id,organization_id,request_id,version,officer_id,assigned_by,reason) VALUES(gen_random_uuid(),r.organization_id,request,r.version+1,officer,NULLIF(current_setting('agap.user_id',true),'')::uuid,reason);
END $$;
CREATE FUNCTION monitoring.respond_support(request uuid, data jsonb, expected bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r monitoring.requests;
BEGIN
 SELECT * INTO STRICT r FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization() FOR UPDATE;
 IF NOT monitoring.staff_role('officer',r.branch_id) OR r.assigned_officer_id IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN RAISE EXCEPTION 'Assigned officer required' USING ERRCODE='42501'; END IF;
 IF r.version<>expected THEN RAISE EXCEPTION 'Support request changed' USING ERRCODE='P0412'; END IF;
 INSERT INTO monitoring.actions(id,organization_id,request_id,version,recorded_by,response,internal_note,follow_up_date)
 VALUES(gen_random_uuid(),r.organization_id,request,r.version+1,r.assigned_officer_id,data->>'response',data->>'internalNote',(data->>'followUpDate')::date);
 UPDATE monitoring.requests SET status='reviewed',version=version+1 WHERE id=request;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA monitoring FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.staff_role(text,uuid),monitoring.can_read(uuid,boolean),monitoring.submit_support(jsonb,jsonb,text),monitoring.assign_support(uuid,uuid,text,bigint),monitoring.respond_support(uuid,jsonb,bigint) TO agap_runtime;
