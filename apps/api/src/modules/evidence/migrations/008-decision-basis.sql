-- Staff-only immutable input access. Members retain the public assessment view.
CREATE FUNCTION credit.staff_decision_input(app uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('assessment',a.body,'input',a.input_snapshot,
   'confirmations',COALESCE((SELECT jsonb_agg(jsonb_build_object('factId',f.id,'revision',f.revision,
     'staffId',f.recorded_by,'memberId',f.recorded_member_id,'recordedAt',f.recorded_at) ORDER BY f.id)
     FROM evidence.facts f WHERE f.organization_id=a.organization_id AND f.application_id=a.application_id
     AND EXISTS(SELECT 1 FROM jsonb_array_elements(a.input_snapshot->'facts') x
       WHERE (x->>'id')::uuid=f.id AND (x->>'revision')::bigint=f.revision)),'[]'::jsonb))
 FROM credit.assessments a
 WHERE a.application_id=app AND a.organization_id=platform.current_organization()
 AND platform.current_member() IS NULL AND evidence.can_access(app)
 AND EXISTS(SELECT 1 FROM identity.staff_users u WHERE u.organization_id=a.organization_id
   AND u.id=NULLIF(current_setting('agap.user_id',true),'')::uuid AND u.active
   AND u.roles && ARRAY['officer','reviewer','auditor']::text[])
 ORDER BY a.created_at DESC,a.id DESC LIMIT 1
$$;
REVOKE ALL ON FUNCTION credit.staff_decision_input(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.staff_decision_input(uuid) TO agap_runtime;

-- Internal financial purpose, with actual actor/branch authorization. This does
-- not impersonate a member/officer or grant SELECT on the private input table.
CREATE FUNCTION evidence.financial_guard_access(app uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT platform.current_member() IS NULL AND
   (decisions.staff_role('cashier') OR decisions.staff_role('financial_authorizer'))
   AND EXISTS(SELECT 1 FROM applications.applications a WHERE a.id=app AND a.organization_id=platform.current_organization()
     AND platform.allowed_branch(a.branch_id))
$$;
REVOKE ALL ON FUNCTION evidence.financial_guard_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evidence.financial_guard_access(uuid) TO agap_runtime,agap_worker;
DO $$ DECLARE table_name text; BEGIN
 FOREACH table_name IN ARRAY ARRAY['evidence.sources','evidence.processing','evidence.facts','evidence.verifications','evidence.retirements','credit.assessments'] LOOP
   EXECUTE format('CREATE POLICY financial_definer_read ON %s FOR SELECT USING (
     current_user=(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=%L::regclass)
     AND organization_id=platform.current_organization() AND evidence.financial_guard_access(application_id))',table_name,table_name);
 END LOOP;
END $$;
