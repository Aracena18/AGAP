CREATE ROLE agap_worker NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA platform TO agap_worker;
GRANT EXECUTE ON FUNCTION platform.current_organization() TO agap_worker;
GRANT SELECT,UPDATE ON platform.outbox,platform.jobs TO agap_worker;
ALTER TABLE platform.outbox ADD COLUMN available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE platform.outbox ADD COLUMN failed_at timestamptz;
ALTER TABLE platform.jobs ADD COLUMN failed_at timestamptz;
CREATE INDEX ON platform.jobs(available_at) WHERE completed_at IS NULL AND failed_at IS NULL;
