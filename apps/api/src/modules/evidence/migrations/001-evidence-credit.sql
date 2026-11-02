CREATE SCHEMA evidence;
CREATE SCHEMA credit;
REVOKE ALL ON SCHEMA evidence,credit FROM PUBLIC;
GRANT USAGE ON SCHEMA evidence,credit TO agap_runtime,agap_worker;
GRANT EXECUTE ON FUNCTION platform.current_member(),platform.allowed_branch(uuid) TO agap_worker;

CREATE FUNCTION evidence.can_access(app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization() AND
  (pg_has_role(session_user,'agap_worker','MEMBER') OR
   (platform.current_member()=a.member_id AND EXISTS(SELECT 1 FROM identity.member_links l WHERE l.id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid AND l.organization_id=a.organization_id AND l.member_id=a.member_id AND l.active)) OR
   (platform.current_member() IS NULL AND platform.allowed_branch(a.branch_id) AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.organization_id=a.organization_id AND u.active AND u.roles && ARRAY['officer','verifier','reviewer','auditor','administrator']::text[]))))
$$;
REVOKE ALL ON FUNCTION evidence.can_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.can_access(uuid) TO agap_runtime,agap_worker;
CREATE TABLE evidence.sources (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL,
 version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
 kind text NOT NULL CHECK(kind IN ('document','statement')), label text NOT NULL, source_date date NOT NULL,
 object_key text, sha256 text, media_type text, size bigint, statement text, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,id), UNIQUE(organization_id,application_id,id), FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 CHECK((kind='document' AND object_key IS NOT NULL AND sha256 ~ '^[a-f0-9]{64}$' AND media_type IN ('application/pdf','image/jpeg','image/png') AND size BETWEEN 1 AND 10485760 AND statement IS NULL)
    OR (kind='statement' AND object_key IS NULL AND sha256 IS NULL AND media_type IS NULL AND size IS NULL AND length(statement) BETWEEN 1 AND 2000))
);
CREATE TABLE evidence.processing (
 organization_id uuid NOT NULL, source_id uuid PRIMARY KEY, application_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('quarantined','cleared','blocked')), stage text NOT NULL CHECK(stage IN ('queued','scanning','extracting','ai','available','failed','manual')),
 pages jsonb NOT NULL DEFAULT '[]', text_sha256 text, message text,
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id)
);
CREATE TABLE evidence.facts (
 organization_id uuid NOT NULL, application_id uuid NOT NULL, id uuid NOT NULL, revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9007199254740991),
 source_id uuid NOT NULL, body jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,id,revision), FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id),
 CHECK((body->>'id')::uuid=id AND (body->>'revision')::bigint=revision AND (body->>'sourceId')::uuid=source_id)
);
CREATE TABLE evidence.verifications (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, source_id uuid NOT NULL,
 body jsonb NOT NULL, recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id)
);
CREATE TABLE evidence.drafts (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, source_id uuid NOT NULL,
 body jsonb NOT NULL, text_sha256 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id), UNIQUE(organization_id,id), UNIQUE(organization_id,application_id,id)
);
CREATE TABLE evidence.draft_reviews (
 organization_id uuid NOT NULL, application_id uuid NOT NULL, draft_id uuid PRIMARY KEY,
 state text NOT NULL CHECK(state IN ('accepted','rejected')), reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,application_id,draft_id) REFERENCES evidence.drafts(organization_id,application_id,id)
);
CREATE TABLE credit.policies (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), body jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now(), CHECK((body->>'id')::uuid=id)
);
CREATE TABLE credit.assessments (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, body jsonb NOT NULL, input_snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id)
);
CREATE FUNCTION evidence.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
 BEGIN RAISE EXCEPTION 'Evidence and assessment history is immutable' USING ERRCODE='23514'; END $$;
REVOKE ALL ON FUNCTION evidence.immutable() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sources','facts','verifications','drafts','draft_reviews'] LOOP
  EXECUTE format('ALTER TABLE evidence.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE evidence.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('CREATE POLICY scoped ON evidence.%I USING(organization_id=platform.current_organization() AND evidence.can_access(application_id)) WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id))',t);
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON evidence.%I FOR EACH ROW EXECUTE FUNCTION evidence.immutable()',t);
 END LOOP;
END $$;
ALTER TABLE evidence.processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.processing FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON evidence.processing USING(organization_id=platform.current_organization() AND evidence.can_access(application_id)) WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id));
ALTER TABLE credit.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.policies FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON credit.policies USING(organization_id=platform.current_organization());
ALTER TABLE credit.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit.assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON credit.assessments USING(organization_id=platform.current_organization() AND evidence.can_access(application_id)) WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id));
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON credit.policies FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON credit.assessments FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
CREATE VIEW credit.assessment_views WITH(security_barrier=true) AS SELECT id,organization_id,application_id,body,created_at FROM credit.assessments WHERE organization_id=platform.current_organization() AND evidence.can_access(application_id);
GRANT SELECT,INSERT ON evidence.sources,evidence.facts,evidence.draft_reviews TO agap_runtime;
GRANT INSERT ON evidence.verifications TO agap_runtime;
CREATE VIEW evidence.verification_outcomes WITH(security_barrier=true) AS SELECT id,organization_id,application_id,source_id,body->>'outcome' AS outcome,recorded_at FROM evidence.verifications WHERE organization_id=platform.current_organization() AND evidence.can_access(application_id);
CREATE VIEW evidence.staff_verifications WITH(security_barrier=true) AS SELECT * FROM evidence.verifications WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND evidence.can_access(application_id);
GRANT SELECT ON evidence.verification_outcomes,evidence.staff_verifications TO agap_runtime;
GRANT SELECT ON evidence.processing,evidence.drafts,credit.policies,credit.assessment_views TO agap_runtime;
GRANT INSERT ON credit.assessments TO agap_runtime;
GRANT INSERT ON evidence.processing TO agap_runtime;
GRANT SELECT ON evidence.sources TO agap_worker;
GRANT SELECT,UPDATE ON evidence.processing TO agap_worker;
GRANT SELECT,INSERT ON evidence.drafts TO agap_worker;

-- Narrow bridge: members cannot insert arbitrary staff queue/audit records.
CREATE FUNCTION evidence.enqueue(source uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE s evidence.sources;
 BEGIN
  SELECT * INTO s FROM evidence.sources WHERE id=source AND organization_id=platform.current_organization();
  IF s.id IS NULL OR NOT evidence.can_access(s.application_id) OR s.kind<>'document' THEN RAISE EXCEPTION 'Source unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO platform.jobs(id,organization_id,kind,payload) VALUES(s.id,s.organization_id,'evidence.process',jsonb_build_object('sourceId',s.id)) ON CONFLICT(id) DO NOTHING;
 END $$;
REVOKE ALL ON FUNCTION evidence.enqueue(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.enqueue(uuid) TO agap_runtime;

CREATE FUNCTION evidence.advance(app uuid,expected bigint,action text) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE a applications.applications; uid uuid:=NULLIF(current_setting('agap.user_id',true),'')::uuid; member uuid:=platform.current_member(); roles text[]; material boolean:=action IN ('fact','verification');
 BEGIN
  IF NOT evidence.can_access(app) OR action NOT IN ('fact','verification','assessment','assessment_complete','upload') THEN RAISE EXCEPTION 'Application unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO a FROM applications.applications WHERE id=app AND organization_id=platform.current_organization() FOR UPDATE;
  IF member IS NOT NULL THEN
   IF member<>a.member_id OR action NOT IN ('fact','upload') THEN RAISE EXCEPTION 'Member operation forbidden' USING ERRCODE='42501'; END IF;
  ELSE
   SELECT u.roles INTO roles FROM identity.staff_users u WHERE u.id=uid AND u.organization_id=a.organization_id AND u.active;
   IF action='verification' THEN
    IF NOT ('verifier'=ANY(roles)) THEN RAISE EXCEPTION 'Verifier required' USING ERRCODE='42501'; END IF;
   ELSIF NOT ('officer'=ANY(roles)) OR a.assigned_officer_id IS DISTINCT FROM uid THEN RAISE EXCEPTION 'Assigned officer required' USING ERRCODE='42501'; END IF;
  END IF;
  IF expected IS NOT NULL AND a.version<>expected THEN RAISE EXCEPTION 'Application changed' USING ERRCODE='AG412'; END IF;
  IF a.status='decision_recorded' THEN RAISE EXCEPTION 'Recorded decisions require a separate review workflow' USING ERRCODE='AG409'; END IF;
  UPDATE applications.applications SET version=version+1,assessment_input_version=assessment_input_version+CASE WHEN material THEN 1 ELSE 0 END,
    status=CASE WHEN action='assessment_complete' THEN 'assessment_ready' WHEN material AND status<>'draft' THEN 'evidence_review' ELSE status END,updated_at=now()
    WHERE id=app AND organization_id=a.organization_id RETURNING * INTO a;
  INSERT INTO applications.application_revisions(id,organization_id,application_id,version,snapshot,recorded_by,recorded_member_id)
    VALUES(gen_random_uuid(),a.organization_id,a.id,a.version,to_jsonb(a),uid,member);
  RETURN a.version;
 END $$;
REVOKE ALL ON FUNCTION evidence.advance(uuid,bigint,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.advance(uuid,bigint,text) TO agap_runtime;
ALTER TABLE platform.jobs ADD COLUMN lease_token uuid;
ALTER TABLE platform.jobs ADD COLUMN lease_until timestamptz;

CREATE TABLE evidence.upload_intents (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, scope text NOT NULL,
 request_hash text NOT NULL, object_key uuid NOT NULL, source_id uuid NOT NULL, metadata jsonb NOT NULL,
 completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,scope), FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id)
);
ALTER TABLE evidence.upload_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.upload_intents FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON evidence.upload_intents USING(organization_id=platform.current_organization() AND evidence.can_access(application_id)) WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id));
GRANT SELECT,INSERT,UPDATE ON evidence.upload_intents TO agap_runtime;
