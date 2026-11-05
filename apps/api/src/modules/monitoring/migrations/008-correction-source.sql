-- One own-member record per read; no new raw table grants or history DTO changes.
CREATE FUNCTION monitoring.correction_source(request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF platform.current_member() IS NULL OR NOT EXISTS(SELECT 1 FROM monitoring.requests r WHERE r.id=request AND r.organization_id=platform.current_organization() AND r.member_id=platform.current_member()) THEN
  RAISE EXCEPTION 'Unavailable record' USING ERRCODE='P0002';
 END IF;
 SELECT jsonb_build_object('request',jsonb_build_object('id',h.id,'submittedAt',h.submitted_at,'status',h.status,'message',h.message,'response',h.response,'checkIn',h.check_in,'loanId',h.loan_id),
 'contactPreference',d.contact_preference,'links',monitoring.correction_link(request),
 'reason',(SELECT c.reason FROM monitoring.corrections c WHERE c.next_id=request AND c.organization_id=platform.current_organization())) INTO result
 FROM monitoring.member_history h JOIN monitoring.disclosures d ON d.request_id=h.id AND d.organization_id=platform.current_organization() WHERE h.id=request;
 IF result IS NULL THEN RAISE EXCEPTION 'Incomplete support record' USING ERRCODE='P0503'; END IF;
 IF EXISTS(SELECT 1 FROM (VALUES((result->'links'->>'replacesId')::uuid),((result->'links'->>'replacedById')::uuid)) neighbor(id)
 WHERE neighbor.id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM monitoring.requests r WHERE r.id=neighbor.id AND r.organization_id=platform.current_organization() AND r.member_id=platform.current_member())) THEN
  RAISE EXCEPTION 'Incomplete correction relationship' USING ERRCODE='P0503';
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION monitoring.correction_source(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monitoring.correction_source(uuid) TO agap_runtime;
