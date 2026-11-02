-- Operator-approved per-source retention decisions. No institutional duration is guessed.
CREATE TABLE evidence.retention_holds (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,source_id uuid NOT NULL,active boolean NOT NULL DEFAULT true,
 approval_reference text NOT NULL,operator_reference text NOT NULL,reason text NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,source_id) REFERENCES evidence.sources(organization_id,id)
);
CREATE TABLE evidence.retirements (
 source_id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,
 policy_reference text NOT NULL,approval_reference text NOT NULL,operator_reference text NOT NULL,
 manifest_sha256 text NOT NULL,requested_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz,
 FOREIGN KEY(organization_id,application_id,source_id) REFERENCES evidence.sources(organization_id,application_id,id)
);
ALTER TABLE evidence.retirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.retirements FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON evidence.retirements USING(organization_id=platform.current_organization() AND evidence.can_access(application_id));
GRANT SELECT ON evidence.retirements TO agap_runtime,agap_worker;
