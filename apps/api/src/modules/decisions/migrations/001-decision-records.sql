CREATE SCHEMA decisions;
REVOKE ALL ON SCHEMA decisions FROM PUBLIC;
GRANT USAGE ON SCHEMA decisions TO agap_runtime;

CREATE FUNCTION decisions.staff_role(wanted text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
  SELECT platform.current_member() IS NULL AND EXISTS (
    SELECT 1 FROM identity.staff_users u WHERE u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid
    AND u.organization_id=platform.current_organization() AND u.active AND wanted=ANY(u.roles))
$$;
REVOKE ALL ON FUNCTION decisions.staff_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.staff_role(text) TO agap_runtime;

CREATE TABLE decisions.streams (
  organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL, member_id uuid NOT NULL,
  revision bigint NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 9007199254740991),
  recommendation_id uuid, decision_id uuid,
  PRIMARY KEY(organization_id,application_id),
  FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
  FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE TABLE decisions.recommendations (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL,
  prepared_by uuid NOT NULL, body jsonb NOT NULL,
  UNIQUE(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id) REFERENCES decisions.streams,
  FOREIGN KEY(organization_id,prepared_by) REFERENCES identity.staff_users(organization_id,id),
  CHECK((body->>'id')::uuid=id AND (body->>'applicationId')::uuid=application_id AND (body->>'preparedBy')::uuid=prepared_by)
);
CREATE TABLE decisions.previews (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL,
  reviewer_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
  application_version bigint NOT NULL CHECK(application_version BETWEEN 1 AND 9007199254740991),
  decision_id uuid NOT NULL UNIQUE, basis_hash text NOT NULL CHECK(basis_hash ~ '^[a-f0-9]{64}$'),
  request jsonb NOT NULL, explanation jsonb NOT NULL,
  document_id uuid, terms_text text, CHECK((document_id IS NULL)=(terms_text IS NULL)),
  CHECK(terms_text IS NULL OR octet_length(terms_text) BETWEEN 1 AND 65536),
  CHECK(expires_at>created_at), UNIQUE(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id) REFERENCES decisions.streams,
  FOREIGN KEY(organization_id,reviewer_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE decisions.records (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL, member_id uuid NOT NULL,
  reviewer_id uuid NOT NULL, recommendation_id uuid,
  preview_id uuid NOT NULL UNIQUE, document_id uuid,
  outcome text NOT NULL CHECK(outcome IN ('approve','decline','return')),
  input_version bigint NOT NULL CHECK(input_version BETWEEN 1 AND 9007199254740991),
  basis_hash text NOT NULL CHECK(basis_hash ~ '^[a-f0-9]{64}$'),
  snapshot_format text NOT NULL CHECK(snapshot_format='decision-snapshot-v1'),
  snapshot_text text NOT NULL, snapshot jsonb GENERATED ALWAYS AS (snapshot_text::jsonb) STORED,
  snapshot_hash text NOT NULL CHECK(snapshot_hash ~ '^[a-f0-9]{64}$'),
  member_view jsonb NOT NULL, recorded_at timestamptz NOT NULL,
  UNIQUE(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id) REFERENCES decisions.streams,
  FOREIGN KEY(organization_id,reviewer_id) REFERENCES identity.staff_users(organization_id,id),
  FOREIGN KEY(organization_id,application_id,recommendation_id) REFERENCES decisions.recommendations(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id,preview_id) REFERENCES decisions.previews(organization_id,application_id,id),
  CHECK((outcome='approve')=(document_id IS NOT NULL)),
  CHECK(encode(sha256(convert_to(snapshot_text,'UTF8')),'hex')=snapshot_hash),
  CHECK((snapshot->>'id')::uuid=id AND (snapshot->>'reviewerId')::uuid=reviewer_id),
  CHECK(snapshot#>>'{input,outcome}'=outcome),
  CHECK((snapshot#>>'{basis,application,id}')::uuid=application_id
    AND (snapshot#>>'{basis,application,organizationId}')::uuid=organization_id
    AND (snapshot#>>'{basis,application,memberId}')::uuid=member_id
    AND (snapshot#>>'{basis,application,branchId}')::uuid=branch_id),
  CHECK((snapshot#>>'{basis,application,assessmentInputVersion}')::bigint=input_version),
  CHECK(reviewer_id IS DISTINCT FROM (snapshot#>>'{basis,application,assignedOfficerId}')::uuid),
  CHECK(reviewer_id IS DISTINCT FROM (snapshot#>>'{basis,recommendation,preparedBy}')::uuid),
  CHECK((member_view->>'id')::uuid=id AND member_view->>'outcome'=outcome)
);
CREATE TABLE decisions.documents (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL,
  decision_id uuid NOT NULL UNIQUE, bytes bytea NOT NULL CHECK(octet_length(bytes) BETWEEN 1 AND 65536),
  sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'), media_type text NOT NULL CHECK(media_type='text/plain; charset=utf-8'),
  UNIQUE(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id,decision_id) REFERENCES decisions.records(organization_id,application_id,id),
  CHECK(encode(pg_catalog.sha256(bytes),'hex')=sha256)
);
CREATE TABLE decisions.acceptances (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, branch_id uuid NOT NULL,
  member_id uuid NOT NULL, link_id uuid NOT NULL, decision_id uuid NOT NULL, document_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,decision_id,member_id),
  FOREIGN KEY(organization_id,application_id,decision_id) REFERENCES decisions.records(organization_id,application_id,id),
  FOREIGN KEY(organization_id,application_id,document_id) REFERENCES decisions.documents(organization_id,application_id,id),
  FOREIGN KEY(organization_id,link_id) REFERENCES identity.member_links(organization_id,id)
);
ALTER TABLE decisions.streams ADD FOREIGN KEY(organization_id,application_id,recommendation_id)
  REFERENCES decisions.recommendations(organization_id,application_id,id);
ALTER TABLE decisions.streams ADD FOREIGN KEY(organization_id,application_id,decision_id)
  REFERENCES decisions.records(organization_id,application_id,id);

CREATE FUNCTION decisions.immutable_record() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'Decision history is immutable' USING ERRCODE='23514'; END $$;
CREATE FUNCTION decisions.require_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.outcome='approve' AND NOT EXISTS (
    SELECT 1 FROM decisions.documents d WHERE d.organization_id=NEW.organization_id AND d.application_id=NEW.application_id
    AND d.id=NEW.document_id AND d.decision_id=NEW.id
    AND d.sha256=NEW.snapshot#>>'{document,sha256}'
    AND (NEW.snapshot#>>'{document,id}')::uuid=d.id) THEN
    RAISE EXCEPTION 'Exact approval document is required' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER decision_document AFTER INSERT ON decisions.records DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION decisions.require_document();

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['streams','recommendations','previews','records','documents','acceptances'] LOOP
    EXECUTE format('ALTER TABLE decisions.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE decisions.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY staff_scope ON decisions.%I USING(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) WITH CHECK(organization_id=platform.current_organization() AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id))',t);
    IF t<>'streams' THEN
      EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON decisions.%I FOR EACH ROW EXECUTE FUNCTION decisions.immutable_record()',t);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA decisions FROM PUBLIC,agap_runtime;
GRANT SELECT ON decisions.recommendations,decisions.previews TO agap_runtime;
GRANT INSERT ON decisions.recommendations,decisions.previews,decisions.records,decisions.documents TO agap_runtime;
CREATE POLICY recommendation_writer ON decisions.recommendations AS RESTRICTIVE FOR INSERT WITH CHECK(
  decisions.staff_role('officer') AND prepared_by=NULLIF(current_setting('agap.user_id',true),'')::uuid);
CREATE POLICY preview_writer ON decisions.previews AS RESTRICTIVE FOR INSERT WITH CHECK(
  decisions.staff_role('reviewer') AND reviewer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid);
CREATE POLICY record_writer ON decisions.records AS RESTRICTIVE FOR INSERT WITH CHECK(
  decisions.staff_role('reviewer') AND reviewer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid);
CREATE POLICY document_writer ON decisions.documents AS RESTRICTIVE FOR INSERT WITH CHECK(decisions.staff_role('reviewer'));

-- Member-scoped base policies let non-superuser definer owners obey FORCE RLS.
-- Runtime gets no SELECT/write privilege on these base tables. Staff access is
-- through filtered views/functions; members receive only bounded projections.
CREATE POLICY member_record_scope ON decisions.records USING(organization_id=platform.current_organization() AND member_id=platform.current_member());
CREATE POLICY member_stream_scope ON decisions.streams USING(organization_id=platform.current_organization() AND member_id=platform.current_member());
CREATE POLICY member_acceptance_scope ON decisions.acceptances USING(organization_id=platform.current_organization() AND member_id=platform.current_member());
CREATE POLICY member_document_scope ON decisions.documents USING(organization_id=platform.current_organization() AND EXISTS(
  SELECT 1 FROM decisions.records r WHERE r.organization_id=documents.organization_id AND r.id=documents.decision_id AND r.member_id=platform.current_member()));
CREATE VIEW decisions.staff_records WITH(security_barrier=true) AS SELECT * FROM decisions.records
  WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id)
  AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'));
CREATE VIEW decisions.staff_documents WITH(security_barrier=true) AS SELECT * FROM decisions.documents
  WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id)
  AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'));
CREATE VIEW decisions.staff_acceptances WITH(security_barrier=true) AS SELECT * FROM decisions.acceptances
  WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id)
  AND (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor'));
GRANT SELECT ON decisions.staff_records,decisions.staff_documents,decisions.staff_acceptances TO agap_runtime;

CREATE FUNCTION decisions.staff_lock(app uuid, branch uuid, member uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result decisions.streams%ROWTYPE; org uuid:=platform.current_organization();
BEGIN
  IF NOT (decisions.staff_role('officer') OR decisions.staff_role('reviewer')) OR NOT platform.allowed_branch(branch) THEN
    RAISE EXCEPTION 'Decision writer required' USING ERRCODE='AG403'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('decision:'||org::text||':'||app::text,0));
  INSERT INTO decisions.streams(organization_id,application_id,branch_id,member_id) VALUES(org,app,branch,member) ON CONFLICT DO NOTHING;
  SELECT * INTO result FROM decisions.streams WHERE organization_id=org AND application_id=app FOR UPDATE;
  IF NOT FOUND OR result.branch_id<>branch OR result.member_id<>member THEN RAISE EXCEPTION 'Decision scope mismatch' USING ERRCODE='AG403'; END IF;
  RETURN to_jsonb(result);
END $$;
CREATE FUNCTION decisions.staff_advance(app uuid, expected bigint, recommendation uuid, decision uuid) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result bigint; org uuid:=platform.current_organization();
BEGIN
  IF NOT (decisions.staff_role('officer') OR decisions.staff_role('reviewer')) THEN RAISE EXCEPTION 'Decision writer required' USING ERRCODE='AG403'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('decision:'||org::text||':'||app::text,0));
  UPDATE decisions.streams SET revision=revision+1,recommendation_id=recommendation,decision_id=decision
    WHERE organization_id=org AND application_id=app AND revision=expected AND platform.allowed_branch(branch_id) RETURNING revision INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Decision stream changed' USING ERRCODE='AG409'; END IF;
  RETURN result;
END $$;

CREATE FUNCTION decisions.member_scope() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=platform.current_member(); link uuid:=NULLIF(current_setting('agap.member_link_id',true),'')::uuid;
BEGIN
  IF member IS NULL OR NOT EXISTS(SELECT 1 FROM identity.member_links l WHERE l.id=link AND l.organization_id=platform.current_organization()
    AND l.member_id=member AND l.active) THEN RAISE EXCEPTION 'Member access required' USING ERRCODE='AG403'; END IF;
  RETURN member;
END $$;

-- Bounded member projection: never exposes original staff snapshots/sources/authority.
CREATE FUNCTION decisions.member_current(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=decisions.member_scope(); record decisions.records%ROWTYPE; stream decisions.streams%ROWTYPE;
BEGIN
  SELECT * INTO stream FROM decisions.streams WHERE organization_id=platform.current_organization() AND application_id=app AND member_id=member;
  IF NOT FOUND OR stream.decision_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO record FROM decisions.records WHERE organization_id=stream.organization_id AND id=stream.decision_id;
  RETURN jsonb_build_object('view',record.member_view||jsonb_build_object('accepted',EXISTS(SELECT 1 FROM decisions.acceptances a WHERE a.organization_id=stream.organization_id AND a.decision_id=record.id)),
    'basisHash',record.basis_hash,'inputVersion',record.input_version,'recommendationId',record.recommendation_id,'snapshotHash',record.snapshot_hash);
END $$;

CREATE FUNCTION decisions.accept_member(app uuid, decision uuid, document uuid, input_version bigint, material_hash text,
  recommendation uuid, participants_clear boolean) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=decisions.member_scope(); stream decisions.streams%ROWTYPE; record decisions.records%ROWTYPE; result uuid; validity text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('decision:'||platform.current_organization()::text||':'||app::text,0));
  SELECT * INTO stream FROM decisions.streams WHERE organization_id=platform.current_organization() AND application_id=app AND member_id=member;
  IF NOT FOUND OR stream.decision_id IS DISTINCT FROM decision THEN RAISE EXCEPTION 'Current decision required' USING ERRCODE='AG409'; END IF;
  SELECT * INTO record FROM decisions.records WHERE organization_id=stream.organization_id AND id=decision;
  IF record.outcome<>'approve' OR record.document_id IS DISTINCT FROM document OR record.input_version IS DISTINCT FROM input_version
    OR record.basis_hash IS DISTINCT FROM material_hash OR stream.recommendation_id IS DISTINCT FROM recommendation
    OR record.recommendation_id IS DISTINCT FROM recommendation OR participants_clear IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Current approved basis required' USING ERRCODE='AG409';
  END IF;
  validity:=record.snapshot#>>'{basis,authority,approvalValidity,kind}';
  IF validity IS NULL OR validity NOT IN ('until','no_expiry') OR (validity='until' AND
    (clock_timestamp() AT TIME ZONE 'Asia/Manila')::date>(record.snapshot#>>'{basis,authority,approvalValidity,date}')::date) THEN
    RAISE EXCEPTION 'Approval expired or unavailable' USING ERRCODE='AG409';
  END IF;
  IF record.recorded_at>clock_timestamp() OR NOT EXISTS(SELECT 1 FROM decisions.documents d WHERE d.organization_id=stream.organization_id
    AND d.id=document AND d.decision_id=decision AND d.sha256=record.snapshot#>>'{document,sha256}') THEN
    RAISE EXCEPTION 'Exact published terms required' USING ERRCODE='AG409';
  END IF;
  INSERT INTO decisions.acceptances(id,organization_id,application_id,branch_id,member_id,link_id,decision_id,document_id)
    VALUES(gen_random_uuid(),stream.organization_id,app,stream.branch_id,member,NULLIF(current_setting('agap.member_link_id',true),'')::uuid,decision,document)
    ON CONFLICT(organization_id,decision_id,member_id) DO NOTHING RETURNING id INTO result;
  IF result IS NULL THEN RAISE EXCEPTION 'Terms already acknowledged' USING ERRCODE='AG409'; END IF;
  RETURN result;
END $$;
CREATE FUNCTION decisions.member_document(app uuid, document uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=decisions.member_scope(); result jsonb;
BEGIN
  SELECT jsonb_build_object('text',convert_from(d.bytes,'UTF8'),'sha256',d.sha256,'id',d.id) INTO result
    FROM decisions.documents d JOIN decisions.records r ON r.organization_id=d.organization_id AND r.id=d.decision_id
    WHERE d.organization_id=platform.current_organization() AND d.application_id=app AND d.id=document AND r.member_id=member AND r.outcome='approve';
  RETURN result;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA decisions FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.staff_role(text),decisions.member_current(uuid),
  decisions.staff_lock(uuid,uuid,uuid),decisions.staff_advance(uuid,bigint,uuid,uuid),
  decisions.accept_member(uuid,uuid,uuid,bigint,text,uuid,boolean),decisions.member_document(uuid,uuid) TO agap_runtime;
