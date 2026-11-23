-- Current review-start applicability, shared by reads and consequential guards.
-- Later eligible catalogue publications replace earlier ones. A timestamp tie
-- cannot be resolved by a random UUID and deliberately yields unavailable.
CREATE FUNCTION credit.policy_for_review(org uuid, review_start date, allow_fictional boolean)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
  WITH eligible AS (
    SELECT body,rank() OVER (ORDER BY published_at DESC) AS priority
    FROM credit.policies
    WHERE organization_id=org AND org=platform.current_organization()
      AND review_start BETWEEN (body->>'effectiveFrom')::date AND (body->>'effectiveThrough')::date
      AND ((body->>'status'='approved' AND length(btrim(body->>'approvalReference'))>0)
        OR (allow_fictional AND body->>'status'='fictional'))
  )
  SELECT CASE WHEN count(*)=1 THEN jsonb_agg(body)->0 ELSE NULL END
  FROM eligible WHERE priority=1
$$;
REVOKE ALL ON FUNCTION credit.policy_for_review(uuid,date,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION credit.policy_for_review(uuid,date,boolean) TO agap_runtime;
