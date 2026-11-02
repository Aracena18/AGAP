-- CHECK treats NULL as passing; require actual JSON keys and explicit matches.
ALTER TABLE decisions.recommendations ADD CHECK(
  (jsonb_typeof(body)='object' AND body ?& ARRAY['id','applicationId','preparedBy','preparedAt','assessmentId','inputVersion','offerVersionId','reason','basisHash']) IS TRUE);
ALTER TABLE decisions.records ADD CHECK(
  (jsonb_typeof(snapshot)='object' AND snapshot ?& ARRAY['id','recordedAt','reviewerId','reviewerRoles','input','basis','document','explanation']
   AND (snapshot->>'id')::uuid=id AND (snapshot->>'reviewerId')::uuid=reviewer_id
   AND (snapshot#>>'{basis,application,id}')::uuid=application_id
   AND (snapshot#>>'{basis,application,organizationId}')::uuid=organization_id
   AND (snapshot#>>'{basis,application,memberId}')::uuid=member_id
   AND (snapshot#>>'{basis,application,branchId}')::uuid=branch_id
   AND (snapshot#>>'{basis,application,assessmentInputVersion}')::bigint=input_version
   AND snapshot#>>'{input,outcome}'=outcome) IS TRUE);
ALTER TABLE decisions.records ADD CHECK(outcome='return' OR recommendation_id IS NOT NULL);
ALTER TABLE decisions.records ADD CHECK(
  (jsonb_typeof(member_view)='object' AND member_view ?& ARRAY['id','outcome','explanation','recordedAt','documentVersionId','terms','accepted']
   AND (member_view->>'id')::uuid=id AND member_view->>'outcome'=outcome) IS TRUE);
