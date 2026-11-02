CREATE TABLE evidence.text_versions (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,source_id uuid NOT NULL,
 source_version bigint NOT NULL,sha256 text NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'),object_key uuid NOT NULL,
 size bigint NOT NULL CHECK(size BETWEEN 1 AND 4000000),page_count integer NOT NULL CHECK(page_count BETWEEN 1 AND 20),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,source_id,sha256),UNIQUE(organization_id,application_id,id),
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id)
);
ALTER TABLE evidence.text_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.text_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON evidence.text_versions USING(organization_id=platform.current_organization() AND evidence.can_access(application_id)) WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id));
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON evidence.text_versions FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
GRANT SELECT ON evidence.text_versions TO agap_runtime;
GRANT SELECT,INSERT ON evidence.text_versions TO agap_worker;
ALTER TABLE evidence.processing ADD COLUMN text_version_id uuid;
ALTER TABLE evidence.processing ADD FOREIGN KEY(organization_id,application_id,text_version_id) REFERENCES evidence.text_versions(organization_id,application_id,id);
ALTER TABLE evidence.draft_reviews ADD COLUMN fact_id uuid;
