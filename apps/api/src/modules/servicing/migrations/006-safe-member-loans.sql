-- Members get only a bounded projection, never raw command or approval bodies.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['originations','money_commands','money_revisions','postings'] LOOP
    EXECUTE format('CREATE VIEW servicing.staff_%I WITH(security_barrier=true) AS SELECT * FROM servicing.%I WHERE platform.current_member() IS NULL AND organization_id=platform.current_organization() AND platform.allowed_branch(branch_id) AND (servicing.staff_role(''cashier'') OR servicing.staff_role(''financial_authorizer'') OR servicing.staff_role(''auditor''))',t,t);
    EXECUTE format('REVOKE SELECT ON servicing.%I FROM agap_runtime',t);
    EXECUTE format('GRANT SELECT ON servicing.staff_%I TO agap_runtime',t);
  END LOOP;
END $$;
CREATE POLICY member_origin_read ON servicing.originations FOR SELECT USING(
  organization_id=platform.current_organization() AND member_id=platform.current_member());
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['money_commands','money_revisions','postings'] LOOP
    EXECUTE format('CREATE POLICY member_safe_reader ON servicing.%I FOR SELECT USING(organization_id=platform.current_organization() AND EXISTS(SELECT 1 FROM servicing.originations o WHERE o.organization_id=platform.current_organization() AND o.id=%s AND o.member_id=platform.current_member()))',t,CASE WHEN t='money_revisions' THEN '(money_revisions.body->>''loanId'')::uuid' ELSE quote_ident(t)||'.loan_id' END);
  END LOOP;
END $$;
CREATE FUNCTION servicing.member_loans(day date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE o servicing.originations; result jsonb:='[]'::jsonb; balance numeric; paid numeric; due numeric; freshness timestamptz; receipts jsonb; pending bigint; paid_count integer; next_payment jsonb;
BEGIN
  IF platform.current_member() IS NULL OR NOT EXISTS(SELECT 1 FROM identity.member_links l WHERE l.organization_id=platform.current_organization()
    AND l.member_id=platform.current_member() AND l.id=NULLIF(current_setting('agap.member_link_id',true),'')::uuid AND l.active)
    OR day>(clock_timestamp() AT TIME ZONE 'Asia/Manila')::date THEN
    RAISE EXCEPTION 'Linked member scope required' USING ERRCODE='42501';
  END IF;
  FOR o IN SELECT * FROM servicing.originations x WHERE x.organization_id=platform.current_organization() AND x.member_id=platform.current_member()
    AND EXISTS(SELECT 1 FROM servicing.postings p WHERE p.organization_id=x.organization_id AND p.loan_id=x.id AND p.kind='disbursement' AND p.effective_date<=day) LOOP
    SELECT sum(CASE WHEN kind='disbursement' THEN amount_centavos ELSE -amount_centavos END),
      COALESCE(sum(amount_centavos) FILTER(WHERE kind='repayment'),0),count(*) FILTER(WHERE kind='repayment'),max(recorded_at)
      INTO balance,paid,paid_count,freshness FROM servicing.postings WHERE organization_id=o.organization_id AND loan_id=o.id AND effective_date<=day;
    SELECT GREATEST(COALESCE(sum((x->>'amountCentavos')::numeric),0)-paid,0) INTO due FROM jsonb_array_elements(o.body#>'{offer,payments}') x WHERE (x->>'date')::date<=day;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',receipt_id,'loanId',loan_id,'paidOn',effective_date,'amountCentavos',amount_centavos,'reference',receipt_id::text) ORDER BY recorded_at,event_id),'[]'::jsonb)
      INTO receipts FROM servicing.postings WHERE organization_id=o.organization_id AND loan_id=o.id AND kind='repayment' AND effective_date<=day;
    SELECT count(*) INTO pending FROM (SELECT DISTINCT ON (command_id) body FROM servicing.money_revisions WHERE organization_id=o.organization_id AND (body->>'loanId')::uuid=o.id ORDER BY command_id,version DESC) r
      WHERE r.body->>'state' NOT IN ('confirmed','failed');
    next_payment:=o.body#>'{offer,payments}'->paid_count;
    result:=result||jsonb_build_array(jsonb_build_object('id',o.id,'label','Loan '||o.id::text,'status',CASE WHEN balance=0 THEN 'settled' ELSE 'active' END,
      'position',jsonb_build_object('loanId',o.id,'asOfDate',day,'principalCentavos',balance,'interestDueCentavos',0,'feesDueCentavos',0,'overdueCentavos',due,'postedThrough',freshness,'pendingMovementCount',pending),
      'nextPayment',next_payment,'schedule',o.body#>'{offer,payments}','receipts',receipts));
  END LOOP;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION servicing.member_loans(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION servicing.member_loans(date) TO agap_runtime;
