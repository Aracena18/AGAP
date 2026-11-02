-- Read current pointers without creating/updating a stream on a GET.
-- Producers guard application/source bindings first, using the command lock order.
CREATE FUNCTION decisions.staff_current(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
  IF NOT (decisions.staff_role('officer') OR decisions.staff_role('reviewer') OR decisions.staff_role('auditor')) THEN
    RAISE EXCEPTION 'Staff decision access required' USING ERRCODE='AG403';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('decision:'||platform.current_organization()::text||':'||app::text,0));
  SELECT jsonb_build_object('recommendationId',recommendation_id,'decisionId',decision_id) INTO result
    FROM decisions.streams WHERE organization_id=platform.current_organization() AND application_id=app
    AND platform.current_member() IS NULL AND platform.allowed_branch(branch_id);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION decisions.staff_current(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.staff_current(uuid) TO agap_runtime;
