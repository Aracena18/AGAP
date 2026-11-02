import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freezeBundle, previewBundle, requireExternalHoldout, verifyBundle, writeBundle } from './bundle.js';
import { corpusHash, serialize, sha256, validateCorpus } from './model.js';
import { developmentPilot } from './pilot.js';
import { renderSources } from './render.js';
import { scorePredictions } from './score.js';
import { ComparisonFilesSchema, comparePredictions, writeComparison } from './compare.js';

const help = `EVAL-01 offline candidate tools (run through npx tsx):
  cli.ts preview --out DIRECTORY [--seed TEXT]
  cli.ts validate --corpus FILE
  cli.ts verify --bundle DIRECTORY
  cli.ts freeze --corpus FILE --holdout FILE --review FILE --split-seed TEXT --out DIRECTORY
  cli.ts score --corpus FILE --predictions FILE --out FILE [--release BUNDLE_DIRECTORY]
  cli.ts compare --corpus FILE --runs FILE --out DIRECTORY [--release BUNDLE_DIRECTORY]
  cli.ts render --corpus FILE --out DIRECTORY
Preview is development-only. Freeze needs actual hash-bound reviews and a private holdout outside the checkout.
Output directories/files must be new. No command downloads data, trains models, or calls an inference provider.`;
const allowed: Record<string, string[]> = {
  preview: ['out', 'seed'], validate: ['corpus'], verify: ['bundle'],
  freeze: ['corpus', 'holdout', 'review', 'split-seed', 'out'], score: ['corpus', 'predictions', 'out', 'release'], render: ['corpus', 'out'],
  compare: ['corpus', 'runs', 'out', 'release'],
};
export function parseArgs(argv: string[]) {
  const [command, ...args] = argv;
  if (!command || command === '--help' || command === 'help') return { command: 'help', options: {} as Record<string, string> };
  if (!Object.hasOwn(allowed, command)) throw new Error('Unknown command. Use --help.');
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, ''), value = args[i + 1];
    if (!args[i].startsWith('--') || !allowed[command].includes(key) || !value || value.startsWith('--') || Object.hasOwn(options, key)) throw new Error('Unknown, repeated or incomplete option. Use --help.');
    options[key] = value;
  }
  const required = allowed[command].filter(key => !(command === 'preview' && key === 'seed') && !(['score', 'compare'].includes(command) && key === 'release'));
  for (const key of required) if (!options[key]?.trim()) throw new Error(`Missing --${key}.`);
  return { command, options };
}
const readJson = async (file: string): Promise<unknown> => JSON.parse(await readFile(resolve(file), 'utf8'));
async function scoringCorpus(file: string, release?: string) {
  const corpus = validateCorpus(await readJson(file));
  if (corpus.purpose === 'reserved_holdout') {
    await requireExternalHoldout(file, fileURLToPath(new URL('../../../', import.meta.url)));
    if (!release) throw new Error('Reserved holdout scoring requires --release with its frozen commitment.');
  }
  if (release) {
    const manifest = await verifyBundle(release);
    const expectedHash = corpus.purpose === 'reserved_holdout' ? manifest.holdout?.corpusSha256 : manifest.inputCorpusSha256;
    if (manifest.kind !== 'reviewed_training_release' || expectedHash !== corpusHash(corpus)) throw new Error('Scoring corpus does not match the reviewed release commitment.');
  }
  return corpus;
}
export async function main(argv: string[]): Promise<void> {
  const { command, options } = parseArgs(argv);
  if (command === 'help') { console.log(help); return; }
  if (command === 'preview') {
    const corpus = developmentPilot(options.seed);
    await writeBundle(options.out, previewBundle(corpus));
    console.log(serialize({ kind: 'development_preview', cases: corpus.cases.length, corpusSha256: corpusHash(corpus) }));
  } else if (command === 'validate') {
    const corpus = validateCorpus(await readJson(options.corpus));
    console.log(serialize({ purpose: corpus.purpose, cases: corpus.cases.length, corpusSha256: corpusHash(corpus) }));
  } else if (command === 'verify') {
    console.log(serialize(await verifyBundle(options.bundle)));
  } else if (command === 'freeze') {
    const checkout = fileURLToPath(new URL('../../../', import.meta.url));
    await requireExternalHoldout(options.holdout, checkout);
    const value = freezeBundle(await readJson(options.corpus), await readJson(options.holdout), await readJson(options.review), options['split-seed']);
    await writeBundle(options.out, value);
    console.log(serialize({ kind: value.manifest.kind, manifestSha256: sha256(serialize(value.manifest)), splits: value.manifest.splits, holdout: value.manifest.holdout }));
  } else if (command === 'score') {
    const corpus = await scoringCorpus(options.corpus, options.release);
    const report = scorePredictions(corpus, await readJson(options.predictions));
    await writeFile(resolve(options.out), serialize(report), { encoding: 'utf8', flag: 'wx' });
    console.log(serialize({ evidence: report.evidence, counts: report.counts, promotion: report.promotion }));
  } else if (command === 'compare') {
    const corpus = await scoringCorpus(options.corpus, options.release);
    const manifest = ComparisonFilesSchema.parse(await readJson(options.runs));
    const runs = await Promise.all(manifest.runs.map(async run => ({ label: run.label, protocolSha256: run.protocolSha256,
      predictions: await readJson(resolve(dirname(resolve(options.runs)), run.predictionsFile)) })));
    const report = comparePredictions(corpus, { baselineRunId: manifest.baselineRunId, runs });
    await writeComparison(options.out, report);
    console.log(serialize({ evidence: report.evidence, baselineRunId: report.baselineRunId,
      comparisons: report.comparisons.map(pair => ({ candidateRunId: pair.candidateRunId,
        improved: pair.pairedFields.improved, regressed: pair.pairedFields.regressed })), promotion: report.promotion }));
  } else if (command === 'render') {
    await renderSources(await readJson(options.corpus), options.out);
    console.log('Development source images rendered; no model inference was run.');
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Evaluation command failed.');
    process.exitCode = 1;
  });
}
