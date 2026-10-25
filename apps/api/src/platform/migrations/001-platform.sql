CREATE SCHEMA platform;
CREATE SCHEMA identity;
CREATE SCHEMA members;
CREATE SCHEMA applications;

CREATE TABLE platform.organizations (id uuid PRIMARY KEY, name text NOT NULL);
CREATE TABLE platform.branches (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), name text NOT NULL, UNIQUE (organization_id,id));
CREATE FUNCTION platform.current_organization() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('agap.organization_id', true), '')::uuid $$;
CREATE FUNCTION platform.allowed_branch(branch uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('agap.branch_ids', true), ''), '[]')::jsonb ? branch::text $$;

CREATE TABLE identity.staff_users (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), issuer text NOT NULL, subject text NOT NULL,
  display_name text NOT NULL, branch_ids uuid[] NOT NULL, roles text[] NOT NULL CHECK (roles <@ ARRAY['officer','verifier','reviewer','cashier','financial_authorizer','accountant','auditor','administrator']::text[]),
  active boolean NOT NULL DEFAULT true, UNIQUE (issuer,subject), UNIQUE (organization_id,id)
);
CREATE TABLE identity.sessions (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, user_id uuid NOT NULL REFERENCES identity.staff_users(id),
  authenticated_at timestamptz NOT NULL, methods text[] NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX ON identity.sessions(expires_at);
CREATE TABLE identity.oauth_states (token_hash text PRIMARY KEY, state text NOT NULL, verifier text NOT NULL, nonce text NOT NULL, expires_at timestamptz NOT NULL);

CREATE TABLE platform.idempotency (
  organization_id uuid NOT NULL REFERENCES platform.organizations(id), scope text NOT NULL, request_hash text NOT NULL,
  response jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,scope)
);
CREATE TABLE platform.audit_events (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), user_id uuid NOT NULL,
  event_type text NOT NULL, aggregate_id uuid NOT NULL, aggregate_version bigint NOT NULL CHECK(aggregate_version BETWEEN 1 AND 9007199254740991), correlation_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(), FOREIGN KEY(organization_id,user_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE platform.outbox (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), event_type text NOT NULL, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, attempts integer NOT NULL DEFAULT 0, last_error_code text
);
CREATE INDEX ON platform.outbox(created_at) WHERE delivered_at IS NULL;
CREATE TABLE platform.inbox (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), source text NOT NULL, external_event_id text NOT NULL,
  business_event_id text NOT NULL, payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
  UNIQUE(organization_id,source,external_event_id)
);
CREATE TABLE platform.jobs (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES platform.organizations(id), kind text NOT NULL, payload jsonb NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, attempts integer NOT NULL DEFAULT 0, last_error_code text
);

CREATE TABLE members.members (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL, external_reference text NOT NULL,
  full_name text NOT NULL, phone text, version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
  notice_version text NOT NULL, notice_acknowledged_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,external_reference), UNIQUE(organization_id,branch_id,id),
  FOREIGN KEY(organization_id,branch_id) REFERENCES platform.branches(organization_id,id)
);
CREATE TABLE members.member_revisions (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, member_id uuid NOT NULL, version bigint NOT NULL, snapshot jsonb NOT NULL,
  recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,member_id,version),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE TABLE applications.applications (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, branch_id uuid NOT NULL, member_id uuid NOT NULL, purpose text NOT NULL,
  requested_principal_centavos bigint NOT NULL CHECK(requested_principal_centavos BETWEEN 1 AND 9007199254740991), requested_term_months integer NOT NULL CHECK(requested_term_months BETWEEN 1 AND 600), currency text NOT NULL CHECK(currency='PHP'),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','evidence_review','clarification','assessment_ready','recommended','decision_recorded')),
  version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991), assessment_input_version bigint NOT NULL DEFAULT 1 CHECK(assessment_input_version BETWEEN 1 AND 9007199254740991),
  assigned_officer_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id), FOREIGN KEY(organization_id,branch_id,member_id) REFERENCES members.members(organization_id,branch_id,id),
  FOREIGN KEY(organization_id,assigned_officer_id) REFERENCES identity.staff_users(organization_id,id)
);
CREATE TABLE applications.application_revisions (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, version bigint NOT NULL, snapshot jsonb NOT NULL,
  recorded_by uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,application_id,version),
  FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id)
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['platform.idempotency','platform.audit_events','platform.outbox','platform.inbox','platform.jobs','members.members','members.member_revisions','applications.applications','applications.application_revisions'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY organization_scope ON %s USING (organization_id=platform.current_organization()) WITH CHECK (organization_id=platform.current_organization())',t);
  END LOOP;
END $$;
CREATE POLICY member_branch ON members.members AS RESTRICTIVE USING(platform.allowed_branch(branch_id)) WITH CHECK(platform.allowed_branch(branch_id));
CREATE POLICY application_branch ON applications.applications AS RESTRICTIVE USING(platform.allowed_branch(branch_id)) WITH CHECK(platform.allowed_branch(branch_id));
CREATE POLICY member_revision_scope ON members.member_revisions AS RESTRICTIVE USING(EXISTS(SELECT 1 FROM members.members m WHERE m.id=member_id AND m.organization_id=member_revisions.organization_id));
CREATE POLICY application_revision_scope ON applications.application_revisions AS RESTRICTIVE USING(EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=application_id AND a.organization_id=application_revisions.organization_id));

REVOKE ALL ON SCHEMA platform, identity, members, applications FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA platform FROM PUBLIC;
GRANT USAGE ON SCHEMA platform,members,applications TO agap_runtime;
GRANT EXECUTE ON FUNCTION platform.current_organization(), platform.allowed_branch(uuid) TO agap_runtime;
GRANT SELECT,INSERT,UPDATE ON members.members, applications.applications, platform.idempotency TO agap_runtime;
GRANT SELECT,INSERT ON members.member_revisions, applications.application_revisions, platform.audit_events, platform.outbox,platform.inbox,platform.jobs TO agap_runtime;
GRANT USAGE ON SCHEMA identity TO agap_identity;
GRANT SELECT ON identity.staff_users TO agap_identity;
GRANT SELECT,INSERT,UPDATE,DELETE ON identity.sessions,identity.oauth_states TO agap_identity;
