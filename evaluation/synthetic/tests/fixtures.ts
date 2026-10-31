import { type ReleaseReview } from '../src/bundle.js';
import { corpusHash, sha256, stableId, validateCorpus, type Corpus, type Predictions } from '../src/model.js';
import { developmentPilot } from '../src/pilot.js';

export const pilot = () => developmentPilot();
export function predictions(corpus = pilot(), runId = 'hand-authored-harness-fixture'): Predictions {
  return {
    schemaVersion: 'eval-01-predictions/v1', inputCorpusSha256: corpusHash(corpus),
    run: { id: runId, origin: 'simulated', artifact: null, environment: 'Fictional test outputs; no model executed.' },
    cases: corpus.cases.map(item => ({ caseId: item.id, findings: structuredClone(item.expected), elapsedMs: null, peakMemoryBytes: null })),
  };
}
// Fictional harness fixtures, never an actual accepted review or protected holdout.
export function privateFixture(): Corpus {
  const value = pilot();
  value.id = 'private-fixture'; value.purpose = 'reserved_holdout';
  value.provenance = { method: 'private_authored', seed: 'PRIVATE-FIXTURE-SEED', authoredOn: '2026-10-29' };
  value.cases = value.cases.slice(0, 1);
  const item = value.cases[0];
  item.id = 'private-fixture-case'; item.householdGroup = 'private-fixture-household'; item.scenarioGroup = 'private-fixture-scenario';
  const source = item.sources[0], oldId = source.id;
  source.id = stableId('PRIVATE-FIXTURE-IDENTITY'); source.templateFamily = 'private-fixture-template';
  source.text = source.text.replace('Household ev-01', 'Household PRIVATE-FIXTURE-TEXT').replace('Monthly payslip.', 'Distinct private fixture statement.');
  source.sha256 = sha256(source.text);
  for (const finding of item.expected) for (const citation of finding.sources) if (citation.sourceId === oldId) citation.sourceId = source.id;
  return validateCorpus(value);
}
export function review(development: Corpus, holdout: Corpus): ReleaseReview {
  return {
    developmentSha256: corpusHash(development), holdoutSha256: corpusHash(holdout),
    labelReviewers: ['Fictional unit-test label reviewer'], interfaceReviewers: ['Fictional unit-test interface reviewer'],
    reviewedOn: '2026-10-29', protocolVersion: 'fictional-test-protocol', primaryMeasure: 'Fixture-only exact structured fields', regressionCriteria: ['Fixture-only source and unsupported-value error checks'],
  };
}
