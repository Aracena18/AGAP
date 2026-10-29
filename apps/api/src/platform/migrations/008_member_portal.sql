CREATE SCHEMA portal;
ALTER TABLE identity.oauth_states ADD COLUMN audience text NOT NULL DEFAULT 'staff' CHECK(audience IN ('staff','member'));
CREATE TABLE identity.member_links (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, member_id uuid NOT NULL, issuer text NOT NULL, subject text NOT NULL,
  active boolean NOT NULL DEFAULT true, version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991),
  verification_reference text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(issuer,subject), UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE UNIQUE INDEX one_active_member_link ON identity.member_links(organization_id,member_id) WHERE active;
CREATE TABLE identity.member_link_events (
  id uuid PRIMARY KEY, link_id uuid NOT NULL REFERENCES identity.member_links(id), event_type text NOT NULL,
  operator_reference text NOT NULL, reason text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE identity.member_sessions (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, link_id uuid NOT NULL REFERENCES identity.member_links(id),
  authenticated_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL CHECK(expires_at>created_at)
);
CREATE INDEX ON identity.member_sessions(expires_at);
REVOKE ALL ON identity.member_links,identity.member_link_events,identity.member_sessions FROM PUBLIC,agap_runtime,agap_identity;
GRANT SELECT ON identity.member_links TO agap_identity;
GRANT SELECT,INSERT,DELETE ON identity.member_sessions TO agap_identity;

CREATE FUNCTION identity.assert_member(session_id uuid,link uuid,org uuid,member uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE found_id uuid;
BEGIN
  SELECT l.id INTO found_id FROM identity.member_links l JOIN identity.member_sessions s ON s.link_id=l.id
  WHERE l.id=link AND l.organization_id=org AND l.member_id=member AND l.active AND s.id=session_id AND s.expires_at>now()
  FOR SHARE OF l,s;
  RETURN found_id IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION identity.assert_member(uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identity.assert_member(uuid,uuid,uuid,uuid) TO agap_runtime;
CREATE FUNCTION platform.current_member() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('agap.member_id',true),'')::uuid $$;
REVOKE ALL ON FUNCTION platform.current_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION platform.current_member() TO agap_runtime;

-- Staff branch restrictions remain in place; member transactions carry no staff branches.
DROP POLICY member_branch ON members.members;
CREATE POLICY member_read ON members.members AS RESTRICTIVE FOR SELECT USING(
  (platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) OR id=platform.current_member()
);
CREATE POLICY member_insert ON members.members AS RESTRICTIVE FOR INSERT WITH CHECK(platform.current_member() IS NULL AND platform.allowed_branch(branch_id));
CREATE POLICY member_update ON members.members AS RESTRICTIVE FOR UPDATE USING(platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) WITH CHECK(platform.current_member() IS NULL AND platform.allowed_branch(branch_id));
DROP POLICY application_branch ON applications.applications;
CREATE POLICY application_read ON applications.applications AS RESTRICTIVE FOR SELECT USING(
  (platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) OR member_id=platform.current_member()
);
CREATE POLICY application_insert ON applications.applications AS RESTRICTIVE FOR INSERT WITH CHECK(
  (platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) OR member_id=platform.current_member()
);
CREATE POLICY application_update ON applications.applications AS RESTRICTIVE FOR UPDATE USING(
  (platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) OR member_id=platform.current_member()
) WITH CHECK((platform.current_member() IS NULL AND platform.allowed_branch(branch_id)) OR member_id=platform.current_member());

ALTER TABLE applications.applications ALTER COLUMN assigned_officer_id DROP NOT NULL;
ALTER TABLE applications.applications DROP CONSTRAINT applications_status_check;
ALTER TABLE applications.applications ADD CHECK(status IN ('draft','submitted','evidence_review','clarification','assessment_ready','recommended','decision_recorded'));
ALTER TABLE applications.application_revisions ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE applications.application_revisions ADD COLUMN recorded_member_id uuid;
ALTER TABLE applications.application_revisions ADD FOREIGN KEY(organization_id,recorded_member_id) REFERENCES members.members(organization_id,id);
ALTER TABLE applications.application_revisions ADD CHECK(num_nonnulls(recorded_by,recorded_member_id)=1);

CREATE TABLE portal.preferences (
  organization_id uuid NOT NULL, member_id uuid NOT NULL, notices_enabled boolean NOT NULL DEFAULT true,
  version bigint NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 9007199254740991), PRIMARY KEY(organization_id,member_id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE TABLE portal.commands (
  organization_id uuid NOT NULL, member_id uuid NOT NULL, link_id uuid NOT NULL, scope text NOT NULL,
  request_hash text NOT NULL, response jsonb, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(link_id,scope),
  FOREIGN KEY(organization_id,link_id) REFERENCES identity.member_links(organization_id,id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
CREATE TABLE portal.events (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, member_id uuid NOT NULL, link_id uuid NOT NULL,
  event_type text NOT NULL, aggregate_id uuid NOT NULL, aggregate_version bigint NOT NULL CHECK(aggregate_version BETWEEN 1 AND 9007199254740991),
  correlation_id text NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(organization_id,link_id) REFERENCES identity.member_links(organization_id,id),
  FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id)
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['portal.preferences','portal.commands','portal.events'] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY own_member ON %s USING(organization_id=platform.current_organization() AND member_id=platform.current_member()) WITH CHECK(organization_id=platform.current_organization() AND member_id=platform.current_member())',t);
  END LOOP;
END $$;
CREATE POLICY own_command_link ON portal.commands AS RESTRICTIVE USING(link_id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid) WITH CHECK(link_id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid);
REVOKE ALL ON SCHEMA portal FROM PUBLIC;
GRANT USAGE ON SCHEMA portal TO agap_runtime;
GRANT SELECT,UPDATE ON portal.preferences TO agap_runtime;
GRANT SELECT,INSERT,UPDATE ON portal.commands TO agap_runtime;
GRANT SELECT,INSERT ON portal.events TO agap_runtime;
