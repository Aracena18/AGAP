CREATE TABLE identity.login_limits (source_hash text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX ON identity.login_limits(expires_at);
GRANT SELECT,INSERT,UPDATE,DELETE ON identity.login_limits TO agap_identity;
