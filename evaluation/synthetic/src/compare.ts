import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { corpusHash, PredictionsSchema, serialize, sha256, Sha256, validateCorpus } from './model.js';
import { scorePredictions } from './score.js';

const Text = z.string().trim().min(1).max(2000);
const RunId = PredictionsSchema.shape.run.shape.id;
const RunMetadata = { label: Text, protocolSha256: Sha256 };
export const ComparisonFilesSchema = z.strictObject({
  schemaVersion: z.literal('eval-01-comparison-files/v1'), baselineRunId: RunId,
  runs: z.array(z.strictObject({ ...RunMetadata, predictionsFile: Text })).min(2).max(16),
});
const ComparisonInputSchema = z.strictObject({
  baselineRunId: RunId,
  runs: z.array(z.strictObject({ ...RunMetadata, predictions: PredictionsSchema })).min(2).max(16),
});
type Scored = ReturnType<typeof scorePredictions>;
const fieldKey = (caseId: string, field: string) => `${caseId}:${field}`;
const problems = (report: Scored) => new Map(report.errors.map(error => [fieldKey(error.caseId, error.field), error.problems]));

function pairedMeasurements(baseline: z.output<typeof PredictionsSchema>, candidate: z.output<typeof PredictionsSchema>) {
  const unavailable = baseline.run.origin === 'simulated' || candidate.run.origin === 'simulated'
    ? 'Simulated outputs have no measured performance evidence.'
    : baseline.run.environment !== candidate.run.environment ? 'Declared execution environments differ.' : null;
  const candidates = new Map(candidate.cases.map(row => [row.caseId, row]));
  const timing: { baseline: number; candidate: number }[] = [];
  const memory: { baseline: number; candidate: number }[] = [];
  if (!unavailable) {
    for (const row of baseline.cases) {
      const other = candidates.get(row.caseId)!;
      if (row.elapsedMs !== null && other.elapsedMs !== null) timing.push({ baseline: row.elapsedMs, candidate: other.elapsedMs });
      if (row.peakMemoryBytes !== null && other.peakMemoryBytes !== null) memory.push({ baseline: row.peakMemoryBytes, candidate: other.peakMemoryBytes });
    }
  }
  const mean = (rows: typeof timing, side: 'baseline' | 'candidate') => rows.length
    ? rows.reduce((total, row) => total + row[side], 0) / rows.length : null;
  const baselineMeanElapsedMs = mean(timing, 'baseline'), candidateMeanElapsedMs = mean(timing, 'candidate');
  return {
    evidence: unavailable ? 'unavailable' : 'declared_same_environment', reason: unavailable,
    caseDenominator: baseline.cases.length, timingCases: timing.length, memoryCases: memory.length,
    baselineMeanElapsedMs, candidateMeanElapsedMs,
    meanElapsedMsDelta: baselineMeanElapsedMs === null || candidateMeanElapsedMs === null ? null : candidateMeanElapsedMs - baselineMeanElapsedMs,
    baselineMeanPeakMemoryBytes: mean(memory, 'baseline'), candidateMeanPeakMemoryBytes: mean(memory, 'candidate'),
  };
}

/** Descriptive comparisons of supplied outputs; never executes or promotes a model. */
export function comparePredictions(corpusInput: unknown, comparisonInput: unknown) {
  const corpus = validateCorpus(corpusInput), input = ComparisonInputSchema.parse(comparisonInput);
  const ids = input.runs.map(row => row.predictions.run.id);
  if (new Set(ids).size !== ids.length) throw new Error('Comparison run IDs must be unique.');
  if (new Set(input.runs.map(row => row.label.toLowerCase())).size !== ids.length) throw new Error('Comparison labels must be unique.');
  const baseline = input.runs.find(row => row.predictions.run.id === input.baselineRunId);
  if (!baseline) throw new Error('The selected baseline run is missing.');
  if (input.runs.some(row => row.protocolSha256 !== baseline.protocolSha256)) throw new Error('All runs must declare the same comparison protocol hash.');
  const simulated = input.runs.filter(row => row.predictions.run.origin === 'simulated').length;
  if (simulated && simulated !== ids.length) throw new Error('Simulated and declared runs must be compared separately.');
  const models = input.runs.filter(row => row.predictions.run.origin === 'model');
  if (models.some(row => row.predictions.run.artifact?.promptVersion !== models[0].predictions.run.artifact?.promptVersion
    || row.predictions.run.artifact?.schemaVersion !== models[0].predictions.run.artifact?.schemaVersion))
    throw new Error('Model runs must use matching declared prompt and output-schema versions.');

  // Reuse the authoritative scorer for every run, including case/field/provenance checks.
  const runs = input.runs.map(row => ({
    label: row.label, predictionsSha256: sha256(serialize(row.predictions)), report: scorePredictions(corpus, row.predictions),
  })).sort((left, right) => left.report.run.id < right.report.run.id ? -1 : 1);
  const baselineReport = runs.find(row => row.report.run.id === input.baselineRunId)!.report;
  const baselineProblems = problems(baselineReport);
  const comparisons = input.runs.filter(row => row !== baseline).map(candidate => {
    const candidateReport = runs.find(row => row.report.run.id === candidate.predictions.run.id)!.report;
    const candidateProblems = problems(candidateReport);
    const fields = corpus.cases.flatMap(item => item.expected.map(expected => {
      const before = baselineProblems.get(fieldKey(item.id, expected.field)) ?? [];
      const after = candidateProblems.get(fieldKey(item.id, expected.field)) ?? [];
      const outcome = before.length ? after.length ? 'both_incorrect' : 'improved' : after.length ? 'regressed' : 'both_correct';
      return { caseId: item.id, field: expected.field, outcome, baselineProblems: before, candidateProblems: after };
    })).sort((left, right) => fieldKey(left.caseId, left.field).localeCompare(fieldKey(right.caseId, right.field)));
    const count = (outcome: string) => fields.filter(field => field.outcome === outcome).length;
    const countDeltas = Object.fromEntries(Object.entries(candidateReport.counts).map(([key, value]) => [key, value - baselineReport.counts[key as keyof typeof baselineReport.counts]]));
    return {
      baselineRunId: input.baselineRunId, candidateRunId: candidate.predictions.run.id,
      deltaDirection: 'candidate_minus_baseline', countDeltas,
      exactFieldAccuracyDelta: candidateReport.exactFieldAccuracy - baselineReport.exactFieldAccuracy,
      pairedFields: { denominator: fields.length, improved: count('improved'), regressed: count('regressed'),
        bothCorrect: count('both_correct'), bothIncorrect: count('both_incorrect'), fields },
      pairedMeasurements: pairedMeasurements(baseline.predictions, candidate.predictions),
    };
  }).sort((left, right) => left.candidateRunId < right.candidateRunId ? -1 : 1);
  return {
    schemaVersion: 'eval-01-comparison-report/v1', inputCorpusSha256: corpusHash(corpus), corpusPurpose: corpus.purpose,
    use: corpus.purpose === 'development' ? 'development_diagnostics' : 'reserved_holdout_evaluation',
    protocolSha256: baseline.protocolSha256, comparability: 'declared_same_protocol', baselineRunId: input.baselineRunId,
    evidence: simulated ? 'harness_only' : 'declared_run_outputs', promotion: 'not_assessed', runs, comparisons,
    limitations: [
      'Protocol hashes and run provenance are declarations, not attestation of identical inputs/settings, actual execution or independent review.',
      'Each candidate is paired with the selected baseline on every expected field. Missing fields remain errors; unsolicited findings are counted separately.',
      'Positive count deltas mean more of that count; more errors is worse. Improvements and regressions are descriptive, not statistical significance or a promotion decision.',
      'Cases/fields can share household or scenario groups. No confidence interval, independent sample-size claim or population benefit is established.',
      'Paired resource summaries use only cases measured in both runs under the same declared environment. Missing measurements remain null.',
      'Free-text meaning, participant effort and real household outcomes remain unmeasured. Keep holdout error reports evaluator-controlled during model selection.',
    ],
  };
}
export type ComparisonReport = ReturnType<typeof comparePredictions>;

const cell = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('|', '&#124;').replaceAll('\n', ' ').replaceAll('\r', ' ').replaceAll('`', '&#96;').replaceAll('[', '&#91;').replaceAll(']', '&#93;');
export function comparisonMarkdown(report: ComparisonReport): string {
  const lines = ['# EVAL-01 run comparison', '', `Evidence: **${report.evidence}**. Use: **${report.use}**. Promotion: **not_assessed**.`, '',
    `Corpus: ${report.inputCorpusSha256}`, `Protocol: ${report.protocolSha256}`, `Baseline: ${cell(report.baselineRunId)}`, '',
    '| Run | Origin | Exact fields | Missing | Extra | Unsupported recorded values | Source errors |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: |'];
  for (const { label, report: run } of report.runs) lines.push(`| ${cell(label)} (${cell(run.run.id)}) | ${run.run.origin} | ${run.counts.exactFields}/${run.counts.expectedFields} | ${run.counts.missingFields} | ${run.counts.extraFields} | ${run.counts.unsupportedRecordedValues} | ${run.counts.sourceErrors} |`);
  lines.push('', '| Error category | ' + report.runs.map(run => cell(run.report.run.id)).join(' | ') + ' |',
    '| --- | ' + report.runs.map(() => '---:').join(' | ') + ' |');
  const errorCategories = { amountOrAvailabilityErrors: 'Amount or availability', dateErrors: 'Cash date', sourceErrors: 'Source',
    actionErrors: 'Next action', recurrenceErrors: 'Recurrence', relevanceErrors: 'Relevance' };
  for (const [key, label] of Object.entries(errorCategories))
    lines.push(`| ${label} | ${report.runs.map(run => run.report.counts[key as keyof typeof errorCategories]).join(' | ')} |`);
  for (const comparison of report.comparisons) {
    const pair = comparison.pairedFields, measured = comparison.pairedMeasurements;
    lines.push('', `## ${cell(comparison.candidateRunId)} versus baseline`, '',
      `Expected fields: ${pair.denominator}; improved: ${pair.improved}; regressed: ${pair.regressed}; both correct: ${pair.bothCorrect}; both incorrect: ${pair.bothIncorrect}.`, '',
      'Counts in JSON use candidate minus baseline; positive error deltas mean more errors.', '',
      `Paired timing cases: ${measured.timingCases}/${measured.caseDenominator}. Baseline/candidate mean elapsed ms: ${measured.baselineMeanElapsedMs ?? 'Unavailable'} / ${measured.candidateMeanElapsedMs ?? 'Unavailable'}.`,
      `Paired memory cases: ${measured.memoryCases}/${measured.caseDenominator}. Baseline/candidate mean per-case peak bytes: ${measured.baselineMeanPeakMemoryBytes ?? 'Unavailable'} / ${measured.candidateMeanPeakMemoryBytes ?? 'Unavailable'}.`, '');
    if (measured.reason) lines.push(cell(measured.reason), '');
    lines.push('| Case | Field | Outcome | Baseline problems | Candidate problems |', '| --- | --- | --- | --- | --- |');
    for (const field of pair.fields.filter(field => field.outcome !== 'both_correct'))
      lines.push(`| ${cell(field.caseId)} | ${cell(field.field)} | ${field.outcome} | ${field.baselineProblems.join(', ') || 'None'} | ${field.candidateProblems.join(', ') || 'None'} |`);
    if (pair.fields.every(field => field.outcome === 'both_correct')) lines.push('| — | — | All expected fields correct | None | None |');
  }
  lines.push('', '## Limits', '', ...report.limitations.map(limit => `- ${limit}`), '');
  return lines.join('\n');
}

/** Exclusive output directory; manifest is written last as the completion marker. */
export async function writeComparison(directory: string, report: ComparisonReport): Promise<void> {
  const output = resolve(directory);
  await mkdir(dirname(output), { recursive: true });
  await mkdir(output);
  const files = { 'comparison.json': serialize(report), 'comparison.md': comparisonMarkdown(report) };
  for (const [name, content] of Object.entries(files)) await writeFile(resolve(output, name), content, { encoding: 'utf8', flag: 'wx' });
  await writeFile(resolve(output, 'manifest.json'), serialize({
    schemaVersion: 'eval-01-comparison-artifacts/v1', inputCorpusSha256: report.inputCorpusSha256,
    artifacts: Object.entries(files).map(([name, content]) => ({ name, sha256: sha256(content) })),
  }), { encoding: 'utf8', flag: 'wx' });
}
