-- Fictional local development only. Ports are bound to localhost in Compose.
CREATE ROLE agap_runtime LOGIN PASSWORD 'development-runtime' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE ROLE agap_identity LOGIN PASSWORD 'development-identity' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
CREATE DATABASE keycloak;
