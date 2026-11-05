-- Additive codec upgrade. Existing snapshot text, hashes and documents are untouched.
ALTER TABLE decisions.records DROP CONSTRAINT records_snapshot_format_check;
ALTER TABLE decisions.records ADD CONSTRAINT records_snapshot_format_check CHECK ((
  (snapshot_format='decision-snapshot-v1' AND NOT (snapshot ? 'format') AND NOT (snapshot->'basis' ? 'workflowBasis'))
  OR (snapshot_format='decision-snapshot/v2' AND snapshot->>'format'='decision-snapshot/v2'
    AND snapshot->'basis'->'workflowBasis'->>'format'='workflow-decision-basis/v1')
) IS TRUE);
