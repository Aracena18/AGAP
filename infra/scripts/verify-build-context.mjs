// Exercise Docker's actual ignore semantics using synthetic sentinel files only.
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const directory = await mkdtemp(join(tmpdir(), 'agap-build-context-'));
const context = join(directory, 'context'), output = join(directory, 'output');
const included = ['package.json', 'package-lock.json', '.env.example', 'apps/api/src/public.ts', 'packages/contracts/openapi.json', 'models/qwen/model_manifest.json', 'models/qwen/service/finding.schema.json'];
const excluded = ['.env', '.git/config', '.aws/credentials', '.worktrees/other/.env', '.backups/snapshot', 'backups/database.dump',
  'private-documents/source.pdf', 'output/research.json', 'docs/DCCPEC-Docs/private.pdf', 'docs/notes.md',
  'models/qwen/base_model/weights', 'models/qwen/adapter/weights', 'models/qwen/datasets/data.json', 'models/qwen/notebooks/notebook.ipynb',
  'reviewer_1_COMPLETED.csv', 'reviewer_1_AI_REVIEW_INSTRUCTIONS.txt', 'phaseF_AI_adjudication_QA_Report.json', 'D_failure_review_queue_PRIVATE.jsonl',
  'independent_attestation_TEMPLATE.json', 'new_grounded_examples_DRAFT.jsonl', 'approval_manifest.json', 'instructions.pdf', 'review_package.zip',
  'models/some/new_PRIVATE_export.json', 'node_modules/private-package/key'];
async function files(root) {
  const result = [];
  for (const item of await readdir(root, { withFileTypes: true })) {
    if (item.isDirectory()) for (const child of await files(join(root, item.name))) result.push(`${item.name}/${child}`);
    else result.push(item.name);
  }
  return result.sort();
}
try {
  await mkdir(context);
  await copyFile('.dockerignore', join(context, '.dockerignore'));
  for (const name of [...included, ...excluded]) {
    const path = join(context, name); await mkdir(dirname(path), { recursive: true });
    await writeFile(path, 'FICTIONAL build-context sentinel\n');
  }
  await writeFile(join(directory, 'Dockerfile'), 'FROM scratch\nCOPY . /context/\n');
  const build = spawnSync('docker', ['build', '--network=none', '--file', join(directory, 'Dockerfile'), '--output', `type=local,dest=${output}`, context], { encoding: 'utf8', timeout: 60000 });
  if (build.status !== 0) throw new Error(`Synthetic build-context verification failed: ${build.error?.message ?? build.stderr}`);
  const actual = await files(join(output, 'context'));
  for (const name of included) { assert(actual.includes(name), `Required build input excluded: ${name}`); await readFile(join(output, 'context', name)); }
  for (const name of excluded) assert(!actual.includes(name), `Private/local sentinel entered build context: ${name}`);
  assert.deepEqual(actual.filter(name => name !== '.dockerignore'), [...included].sort());
  console.log(`Docker context verified: ${included.length} required inputs retained; ${excluded.length} synthetic private/local inputs excluded. No application or private files sent to the builder.`);
} finally { await rm(directory, { recursive: true, force: true }); }
