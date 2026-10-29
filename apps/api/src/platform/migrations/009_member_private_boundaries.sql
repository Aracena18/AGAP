-- A member context must not expose staff audit, work queues or cached commands.
-- Existing migrations are preserved, including the earlier member schema.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['platform.idempotency','platform.audit_events','platform.outbox','platform.inbox','platform.jobs','applications.assignment_changes','members.member_revisions'] LOOP
    EXECUTE format('CREATE POLICY staff_context_only ON %s AS RESTRICTIVE USING(NULLIF(current_setting(''agap.member_id'',true),'''') IS NULL) WITH CHECK(NULLIF(current_setting(''agap.member_id'',true),'''') IS NULL)',t);
  END LOOP;
END $$;
