-- Expose only eligibility, never the staff authority configuration. Expiry is
-- inclusive on the Manila calendar and is checked again by accept_member.
CREATE OR REPLACE FUNCTION decisions.member_current(app uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE member uuid:=decisions.member_scope(); record decisions.records%ROWTYPE; stream decisions.streams%ROWTYPE; validity text;
BEGIN
  SELECT * INTO stream FROM decisions.streams WHERE organization_id=platform.current_organization() AND application_id=app AND member_id=member;
  IF NOT FOUND OR stream.decision_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO record FROM decisions.records WHERE organization_id=stream.organization_id AND id=stream.decision_id;
  validity:=record.snapshot#>>'{basis,authority,approvalValidity,kind}';
  RETURN jsonb_build_object('view',record.member_view||jsonb_build_object('accepted',EXISTS(SELECT 1 FROM decisions.acceptances a WHERE a.organization_id=stream.organization_id AND a.decision_id=record.id)),
    'basisHash',record.basis_hash,'inputVersion',record.input_version,'recommendationId',record.recommendation_id,'snapshotHash',record.snapshot_hash,
    'acceptanceCurrent',COALESCE(record.outcome='approve' AND record.recorded_at<=clock_timestamp() AND
      (validity='no_expiry' OR (validity='until' AND (clock_timestamp() AT TIME ZONE 'Asia/Manila')::date<=(record.snapshot#>>'{basis,authority,approvalValidity,date}')::date)),false));
END $$;
REVOKE ALL ON FUNCTION decisions.member_current(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decisions.member_current(uuid) TO agap_runtime;
