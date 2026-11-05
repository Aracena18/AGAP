-- Shared private projection: retain the existing principal-only member calculation once.
CREATE FUNCTION servicing.posted_loan_view(loan uuid,day date) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE o servicing.originations; balance numeric; paid numeric; due numeric; freshness timestamptz; receipts jsonb; pending bigint; paid_count integer;
BEGIN
 IF day IS NULL OR day>(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date THEN RAISE EXCEPTION 'Posted position date required' USING ERRCODE='23514'; END IF;
 SELECT * INTO o FROM servicing.originations WHERE organization_id=platform.current_organization() AND id=loan;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM servicing.postings WHERE organization_id=o.organization_id AND loan_id=o.id AND kind='disbursement' AND effective_date<=day) THEN RETURN NULL; END IF;
 SELECT sum(CASE WHEN kind='disbursement' THEN amount_centavos ELSE -amount_centavos END),
  COALESCE(sum(amount_centavos) FILTER(WHERE kind='repayment'),0),count(*) FILTER(WHERE kind='repayment'),max(recorded_at)
  INTO balance,paid,paid_count,freshness FROM servicing.postings WHERE organization_id=o.organization_id AND loan_id=o.id AND effective_date<=day;
 SELECT GREATEST(COALESCE(sum((x->>'amountCentavos')::numeric),0)-paid,0) INTO due FROM jsonb_array_elements(o.body#>'{offer,payments}') x WHERE (x->>'date')::date<=day;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',receipt_id,'loanId',loan_id,'paidOn',effective_date,'amountCentavos',amount_centavos,'reference',receipt_id::text) ORDER BY recorded_at,event_id),'[]'::jsonb)
  INTO receipts FROM servicing.postings WHERE organization_id=o.organization_id AND loan_id=o.id AND kind='repayment' AND effective_date<=day;
 SELECT count(*) INTO pending FROM (SELECT DISTINCT ON (command_id) body FROM servicing.money_revisions WHERE organization_id=o.organization_id AND (body->>'loanId')::uuid=o.id ORDER BY command_id,version DESC) r WHERE r.body->>'state' NOT IN ('confirmed','failed');
 RETURN jsonb_build_object('id',o.id,'label','Loan '||o.id::text,'status',CASE WHEN balance=0 THEN 'settled' ELSE 'active' END,
  'position',jsonb_build_object('loanId',o.id,'asOfDate',day,'principalCentavos',balance,'interestDueCentavos',0,'feesDueCentavos',0,'overdueCentavos',due,'postedThrough',freshness,'pendingMovementCount',pending),
  'nextPayment',o.body#>'{offer,payments}'->paid_count,'schedule',o.body#>'{offer,payments}','receipts',receipts);
END $$;
REVOKE ALL ON FUNCTION servicing.posted_loan_view(uuid,date) FROM PUBLIC;

CREATE OR REPLACE FUNCTION servicing.member_loans(day date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE o servicing.originations; result jsonb:='[]'::jsonb; view jsonb;
BEGIN
 IF platform.current_member() IS NULL OR NOT EXISTS(SELECT 1 FROM identity.member_links l WHERE l.organization_id=platform.current_organization()
  AND l.member_id=platform.current_member() AND l.id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid AND l.active)
  OR day IS NULL OR day>(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date THEN RAISE EXCEPTION 'Linked member scope required' USING ERRCODE='42501'; END IF;
 FOR o IN SELECT * FROM servicing.originations x WHERE x.organization_id=platform.current_organization() AND x.member_id=platform.current_member() LOOP
  view:=servicing.posted_loan_view(o.id,day); IF view IS NOT NULL THEN result:=result||jsonb_build_array(view); END IF;
 END LOOP;
 RETURN result;
END $$;

-- SQL statements resolve on first call, after all registered monitoring migrations have run.
-- The only runtime entry is request-scoped; arbitrary loan/member identifiers are never accepted.
CREATE FUNCTION servicing.support_position(request uuid,day date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record; d record; o servicing.originations;
BEGIN
 PERFORM monitoring.lock_disclosure(request,false);
 SELECT * INTO r FROM monitoring.requests WHERE id=request AND organization_id=platform.current_organization();
 IF NOT FOUND THEN RAISE EXCEPTION 'Assigned support scope required' USING ERRCODE='42501'; END IF;
 IF platform.current_member() IS NOT NULL OR NOT monitoring.staff_role('officer',r.branch_id)
  OR r.assigned_officer_id IS DISTINCT FROM NULLIF(current_setting('agap.user_id',true),'')::uuid THEN RAISE EXCEPTION 'Assigned support scope required' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT d FROM monitoring.disclosures WHERE request_id=request AND organization_id=r.organization_id;
 IF d.loan_id IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO o FROM servicing.originations WHERE id=d.loan_id AND organization_id=r.organization_id AND member_id=r.member_id AND branch_id=r.branch_id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN servicing.posted_loan_view(o.id,day)->'position';
END $$;
REVOKE ALL ON FUNCTION servicing.support_position(uuid,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.support_position(uuid,date) TO agap_runtime;
