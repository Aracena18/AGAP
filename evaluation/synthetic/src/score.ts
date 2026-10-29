import { corpusHash, PredictionsSchema, validateCorpus, validateReferences, type Finding } from './model.js';

const sameValue = (a: Finding['value'], b: Finding['value']) => a.availability === b.availability
  && (a.availability !== 'recorded' || (b.availability === 'recorded' && a.amountCentavos === b.amountCentavos));
const referenceKeys = (item: Finding) => item.sources.map(ref => `${ref.sourceId}:${ref.sourceVersion}:${ref.page ?? 1}`).sort().join('|');

export function scorePredictions(corpusInput: unknown, predictionInput: unknown) {
  const corpus = validateCorpus(corpusInput), predictions = PredictionsSchema.parse(predictionInput);
  if (predictions.inputCorpusSha256 !== corpusHash(corpus)) throw new Error('Prediction inputs do not match this corpus.');
  if ((predictions.run.origin === 'model') !== (predictions.run.artifact !== null)) throw new Error('Only model runs supply a required canonical model-artifact provenance record.');
  const ids = predictions.cases.map(item => item.caseId);
  if (new Set(ids).size !== ids.length || [...ids].sort().join('|') !== corpus.cases.map(item => item.id).sort().join('|')) {
    throw new Error('Predictions must contain exactly one result for every case; missing/unknown/duplicate cases cannot be omitted.');
  }
  let expectedFields = 0, returnedFields = 0, exactFields = 0, amountOrAvailabilityErrors = 0;
  let dateErrors = 0, sourceErrors = 0, actionErrors = 0, recurrenceErrors = 0, relevanceErrors = 0;
  let missingFields = 0, extraFields = 0, unsupportedRecordedValues = 0;
  const errors: { caseId: string; field: string; problems: string[] }[] = [];
  for (const item of corpus.cases) {
    const output = predictions.cases.find(row => row.caseId === item.id)!;
    const fields = output.findings.map(finding => finding.field);
    if (new Set(fields).size !== fields.length) throw new Error(`Duplicate predicted field in ${item.id}.`);
    returnedFields += fields.length;
    for (const actual of output.findings.filter(finding => !item.requestedFields.includes(finding.field))) {
      extraFields++;
      if (actual.value.availability === 'recorded') unsupportedRecordedValues++;
      errors.push({ caseId: item.id, field: actual.field, problems: ['unrequested_field'] });
    }
    for (const expected of item.expected) {
      expectedFields++;
      const actual = output.findings.find(finding => finding.field === expected.field);
      if (!actual) {
        missingFields++;
        errors.push({ caseId: item.id, field: expected.field, problems: ['missing_field'] });
        continue;
      }
      const problems: string[] = [];
      const valueMatches = sameValue(actual.value, expected.value);
      if (!valueMatches) { amountOrAvailabilityErrors++; problems.push('amount_or_availability'); }
      if (actual.cashDate !== expected.cashDate) { dateErrors++; problems.push('cash_date'); }
      let validReferences = true;
      try { validateReferences(actual, item.sources); } catch { validReferences = false; }
      const evidenceCovered = expected.sources.every(ref => actual.sources.some(citation => citation.sourceId === ref.sourceId
        && citation.sourceVersion === ref.sourceVersion && (citation.page ?? 1) === (ref.page ?? 1) && citation.excerpt.includes(ref.excerpt)));
      if (!validReferences || !evidenceCovered || referenceKeys(actual) !== referenceKeys(expected)) { sourceErrors++; problems.push('source'); }
      if (actual.action !== expected.action || (actual.action === 'clarify' && actual.question === null)) { actionErrors++; problems.push('next_action'); }
      if (actual.recurrence !== expected.recurrence) { recurrenceErrors++; problems.push('recurrence'); }
      if (actual.relevance !== expected.relevance) { relevanceErrors++; problems.push('relevance'); }
      if (actual.value.availability === 'recorded' && (!valueMatches || problems.includes('source'))) unsupportedRecordedValues++;
      if (problems.length === 0) exactFields++;
      else errors.push({ caseId: item.id, field: expected.field, problems });
    }
  }
  const measured = predictions.run.origin !== 'simulated';
  const times = measured ? predictions.cases.flatMap(item => item.elapsedMs === null ? [] : [item.elapsedMs]) : [];
  const memory = measured ? predictions.cases.flatMap(item => item.peakMemoryBytes === null ? [] : [item.peakMemoryBytes]) : [];
  return {
    schemaVersion: 'eval-01-report/v1', inputCorpusSha256: corpusHash(corpus), corpusPurpose: corpus.purpose,
    use: corpus.purpose === 'development' ? 'development_diagnostics' : 'reserved_holdout_evaluation',
    run: predictions.run, evidence: measured ? 'declared_run_outputs' : 'harness_only',
    promotion: 'not_assessed',
    counts: { cases: corpus.cases.length, expectedFields, returnedFields, exactFields, missingFields, extraFields, amountOrAvailabilityErrors, dateErrors, sourceErrors, actionErrors, recurrenceErrors, relevanceErrors, unsupportedRecordedValues },
    exactFieldAccuracy: exactFields / expectedFields,
    measurements: {
      caseDenominator: corpus.cases.length, timingCases: times.length,
      meanElapsedMs: times.length ? times.reduce((sum, time) => sum + time, 0) / times.length : null,
      memoryCases: memory.length, peakMemoryBytes: memory.length ? Math.max(...memory) : null,
    },
    limitations: [
      'Exact fields cover structured money/availability, dates, recurrence, relevance, action and valid source identity. They do not evaluate free-text meaning or document authenticity.',
      'Missing fields lower exact accuracy; additional fields and unsupported recorded values are reported separately and require review.',
      'Timing and memory are supplied measurements with explicit denominators, not independently attested by this file scorer. Simulated outputs provide no performance evidence.',
      'No participant comprehension, correction effort, fairness, causal benefit or model promotion is established by this report.',
    ],
    errors,
  };
}

