CREATE TABLE evidence.clarifications (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL, draft_id uuid NOT NULL,
 revision bigint NOT NULL CHECK(revision BETWEEN 2 AND 9007199254740991),
 body jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(),
 recorded_by uuid DEFAULT NULLIF(current_setting('agap.user_id',true),'')::uuid,
 recorded_member_id uuid DEFAULT platform.current_member(),
 UNIQUE(organization_id,application_id,revision),
 FOREIGN KEY(organization_id,application_id,draft_id) REFERENCES evidence.drafts(organization_id,application_id,id),
 FOREIGN KEY(organization_id,recorded_by) REFERENCES identity.staff_users(organization_id,id),
 FOREIGN KEY(organization_id,recorded_member_id) REFERENCES members.members(organization_id,id),
 CHECK(num_nonnulls(recorded_by,recorded_member_id)=1),
 CHECK((body->>'id')::uuid=id AND (body->>'draftId')::uuid=draft_id)
);
ALTER TABLE evidence.clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence.clarifications FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON evidence.clarifications USING(organization_id=platform.current_organization() AND evidence.can_access(application_id))
 WITH CHECK(organization_id=platform.current_organization() AND evidence.can_access(application_id));
CREATE FUNCTION evidence.can_clarify(app uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT evidence.can_access(app) AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization() AND a.status<>'decision_recorded' AND
 (platform.current_member()=a.member_id OR (platform.current_member() IS NULL AND a.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND
 EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=a.assigned_officer_id AND u.organization_id=a.organization_id AND u.active AND 'officer'=ANY(u.roles)))))
$$;
REVOKE ALL ON FUNCTION evidence.can_clarify(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.can_clarify(uuid) TO agap_runtime;
CREATE POLICY preparing_only ON evidence.clarifications AS RESTRICTIVE FOR INSERT WITH CHECK(evidence.can_clarify(application_id));
CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON evidence.clarifications FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
GRANT SELECT,INSERT ON evidence.clarifications TO agap_runtime;
