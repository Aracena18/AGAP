import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { previewBundle } from './bundle.js';
import { corpusHash, serialize, sha256, validateCorpus, type Corpus, type Finding } from './model.js';

const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const text = (value: string) => `<pre>${escape(value)}</pre>`;
const label = (value: string) => value.replaceAll('_', ' ');
/** Display exact centavos without losing a cent through floating-point division. */
export function reviewMoney(value: Finding['value']): string {
  if (value.availability === 'unavailable') return `Unavailable — ${value.reason}`;
  const amount = BigInt(value.amountCentavos);
  return `PHP ${(amount / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${(amount % 100n).toString().padStart(2, '0')} (${amount} centavos)`;
}
const questions = [
  { id: 'label_truth', owner: 'Independent label/domain reviewer', question: 'Check each amount, date, excerpt, unknown, recurrence and next action against the supplied source. Record disagreements and corrections; generated validation is not independent semantic review.' },
  { id: 'image_coverage', owner: 'Earl and source reviewers', question: 'Agree adequate source/template/image coverage. Public text recipes and an ILLEGIBLE/CROPPED transcription placeholder do not establish realistic scan/OCR performance.' },
  { id: 'training_lineage', owner: 'Benedict and Earl', question: 'Identify cases, templates and sources already used in training or prompt selection before selecting fresh holdout families. New IDs/seeds do not make familiar content unseen.' },
  { id: 'interface', owner: 'Benedict; Robert for shared compatibility', question: 'Confirm the supplied input/target/schema interface, integer centavos, calendar dates, missing-value handling, source references and model task with the actual loader. Do not change the shared contract through this worksheet.' },
  { id: 'protocol', owner: 'Earl and receiving reviewers', question: 'Agree the primary measure, acceptable regressions, baseline/checklist/plain-form conditions, resource limits and correction review before final evaluation. No thresholds or successful model results are supplied here.' },
  { id: 'holdout', owner: 'Earl and Robert', question: 'Agree independently authored families, protected evaluator-controlled storage/access and review evidence. No holdout sources, labels, recipes or seeds belong in this public pack.' },
];
function inventory(corpus: Corpus) {
  const casesFor = (key: (item: Corpus['cases'][number]) => string[]) => {
    const groups = new Map<string, string[]>();
    for (const item of corpus.cases) for (const value of new Set(key(item))) { const group = groups.get(value) ?? []; group.push(item.id); groups.set(value, group); }
    return [...groups.keys()].sort().map(value => ({ value, caseIds: groups.get(value)! }));
  };
  return {
    schemaVersion: 'eval-01-review-coverage/v1', inputCorpusSha256: corpusHash(corpus),
    counts: { cases: corpus.cases.length, sourcePages: corpus.cases.reduce((n, c) => n + c.sources.length, 0), expectedFields: corpus.cases.reduce((n, c) => n + c.expected.length, 0) },
    coverageTags: casesFor(c => c.coverage), householdGroups: casesFor(c => [c.householdGroup]), scenarioGroups: casesFor(c => [c.scenarioGroup]), templateFamilies: casesFor(c => c.sources.map(s => s.templateFamily)),
    limitations: ['Coverage tags are author annotations, not proof of sufficient coverage.', 'Unique household/scenario/template counts are not independent statistical sample sizes. Connected groups must remain together under the existing splitter.', 'Expected answers are authored development candidates awaiting independent review; supported does not mean independently verified.', 'No model has been executed or evaluated by this pack.'],
    openReviewQuestions: questions,
  };
}
function markdown(corpus: Corpus, coverage: ReturnType<typeof inventory>): string {
  const lines = ['# EVAL-01 development review pack', '', '**FICTIONAL — REVIEW PENDING. Development answer key included. This is not a training release or an untouched test set.**', '',
    `Corpus: ${corpus.id} / ${corpus.version}`, `Corpus SHA-256: ${corpusHash(corpus)}`, '',
    `${coverage.counts.cases} cases · ${coverage.counts.sourcePages} source pages · ${coverage.counts.expectedFields} expected fields.`, '',
    '## How to review', '', 'Read the complete source first, then compare the candidate answer and rationale. Check amount/availability, cash date, relevance, recurrence, next action, clarification question and exact citation. Record corrections in a separate copy of review-worksheet.json; do not overwrite the original pack. The worksheet is not the freeze command’s approval record.', '',
    'Training means practice; validation guides development; holdout is the protected final exam. This pack only supplies public development material. An ignored folder alone does not protect a holdout.', '',
    '## Coverage and open questions', '', ...coverage.limitations.map(item => `- ${item}`), '',
    ...coverage.coverageTags.map(tag => `- ${tag.value}: ${tag.caseIds.join(', ')}`), '',
    ...questions.flatMap(q => [`### ${q.id.replaceAll('_', ' ')}`, '', `${q.owner}: ${q.question}`, '']),
    '## Case index', '', ...corpus.cases.map(item => `- [${item.id}](#${item.id})`), ''];
  for (const item of corpus.cases) {
    lines.push(`## ${item.id}`, '', `Household: ${item.householdGroup} · Scenario: ${item.scenarioGroup}`, `Coverage: ${item.coverage.join(', ')}`, `Requested fields: ${item.requestedFields.join(', ')}`, '', '### Complete fictional sources', '');
    for (const source of item.sources) lines.push(`#### Source ${source.id}`, '', `Version ${source.version} · Page ${source.page} · Document date: ${source.documentDate ?? 'Unavailable'} · Template: ${source.templateFamily}`, `Text SHA-256: ${source.sha256}`, '', text(source.text), '');
    lines.push('### Candidate expected answers — review pending', '');
    for (const finding of item.expected) {
      lines.push(`#### ${finding.field}`, '', text(`Value: ${reviewMoney(finding.value)}\nCash date: ${finding.cashDate ?? 'Unavailable / not assigned'}\nRelevance: ${finding.relevance}\nRecurrence: ${finding.recurrence}\nNext action: ${finding.action}\nClarification question: ${finding.question ?? 'None specified'}`), '');
      for (const ref of finding.sources) lines.push(`Citation: ${ref.sourceId}, version ${ref.sourceVersion}, page ${ref.page ?? 1}`, '', text(ref.excerpt), '');
    }
    lines.push('### Authored rationale — review pending', '', text(item.rationale), '');
  }
  return lines.join('\n');
}
function html(corpus: Corpus, coverage: ReturnType<typeof inventory>): string {
  const e = escape;
  const cases = corpus.cases.map(item => `<section id="${item.id}" class="case" aria-labelledby="title-${item.id}"><h2 id="title-${item.id}">${item.id}</h2><p>Household: ${e(item.householdGroup)} · Scenario: ${e(item.scenarioGroup)}</p><p>Coverage: ${e(item.coverage.join(', '))}</p><p>Requested fields: ${e(item.requestedFields.join(', '))}</p><div class="columns"><section><h3>Complete fictional sources</h3>${item.sources.map(source => `<article id="source-${source.id}"><h4>Source ${source.id}</h4><p>Version ${source.version} · Page ${source.page} · Document date: ${source.documentDate ?? 'Unavailable'}</p><p>Template: ${e(source.templateFamily)} · Text SHA-256: <code>${source.sha256}</code></p>${text(source.text)}</article>`).join('')}</section><section><h3>Candidate expected answers — review pending</h3>${item.expected.map(finding => `<article><h4>${e(label(finding.field))}</h4><dl><dt>Field</dt><dd><code>${finding.field}</code></dd><dt>Expected value</dt><dd>${e(reviewMoney(finding.value))}</dd><dt>Cash date</dt><dd>${finding.cashDate ?? 'Unavailable / not assigned'}</dd><dt>Relevance</dt><dd>${e(label(finding.relevance))}</dd><dt>Recurrence</dt><dd>${e(label(finding.recurrence))}</dd><dt>Next action</dt><dd>${finding.action}</dd><dt>Clarification question</dt><dd>${e(finding.question ?? 'None specified')}</dd></dl>${finding.sources.map(ref => `<p><a href="#source-${ref.sourceId}">Source ${ref.sourceId}, version ${ref.sourceVersion}, page ${ref.page ?? 1}</a></p><blockquote>${e(ref.excerpt)}</blockquote>`).join('')}</article>`).join('')}</section></div><h3>Authored rationale — review pending</h3>${text(item.rationale)}<p><a href="#review-index">Back to case index</a></p></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>EVAL-01 development review pack</title><style>
html{color-scheme:light;font:16px/1.6 system-ui,sans-serif;background:#fff;color:#222}body{max-width:1160px;margin:auto;padding:24px}a{color:#174ea6}a:focus-visible{outline:3px solid #174ea6;outline-offset:3px}h1{line-height:1.2}h2,h3,h4{line-height:1.4}p,dd,code,blockquote{overflow-wrap:anywhere}header,.notice{padding:20px;border:1px solid #bbb;border-radius:8px}.case{border-top:2px solid #777;margin-top:32px;padding-top:16px}.columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.columns>section{min-width:0}article{border:1px solid #ccc;padding:16px;margin-block:16px}pre{font:14px/1.7 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:#f4f4f4}dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 16px}dd{margin:0}blockquote{margin:12px 0;padding-left:16px;border-left:3px solid #999}nav ul{display:flex;flex-wrap:wrap;gap:8px 24px;padding-left:24px}nav a{display:inline-flex;min-height:44px;align-items:center}@media(max-width:48rem){body{padding:16px}.columns,dl{grid-template-columns:minmax(0,1fr)}dd{margin-bottom:8px}}@media print{.columns{display:block}article{break-inside:avoid}body{max-width:none;padding:0}}
</style></head><body><a href="#review-main">Skip to review content</a><header><h1>EVAL-01 development review pack</h1><p><strong>FICTIONAL — REVIEW PENDING</strong></p><p>Development answer key included. This is not a training release or an untouched test set.</p><p>${coverage.counts.cases} cases · ${coverage.counts.sourcePages} source pages · ${coverage.counts.expectedFields} expected fields</p><p>${e(corpus.id)} / ${e(corpus.version)} · Corpus SHA-256: <code>${corpusHash(corpus)}</code></p></header><main id="review-main" tabindex="-1"><section><h2>How to review</h2><p>Read the complete source, then compare the candidate answer and rationale. Check the amount or missing state, cash date, recurrence, relevance, next action and citation. Copy review-worksheet.json separately to record disagreements and corrections. The worksheet is not release approval.</p><p>Training is practice; validation guides development; holdout is a protected final exam. This pack supplies public development material only.</p><ul>${coverage.limitations.map(limit => `<li>${e(limit)}</li>`).join('')}</ul></section><section><h2>Coverage inventory</h2><ul>${coverage.coverageTags.map(tag => `<li>${e(label(tag.value))}: ${tag.caseIds.map(id => `<a href="#${id}">${id}</a>`).join(', ')}</li>`).join('')}</ul><h3>Open review questions</h3>${questions.map(q => `<p><strong>${e(q.owner)}</strong>: ${e(q.question)}</p>`).join('')}</section><nav id="review-index" aria-label="Review cases"><h2>Case index</h2><ul>${corpus.cases.map(c => `<li><a href="#${c.id}">${c.id}</a></li>`).join('')}</ul></nav>${cases}</main><footer><p>All material is fictional. No model inference, reviewer approval, final holdout or promotion decision is supplied.</p></footer></body></html>\n`;
}
export function buildReviewPack(input: unknown) {
  const corpus = validateCorpus(input), bundle = previewBundle(corpus); // Reject reserved holdouts before creating any files.
  const coverage = inventory(corpus);
  const worksheet = {
    schemaVersion: 'eval-01-review-worksheet/v1', inputCorpusSha256: corpusHash(corpus), status: 'pending',
    labelReviewer: null, interfaceReviewer: null, reviewedOn: null,
    cases: corpus.cases.map(item => ({ caseId: item.id, fields: item.expected.map(finding => ({ field: finding.field, decision: 'pending', comment: null })), rationaleDecision: 'pending', comment: null })),
    questions: questions.map(q => ({ id: q.id, decision: 'pending', comment: null })),
    releaseApproval: null,
  };
  const files: Record<string, string> = {
    ...Object.fromEntries(Object.entries(bundle.files).map(([name, value]) => [`development/${name}`, value])),
    'development/manifest.json': serialize(bundle.manifest),
    'review.md': markdown(corpus, coverage), 'review.html': html(corpus, coverage),
    'coverage.json': serialize(coverage), 'review-worksheet.json': serialize(worksheet),
  };
  const manifest = { schemaVersion: 'eval-01-review-pack/v1', kind: 'development_review_pack', inputCorpusSha256: corpusHash(corpus), reviewStatus: 'pending', holdout: null, trainingRelease: false,
    artifacts: Object.entries(files).map(([name, value]) => ({ name, sha256: sha256(value) })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0) };
  return { files, manifest };
}
export async function writeReviewPack(output: string, input: unknown) {
  const pack = buildReviewPack(input), folder = resolve(output);
  await mkdir(dirname(folder), { recursive: true }); await mkdir(folder); await mkdir(resolve(folder, 'development'));
  for (const [name, content] of Object.entries(pack.files)) await writeFile(resolve(folder, name), content, { encoding: 'utf8', flag: 'wx' });
  await writeFile(resolve(folder, 'manifest.json'), serialize(pack.manifest), { encoding: 'utf8', flag: 'wx' });
  return pack.manifest;
}
export async function verifyReviewPack(output: string) {
  const folder = resolve(output);
  // Reject unexpected entries and symlinks before reading a corpus or any candidate artifact.
  const rootNames = ['coverage.json', 'development', 'manifest.json', 'review-worksheet.json', 'review.html', 'review.md'];
  const dataNames = ['corpus.json', 'development.inputs.jsonl', 'development.targets.jsonl', 'finding.schema.json', 'manifest.json'];
  for (const [directory, names] of [[folder, rootNames], [resolve(folder, 'development'), dataNames]] as const) {
    if (!(await lstat(directory)).isDirectory() || (await readdir(directory)).sort().join('|') !== [...names].sort().join('|')) throw new Error('Review pack inventory differs.');
    for (const name of names) { const entry = await lstat(resolve(directory, name)); if (name === 'development' ? !entry.isDirectory() : !entry.isFile()) throw new Error('Review pack links or non-file entries are not allowed.'); }
  }
  const expected = buildReviewPack(JSON.parse(await readFile(resolve(folder, 'development/corpus.json'), 'utf8')));
  const manifest = JSON.parse(await readFile(resolve(folder, 'manifest.json'), 'utf8'));
  if (serialize(manifest) !== serialize(expected.manifest)) throw new Error('Review pack manifest is inconsistent with its pending development corpus.');
  for (const [name, value] of Object.entries(expected.files)) if (await readFile(resolve(folder, name), 'utf8') !== value) throw new Error(`Review artifact differs: ${name}`);
  return expected.manifest;
}
