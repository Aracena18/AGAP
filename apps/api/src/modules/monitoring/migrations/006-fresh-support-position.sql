-- Purpose-bound, read-only support projection. No cashier role or raw table grant.
CREATE FUNCTION monitoring.support_loan_scope(loan uuid, member uuid, branch uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT platform.current_member() IS NULL AND EXISTS(
  SELECT 1 FROM monitoring.requests r JOIN monitoring.disclosures d ON d.request_id=r.id AND d.organization_id=r.organization_id
  WHERE r.id=NULLIF(current_setting('agap.support_request_id',true),'')::uuid
   AND r.organization_id=platform.current_organization() AND d.loan_id=loan
   AND r.member_id=member AND r.branch_id=branch
   AND r.assigned_officer_id=NULLIF(current_setting('agap.user_id',true),'')::uuid
   AND monitoring.staff_role('officer',r.branch_id))
$$;
REVOKE ALL ON FUNCTION monitoring.support_loan_scope(uuid,uuid,uuid) FROM PUBLIC;
-- Deliberately not granted to runtime: used by the forced-RLS owner's function only.
CREATE POLICY support_purpose_read ON servicing.originations FOR SELECT USING(
 organization_id=platform.current_organization() AND monitoring.support_loan_scope(id,member_id,branch_id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['postings','money_revisions'] LOOP
  EXECUTE format('CREATE POLICY support_purpose_read ON servicing.%I FOR SELECT USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM servicing.originations o WHERE o.organization_id=platform.current_organization() AND o.id=%s AND monitoring.support_loan_scope(o.id,o.member_id,o.branch_id)))',t,
   CASE WHEN t='money_revisions' THEN '(money_revisions.body->>''loanId'')::uuid' ELSE 'postings.loan_id' END);
 END LOOP;
END $$;
CREATE FUNCTION servicing.support_position(request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r monitoring.requests; loan uuid; o servicing.originations;
 day date:=(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date;
 previous_scope text:=current_setting('agap.support_request_id',true);
 balance numeric; paid numeric; due numeric; freshness timestamptz; pending bigint;
 result jsonb;
BEGIN
 -- Same lock as disclosure/history readers: assignment cannot change mid-read.
 PERFORM monitoring.lock_disclosure(request,false);
 SELECT * INTO STRICT r FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization();
 IF platform.current_member() IS NOT NULL OR NOT monitoring.staff_role('officer',r.branch_id)
  OR r.assigned_officer_id IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN
  RAISE EXCEPTION 'Assigned support officer required' USING ERRCODE='42501';
 END IF;
 SELECT loan_id INTO loan FROM monitoring.disclosures WHERE request_id=request AND organization_id=r.organization_id;
 IF loan IS NULL THEN RETURN jsonb_build_object('state','unavailable','message','No loan was linked to this shared request. This does not mean there is no debt.'); END IF;
 PERFORM set_config('agap.support_request_id',request::text,true);
 SELECT * INTO o FROM servicing.originations WHERE organization_id=r.organization_id AND id=loan AND member_id=r.member_id AND branch_id=r.branch_id;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM servicing.postings WHERE organization_id=r.organization_id AND loan_id=loan AND kind='disbursement' AND effective_date<=day) THEN
  result:=jsonb_build_object('state','unavailable','message','A posted position for the linked loan is unavailable. This does not mean there is no debt.');
 ELSE
  -- This projection supports the proven principal-only, scheduled-exact product.
  IF o.body#>>'{offer,principalCentavos}' IS DISTINCT FROM o.body#>>'{offer,netReceivedCentavos}'
   OR o.body#>>'{offer,feesPaidSeparatelyCentavos}' IS DISTINCT FROM '0'
   OR (SELECT sum((x->>'amountCentavos')::numeric) FROM jsonb_array_elements(o.body#>'{offer,payments}') x) IS DISTINCT FROM (o.body#>>'{offer,principalCentavos}')::numeric
   OR (SELECT count(*) FROM servicing.postings WHERE organization_id=r.organization_id AND loan_id=loan)>1000
   OR (SELECT count(DISTINCT command_id) FROM servicing.money_revisions WHERE organization_id=r.organization_id AND (body->>'loanId')::uuid=loan)>1000 THEN
   result:=jsonb_build_object('state','unavailable','message','The linked position exceeds the supported financial configuration or inventory. No zero balance is inferred.');
  ELSE
   -- One SQL statement supplies a coherent MVCC snapshot of posted totals and pending commands.
   WITH dated AS (SELECT * FROM servicing.postings WHERE organization_id=r.organization_id AND loan_id=loan AND effective_date<=day),
   totals AS (SELECT sum(CASE WHEN kind='disbursement' THEN amount_centavos ELSE -amount_centavos END) AS balance,
    COALESCE(sum(amount_centavos) FILTER(WHERE kind='repayment'),0) AS paid,max(recorded_at) AS freshness FROM dated),
   current_commands AS (SELECT DISTINCT ON(command_id) body FROM servicing.money_revisions WHERE organization_id=r.organization_id AND (body->>'loanId')::uuid=loan ORDER BY command_id,version DESC)
   SELECT t.balance,t.paid,GREATEST((SELECT COALESCE(sum((x->>'amountCentavos')::numeric),0) FROM jsonb_array_elements(o.body#>'{offer,payments}') x WHERE (x->>'date')::date<=day)-t.paid,0),
    t.freshness,(SELECT count(*) FROM current_commands WHERE body->>'state' NOT IN('confirmed','failed'))
   INTO balance,paid,due,freshness,pending FROM totals t;
   result:=jsonb_build_object('state','available','data',jsonb_build_object('loanId',loan,'asOfDate',day,
    'principalCentavos',balance,'interestDueCentavos',0,'feesDueCentavos',0,'overdueCentavos',due,
    'postedThrough',freshness,'pendingMovementCount',pending));
  END IF;
 END IF;
 PERFORM set_config('agap.support_request_id',COALESCE(previous_scope,''),true);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION servicing.support_position(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.support_position(uuid) TO agap_runtime;
