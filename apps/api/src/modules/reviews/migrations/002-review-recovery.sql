-- Durable completion receipts make post-inference retries return the same result.
ALTER TABLE reviews.requests ADD COLUMN receipt jsonb CHECK(receipt IS NULL OR jsonb_typeof(receipt)='object');
CREATE OR REPLACE VIEW reviews.staff_requests WITH(security_barrier=true) AS SELECT * FROM reviews.requests WHERE reviews.can_read(application_id);
GRANT SELECT(receipt) ON reviews.requests TO agap_runtime;
GRANT UPDATE(receipt) ON reviews.requests TO agap_runtime;
