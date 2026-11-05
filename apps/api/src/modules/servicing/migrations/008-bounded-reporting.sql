-- Source-owned seek support; previously applied migrations and financial transitions stay intact.
-- The existing UNIQUE(organization_id,event_id) already supports posting seeks.
CREATE INDEX reporting_money_revision_cutoff ON servicing.money_revisions(organization_id,command_id,version DESC) INCLUDE(recorded_at);
CREATE INDEX reporting_legacy_revision_cutoff ON servicing.command_revisions(organization_id,command_id,version DESC) INCLUDE(recorded_at);
