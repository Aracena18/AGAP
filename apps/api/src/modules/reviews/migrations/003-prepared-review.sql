CREATE TABLE reviews.prepared_packets (
 id uuid PRIMARY KEY, organization_id uuid NOT NULL, application_id uuid NOT NULL,
 basis_hash text NOT NULL CHECK(basis_hash ~ '^[a-f0-9]{64}$'), body jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id),
 CHECK((body->>'id')::uuid=id AND (body->>'applicationId')::uuid=application_id)
);
ALTER TABLE reviews.prepared_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews.prepared_packets FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON reviews.prepared_packets FOR SELECT USING(organization_id=platform.current_organization() AND evidence.can_access(application_id));
GRANT SELECT ON reviews.prepared_packets TO agap_runtime;
CREATE TRIGGER immutable_prepared_packet BEFORE UPDATE OR DELETE ON reviews.prepared_packets FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
-- A safe append-only projection is written by the real recommendation transaction.
-- Members never receive SELECT policy over the private recommendation body.
CREATE TABLE reviews.prepared_recommendations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,application_id uuid NOT NULL,
 assessment_id uuid NOT NULL,input_version bigint NOT NULL,offer_id uuid NOT NULL,
 prepared_by uuid NOT NULL,prepared_at timestamptz NOT NULL,
 FOREIGN KEY(organization_id,application_id) REFERENCES applications.applications(organization_id,id)
);
ALTER TABLE reviews.prepared_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews.prepared_recommendations FORCE ROW LEVEL SECURITY;
CREATE POLICY scoped ON reviews.prepared_recommendations FOR SELECT USING(organization_id=platform.current_organization() AND evidence.can_access(application_id));
CREATE POLICY staff_insert ON reviews.prepared_recommendations FOR INSERT WITH CHECK(organization_id=platform.current_organization() AND decisions.staff_role('officer') AND prepared_by=NULLIF(current_setting('agap.user_id',true),'')::uuid);
GRANT SELECT ON reviews.prepared_recommendations TO agap_runtime;
CREATE FUNCTION reviews.project_prepared_recommendation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 BEGIN
  INSERT INTO reviews.prepared_recommendations VALUES(NEW.id,NEW.organization_id,NEW.application_id,(NEW.body->>'assessmentId')::uuid,(NEW.body->>'inputVersion')::bigint,(NEW.body->>'offerVersionId')::uuid,(NEW.body->>'preparedBy')::uuid,(NEW.body->>'preparedAt')::timestamptz);
  RETURN NEW;
 END
$$;
REVOKE ALL ON FUNCTION reviews.project_prepared_recommendation() FROM PUBLIC;
CREATE TRIGGER project_prepared_recommendation AFTER INSERT ON decisions.recommendations FOR EACH ROW EXECUTE FUNCTION reviews.project_prepared_recommendation();
CREATE TRIGGER immutable_prepared_recommendation BEFORE UPDATE OR DELETE ON reviews.prepared_recommendations FOR EACH ROW EXECUTE FUNCTION evidence.immutable();
CREATE FUNCTION decisions.prepared_recommendation(app uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('id',r.id,'applicationId',r.application_id,'assessmentId',r.assessment_id,'inputVersion',r.input_version,'offerVersionId',r.offer_id,'preparedAt',to_char(r.prepared_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
 FROM reviews.prepared_recommendations r JOIN applications.applications a ON a.id=r.application_id AND a.organization_id=r.organization_id
 JOIN decisions.streams s ON s.application_id=a.id AND s.organization_id=a.organization_id AND s.recommendation_id=r.id
 WHERE r.organization_id=platform.current_organization() AND r.application_id=app AND evidence.can_access(app)
 AND a.assigned_officer_id=r.prepared_by AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.id=a.assigned_officer_id AND u.organization_id=a.organization_id AND u.active AND 'officer'=ANY(u.roles) AND a.branch_id=ANY(u.branch_ids))
$$;
REVOKE ALL ON FUNCTION decisions.prepared_recommendation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.prepared_recommendation(uuid) TO agap_runtime;
