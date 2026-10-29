-- A bounded database write surface: runtime roles have no table write grants.
CREATE FUNCTION accounting.post_journal(data jsonb, correlation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE
  org uuid:=platform.current_organization(); actor uuid; source uuid; rule uuid; day date;
  period uuid; previous accounting.journals%ROWTYPE; original accounting.journals%ROWTYPE;
  entry jsonb; account uuid; amount numeric; debits numeric:=0; credits numeric:=0;
  journal uuid; recorded timestamptz; event uuid; event_type text;
BEGIN
  actor:=accounting.assert_posting_actor();
  IF jsonb_typeof(data) IS DISTINCT FROM 'object' OR NOT (data ?& ARRAY['sourceEventId','postingKind','postingRuleVersionId','effectiveDate','currency','lines','reversalOfJournalId'])
    OR data-ARRAY['sourceEventId','postingKind','postingRuleVersionId','effectiveDate','currency','lines','reversalOfJournalId']<>'{}'::jsonb
    OR data->>'currency' IS DISTINCT FROM 'PHP' OR jsonb_typeof(data->'lines') IS DISTINCT FROM 'array'
    OR jsonb_array_length(data->'lines') NOT BETWEEN 2 AND 100
    OR length(data->>'postingKind') NOT BETWEEN 1 AND 100 OR COALESCE(correlation,'')='' OR length(correlation)>200
    OR COALESCE(data->>'effectiveDate','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
    RAISE EXCEPTION 'Invalid posting request' USING ERRCODE='AG422';
  END IF;
  source:=(data->>'sourceEventId')::uuid; rule:=(data->>'postingRuleVersionId')::uuid; day:=(data->>'effectiveDate')::date;
  IF source IS NULL OR rule IS NULL THEN RAISE EXCEPTION 'Missing posting identity' USING ERRCODE='AG422'; END IF;

  -- A committed exact replay remains valid after its original period closes.
  SELECT * INTO previous FROM accounting.journals WHERE organization_id=org AND source_event_id=source;
  IF FOUND THEN
    IF previous.request<>data THEN RAISE EXCEPTION 'Financial event identity conflict' USING ERRCODE='AG412'; END IF;
    RETURN jsonb_build_object('journalId',previous.id,'sourceEventId',source,'postedAt',previous.posted_at);
  END IF;
  period:=accounting.lock_period(day);
  -- Lock order: period, caller-owned sorted loan/command locks, then source event.
  -- A caller that locks loans first must call lockPostingPeriod before doing so.
  PERFORM pg_advisory_xact_lock(hashtextextended(org::text||':'||source::text,0));
  SELECT * INTO previous FROM accounting.journals WHERE organization_id=org AND source_event_id=source;
  IF FOUND THEN
    IF previous.request<>data THEN RAISE EXCEPTION 'Financial event identity conflict' USING ERRCODE='AG412'; END IF;
    RETURN jsonb_build_object('journalId',previous.id,'sourceEventId',source,'postedAt',previous.posted_at);
  END IF;

  FOR entry IN SELECT value FROM jsonb_array_elements(data->'lines') LOOP
    IF jsonb_typeof(entry) IS DISTINCT FROM 'object' OR NOT (entry ?& ARRAY['accountId','side','amountCentavos'])
      OR entry-ARRAY['accountId','side','amountCentavos']<>'{}'::jsonb
      OR jsonb_typeof(entry->'amountCentavos') IS DISTINCT FROM 'number'
      OR COALESCE(entry->>'amountCentavos','') !~ '^[0-9]+$'
      OR COALESCE(entry->>'side','') NOT IN ('debit','credit') THEN
      RAISE EXCEPTION 'Invalid journal line' USING ERRCODE='AG422';
    END IF;
    amount:=(entry->>'amountCentavos')::numeric; account:=(entry->>'accountId')::uuid;
    IF amount NOT BETWEEN 1 AND 9007199254740991 OR NOT EXISTS(
      SELECT 1 FROM accounting.accounts a WHERE a.organization_id=org AND a.id=account AND a.active AND a.currency=data->>'currency'
    ) THEN RAISE EXCEPTION 'Invalid journal account or amount' USING ERRCODE='AG422'; END IF;
    IF entry->>'side'='debit' THEN debits:=debits+amount; ELSE credits:=credits+amount; END IF;
  END LOOP;
  IF debits<>credits OR debits NOT BETWEEN 1 AND 9007199254740991 THEN
    RAISE EXCEPTION 'Journal lines must balance within the safe centavo range' USING ERRCODE='AG422';
  END IF;

  IF data->>'reversalOfJournalId' IS NULL THEN
    IF NOT EXISTS(SELECT 1 FROM accounting.posting_rules r WHERE r.organization_id=org AND r.id=rule
      AND r.posting_kind=data->>'postingKind' AND r.currency=data->>'currency'
      AND day>=r.effective_from AND (r.effective_to IS NULL OR day<=r.effective_to)) THEN
      RAISE EXCEPTION 'Posting rule is unavailable for this date and event' USING ERRCODE='AG422';
    END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(data->'lines') e WHERE NOT EXISTS(
      SELECT 1 FROM accounting.rule_accounts r WHERE r.organization_id=org AND r.rule_id=rule
        AND r.account_id=(e->>'accountId')::uuid AND r.side=e->>'side')) THEN
      RAISE EXCEPTION 'Account direction is not permitted by the posting rule' USING ERRCODE='AG422';
    END IF;
  ELSE
    SELECT * INTO original FROM accounting.journals WHERE organization_id=org AND id=(data->>'reversalOfJournalId')::uuid FOR UPDATE;
    IF NOT FOUND OR original.reversal_of_journal_id IS NOT NULL OR data->>'postingKind'<>'reversal'
      OR rule<>original.posting_rule_version_id OR data->>'currency'<>original.currency THEN
      RAISE EXCEPTION 'Invalid reversal basis' USING ERRCODE='AG422';
    END IF;
    IF EXISTS(SELECT 1 FROM accounting.journals WHERE organization_id=org AND reversal_of_journal_id=original.id) THEN
      RAISE EXCEPTION 'Journal already reversed' USING ERRCODE='AG412';
    END IF;
    IF EXISTS(
      (SELECT (e->>'accountId')::uuid, e->>'side', (e->>'amountCentavos')::bigint FROM jsonb_array_elements(data->'lines') e
       EXCEPT ALL SELECT account_id,CASE side WHEN 'debit' THEN 'credit' ELSE 'debit' END,amount_centavos
       FROM accounting.journal_lines WHERE organization_id=org AND journal_id=original.id)
      UNION ALL
      (SELECT account_id,CASE side WHEN 'debit' THEN 'credit' ELSE 'debit' END,amount_centavos
       FROM accounting.journal_lines WHERE organization_id=org AND journal_id=original.id
       EXCEPT ALL SELECT (e->>'accountId')::uuid,e->>'side',(e->>'amountCentavos')::bigint FROM jsonb_array_elements(data->'lines') e)
    ) THEN RAISE EXCEPTION 'A full reversal must exactly offset the original lines' USING ERRCODE='AG422'; END IF;
  END IF;

  journal:=gen_random_uuid(); recorded:=clock_timestamp(); event:=gen_random_uuid();
  event_type:=CASE WHEN original.id IS NULL THEN 'accounting.journal_posted' ELSE 'accounting.journal_reversed' END;
  INSERT INTO accounting.journals(id,organization_id,source_event_id,posting_kind,posting_rule_version_id,effective_date,period_id,currency,reversal_of_journal_id,request,posted_by,posted_at)
    VALUES(journal,org,source,data->>'postingKind',rule,day,period,data->>'currency',original.id,data,actor,recorded);
  INSERT INTO accounting.journal_lines(organization_id,journal_id,line_number,account_id,side,amount_centavos)
    SELECT org,journal,ordinality::integer,(value->>'accountId')::uuid,value->>'side',(value->>'amountCentavos')::bigint
    FROM jsonb_array_elements(data->'lines') WITH ORDINALITY;
  INSERT INTO platform.audit_events(id,organization_id,user_id,event_type,aggregate_id,aggregate_version,correlation_id)
    VALUES(event,org,actor,event_type,journal,1,correlation);
  INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES(event,org,event_type,
    jsonb_build_object('id',event,'type',event_type,'schemaVersion',1,'organizationId',org,'aggregateId',journal,
      'aggregateVersion',1,'occurredAt',recorded,'correlationId',correlation,'payload','{}'::jsonb));
  RETURN jsonb_build_object('journalId',journal,'sourceEventId',source,'postedAt',recorded);
END $$;
REVOKE ALL ON FUNCTION accounting.post_journal(jsonb,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accounting.post_journal(jsonb,text) TO agap_runtime;
