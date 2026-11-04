-- One task per dated immutable response; later responses never erase commitments.
CREATE TABLE monitoring.follow_ups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, request_id uuid NOT NULL,
 source_action_id uuid NOT NULL UNIQUE REFERENCES monitoring.actions(id),
 UNIQUE(organization_id,id,request_id),
 FOREIGN KEY(organization_id,request_id) REFERENCES monitoring.requests(organization_id,id)
);
CREATE INDEX follow_up_queue ON monitoring.follow_ups(organization_id,id);
CREATE TABLE monitoring.follow_up_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, request_id uuid NOT NULL, follow_up_id uuid NOT NULL,
 version bigint NOT NULL CHECK(version BETWEEN 1 AND 9007199254740991),
 kind text NOT NULL CHECK(kind IN ('scheduled','rescheduled','completed')),
 due_date date NOT NULL, status text NOT NULL CHECK(status IN ('open','completed')),
 note text CHECK(note IS NULL OR length(btrim(note)) BETWEEN 1 AND 2000),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(), recorded_by uuid NOT NULL,
 UNIQUE(follow_up_id,version),
 CHECK((kind='scheduled' AND version=1 AND note IS NULL AND status='open') OR (kind='rescheduled' AND version>1 AND note IS NOT NULL AND status='open') OR (kind='completed' AND version>1 AND note IS NOT NULL AND status='completed')),
 FOREIGN KEY(organization_id,follow_up_id,request_id) REFERENCES monitoring.follow_ups(organization_id,id,request_id),
 FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['follow_ups','follow_up_events'] LOOP
  EXECUTE format('ALTER TABLE monitoring.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE monitoring.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY follow_up_scope ON monitoring.%I USING(platform.current_member() IS NULL AND organization_id=platform.current_organization() AND monitoring.can_read(request_id,true))',t);
  EXECUTE format('CREATE TRIGGER immutable_follow_up BEFORE UPDATE OR DELETE ON monitoring.%I FOR EACH ROW EXECUTE FUNCTION monitoring.immutable_evidence()',t);
 END LOOP;
END $$;

-- Existing dates have no recorded completion evidence. Retain each source date.
INSERT INTO monitoring.follow_ups(organization_id,request_id,source_action_id)
SELECT organization_id,request_id,id FROM monitoring.actions WHERE follow_up_date IS NOT NULL;
INSERT INTO monitoring.follow_up_events(organization_id,request_id,follow_up_id,version,kind,due_date,status,recorded_at,recorded_by)
SELECT t.organization_id,t.request_id,t.id,1,'scheduled',a.follow_up_date,'open',a.recorded_at,a.recorded_by
FROM monitoring.follow_ups t JOIN monitoring.actions a ON a.id=t.source_action_id;

CREATE FUNCTION monitoring.schedule_response_follow_up() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE task uuid;
BEGIN
 IF NEW.follow_up_date IS NOT NULL THEN
  INSERT INTO monitoring.follow_ups(organization_id,request_id,source_action_id) VALUES(NEW.organization_id,NEW.request_id,NEW.id) RETURNING id INTO task;
  INSERT INTO monitoring.follow_up_events(organization_id,request_id,follow_up_id,version,kind,due_date,status,recorded_at,recorded_by)
  VALUES(NEW.organization_id,NEW.request_id,task,1,'scheduled',NEW.follow_up_date,'open',NEW.recorded_at,NEW.recorded_by);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION monitoring.schedule_response_follow_up() FROM PUBLIC;
CREATE TRIGGER response_follow_up AFTER INSERT ON monitoring.actions FOR EACH ROW EXECUTE FUNCTION monitoring.schedule_response_follow_up();

CREATE VIEW monitoring.staff_follow_ups WITH(security_barrier=true) AS
SELECT t.*,r.member_id,r.branch_id,r.assigned_officer_id,a.version AS source_action_version,a.recorded_at AS source_recorded_at,
 a.follow_up_date AS original_date,e.version,e.status,e.due_date,e.recorded_at,e.recorded_by,
 CASE WHEN e.status='completed' THEN e.recorded_at ELSE NULL END AS completed_at
FROM monitoring.follow_ups t JOIN monitoring.requests r ON r.id=t.request_id JOIN monitoring.actions a ON a.id=t.source_action_id
JOIN LATERAL(SELECT * FROM monitoring.follow_up_events WHERE follow_up_id=t.id ORDER BY version DESC LIMIT 1)e ON true
WHERE platform.current_member() IS NULL AND t.organization_id=platform.current_organization() AND monitoring.can_read(t.request_id,true);
CREATE VIEW monitoring.staff_follow_up_events WITH(security_barrier=true) AS
SELECT * FROM monitoring.follow_up_events WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND monitoring.can_read(request_id,true);
GRANT SELECT ON monitoring.staff_follow_ups,monitoring.staff_follow_up_events TO agap_runtime;

CREATE FUNCTION monitoring.transition_follow_up(task uuid, change text, new_date date, reason text, expected bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE request uuid; current_event monitoring.follow_up_events;
BEGIN
 SELECT request_id INTO request FROM monitoring.follow_ups WHERE id=task AND organization_id=platform.current_organization();
 IF request IS NULL THEN RAISE EXCEPTION 'Follow-up unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM monitoring.lock_disclosure(request,true);
 PERFORM id FROM monitoring.follow_ups WHERE id=task FOR UPDATE;
 SELECT * INTO STRICT current_event FROM monitoring.follow_up_events WHERE follow_up_id=task ORDER BY version DESC LIMIT 1;
 IF expected IS NULL OR current_event.version<>expected THEN RAISE EXCEPTION 'Follow-up changed' USING ERRCODE='P0412'; END IF;
 IF current_event.status='completed' THEN RAISE EXCEPTION 'Follow-up already completed' USING ERRCODE='P0409'; END IF;
 IF reason IS NULL OR length(btrim(reason)) NOT BETWEEN 1 AND 2000 OR change IS NULL OR change NOT IN ('completed','rescheduled') THEN RAISE EXCEPTION 'Invalid follow-up action' USING ERRCODE='23514'; END IF;
 IF change='rescheduled' AND (new_date IS NULL OR new_date<(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date OR new_date=current_event.due_date) THEN
  RAISE EXCEPTION 'Choose a different date today or later' USING ERRCODE='23514';
 END IF;
 INSERT INTO monitoring.follow_up_events(organization_id,request_id,follow_up_id,version,kind,due_date,status,note,recorded_by)
 VALUES(platform.current_organization(),request,task,current_event.version+1,change,CASE WHEN change='rescheduled' THEN new_date ELSE current_event.due_date END,
 CASE WHEN change='completed' THEN 'completed' ELSE 'open' END,btrim(reason),NULLIF(current_setting('agap.user_id',true),'')::uuid);
 RETURN current_event.version+1;
END $$;
REVOKE ALL ON FUNCTION monitoring.transition_follow_up(uuid,text,date,text,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.transition_follow_up(uuid,text,date,text,bigint) TO agap_runtime;
