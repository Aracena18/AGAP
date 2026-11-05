import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ModelReviewInput, ModelReviewResult } from '../../../packages/contracts/src/model-review.js';
for (const [name, schema] of [['review.schema.json', ModelReviewResult], ['review-input.schema.json', ModelReviewInput]] as const) {
  const file = fileURLToPath(new URL(name, import.meta.url));
  const content = JSON.stringify(z.toJSONSchema(schema), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (readFileSync(file, 'utf8') !== content) throw new Error('Model review schema is stale; regenerate it');
  } else writeFileSync(file, content);
}
