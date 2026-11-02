-- Keep member row filtering local: a policy subquery would require the runtime
-- role to SELECT private snapshots, even when another policy allows the staff row.
ALTER TABLE decisions.documents ADD COLUMN member_id uuid;
UPDATE decisions.documents d SET member_id=r.member_id FROM decisions.records r
  WHERE r.organization_id=d.organization_id AND r.id=d.decision_id;
ALTER TABLE decisions.documents ALTER COLUMN member_id SET NOT NULL;
ALTER TABLE decisions.documents ADD FOREIGN KEY(organization_id,member_id) REFERENCES members.members(organization_id,id);
DROP POLICY member_document_scope ON decisions.documents;
CREATE POLICY member_document_scope ON decisions.documents USING(
  organization_id=platform.current_organization() AND member_id=platform.current_member());
-- The view's original column list deliberately stays stable; it does not need
-- to expose the additional scope field to staff callers.
CREATE OR REPLACE FUNCTION decisions.require_document() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
  IF NEW.outcome='approve' AND NOT EXISTS (
    SELECT 1 FROM decisions.documents d WHERE d.organization_id=NEW.organization_id AND d.application_id=NEW.application_id
    AND d.id=NEW.document_id AND d.decision_id=NEW.id AND d.member_id=NEW.member_id
    AND d.sha256=NEW.snapshot#>>'{document,sha256}' AND (NEW.snapshot#>>'{document,id}')::uuid=d.id) THEN
    RAISE EXCEPTION 'Exact approval document is required' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION decisions.require_document() FROM PUBLIC;
