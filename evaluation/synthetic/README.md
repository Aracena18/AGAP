# EVAL-01 synthetic corpus and evaluation tools

Offline implementation candidate for Earl's [EVAL-01 assignment](../../Assignment.md#earl), governed by the [training/evaluation specification](../../docs/AGAP_Model_Training_Plan.md). The first deliverable is a data/protocol handoff; final comparisons depend on returned artifacts and independent holdout execution.

## Supplied development data

[pilot.ts](src/pilot.ts) contains twelve fictional development cases and fourteen source pages, with independently authored monetary expectations and source citations. The seed namespaces source identities; money and dates are fixed authored examples, not random finance-engine output. Regenerating the same seed reproduces the corpus and its hash. The repayment/strain counterfactuals share a scenario group and stay together during splitting.

Coverage includes clear payslip fields, conflicting income records, absent versus explicit-zero costs, historical repairs, farm gross/net and cash dates, beyond-cycle costs, repeated obligations, reserve/payment duplication, unreadable values, document instructions and repayment/strain reports. `rationale` explains each expected answer. These labels still require independent owner review; the tool does not create that review.

The PNG renderer produces readable text-document previews. Its unreadable-field case uses an explicitly labeled transcription placeholder; these previews are not an evaluated OCR benchmark or realistic degraded scans. Image-domain/template coverage must be reviewed and expanded for the agreed Qwen task. Renderer output hashes bind the actual browser/platform artifacts; cross-platform PNG byte identity is not promised.

The existing [demo cases](../../src/demo/cases.ts) and [historical calculation oracles](../../docs/AGAP_Product_Freeze.md#5-the-fictional-demonstration) remain known regression references. They are not copied into this corpus or presented as unseen evaluation data.

## Candidate file interfaces

All `eval-01-* /v1` envelopes in [model.ts](src/model.ts) and [bundle.ts](src/bundle.ts) are evaluation-local proposals for Robert/Aaron/Benedict to review. They do not change the canonical API contract. Money, dates, source references and model provenance reuse the [existing schemas](../../packages/contracts/src/schemas.ts).

| File | Contents |
| --- | --- |
| `corpus.json` | Versioned development sources, requested fields, expected findings, grouping and provenance; not an inference prompt |
| `finding.schema.json` | Generated JSON Schema for a candidate finding, suitable for cross-language format review |
| `*.inputs.jsonl` | One inference input per line: `caseId`, task instruction, requested field names and source documents only |
| `*.targets.jsonl` | Separate `caseId`/`findings` training or validation targets |
| `manifest.json` | Bundle kind, corpus/artifact hashes, split counts, and review/holdout commitments when applicable |
| `images.json` | Development PNG inventory, exact hashes, source identities and browser/platform settings |

A finding has `field`, canonical `value`, nullable `cashDate`, `relevance`, `recurrence`, `action`, a nullable clarification `question`, and canonical `sources`. Unavailable values have a reason rather than an invented zero. `supported` means supported by the cited fictional source, not independently verified. Unknown/conflicting facts require clarification or abstention; clarification targets include an explicit question. Only a supported recorded value is an extraction target.

Predictions use `schemaVersion: "eval-01-predictions/v1"`, `inputCorpusSha256`, a `run` record, and exactly one result per corpus case. Each result has `caseId`, `findings`, nullable `elapsedMs`, and nullable `peakMemoryBytes`. The run records `id`, `origin` (`model`, `template`, or `simulated`), `artifact`, and `environment`. A declared model run requires canonical model-artifact provenance; template/simulated runs have no model artifact. The artifact's dataset hash describes its training provenance, separately from the corpus being scored.

## Commands

Use the repository's Node 24 installation and installed dependencies. Run from the repository root. Example generated outputs below use the ignored dependency cache. Output directories and score files must be new; releases are never overwritten.

```sh
# Generate the development corpus, inputs, targets and schemas.
npx tsx evaluation/synthetic/src/cli.ts preview --out node_modules/.cache/agap-eval01/preview-v1

# Validate content/citations and verify the whole bundle inventory and hashes.
npx tsx evaluation/synthetic/src/cli.ts validate --corpus node_modules/.cache/agap-eval01/preview-v1/corpus.json
npx tsx evaluation/synthetic/src/cli.ts verify --bundle node_modules/.cache/agap-eval01/preview-v1

# Optional image previews; requires the installed Playwright Chromium browser.
npx tsx evaluation/synthetic/src/cli.ts render --corpus node_modules/.cache/agap-eval01/preview-v1/corpus.json --out node_modules/.cache/agap-eval01/images-v1

# Score supplied outputs; this does not execute a model.
npx tsx evaluation/synthetic/src/cli.ts score --corpus CORPUS_FILE --predictions PREDICTIONS_FILE --out NEW_REPORT_FILE
```

The default preview is explicitly `development_preview`, with zero training/validation release counts and no review/holdout commitment. It is suitable for label/format review and harness development. Generating it is not completion of the reviewed training handoff.

## Reviewed release and holdout protocol

Before training, agree the task/input formats, labels, split counts and primary improvement/regression criteria with the receiving owners. Size splits by independent groups, not individual rendered pages. The tool joins shared household/scenario families and identical normalized source content, then deterministically partitions whole connected groups. It rejects cross-partition identities/content; private holdout templates must also be absent from development. Human review still checks near-duplicates, undisclosed relationships and meaningful template novelty.

Earl must author/reserve the final holdout in evaluator-controlled storage outside the shared checkout, with appropriate access restrictions. A folder name, purpose flag or ignore rule does not establish isolation. Public development recipes and seeds cannot create an untouched holdout; do not relabel the pilot or its variants. Keep holdout sources, labels, recipes and seeds out of trainer bundles and tuning. Agree controlled storage, retention and later audit/reproduction with Robert. Export only commitments/counts to the shared handoff.

`freeze` needs two validated corpus files and an actual review record bound to their canonical hashes:

```sh
npx tsx evaluation/synthetic/src/cli.ts freeze --corpus DEVELOPMENT_FILE --holdout EXTERNAL_PRIVATE_FILE --review REVIEW_FILE --split-seed AGREED_SEED --out NEW_RELEASE_DIRECTORY
```

The holdout corpus has `purpose: "reserved_holdout"` and `provenance.method: "private_authored"`. The command resolves its real path and rejects files in the checkout, including ignored files and links pointing back into it. It cannot establish filesystem/account access permissions; Earl must verify those separately.

The review record requires `developmentSha256`, `holdoutSha256`, `labelReviewers`, `interfaceReviewers`, `reviewedOn`, `protocolVersion`, `primaryMeasure` and nonempty `regressionCriteria`. These are recorded review evidence, not authenticated signatures or automatically supplied approvals. No real accepted review, frozen holdout or release is bundled here. Fictional review/holdout objects in unit tests are isolated harness fixtures.

The resulting release has training/validation inputs and targets, plus holdout hashes and aggregate counts. No private holdout text, identities, seed or labels are exported. Publish the manifest hash with the handoff so recipients can verify an unchanged release; an unsigned manifest alone does not prove authorship. A changed dataset/review requires a new release. If final errors guide tuning, retire the old holdout and establish a new untouched release while preserving the prior result.

## Scoring protocol and limits

The scorer binds predictions to the input corpus hash and rejects missing/duplicate/unknown case IDs, duplicate output fields, invalid shapes and incompatible provenance. Wrong but structurally valid answers become per-field errors. Missing fields remain in the exact-accuracy denominator; unsolicited fields and unsupported recorded values are counted separately.

Exact structured accuracy requires matching amount/availability, cash date, relevance, recurrence, next action, and valid source identity with the expected evidence excerpt covered. A larger exact source excerpt is allowed; an unrelated sentence from the right document is insufficient. Unavailable-reason wording and other free-text meaning require independent semantic review. An amount mismatch, unavailable-as-recorded result, or incorrect financial citation is an unsupported-recorded-value error; this metric does not detect arbitrary claims outside the bounded output schema.

Reports identify development diagnostics versus reserved-holdout evaluation. Simulated outputs are `harness_only`, with no reported performance measurements, even if a test file supplies numbers. Other timing/memory values are declared measurements with observed-case denominators; this file scorer does not attest model execution. Missing measurements remain null. All reports leave promotion `not_assessed`.

For reserved-holdout scoring, the CLI also requires `--release REVIEWED_BUNDLE_DIRECTORY`. It verifies that bundle and its frozen holdout hash and requires the private corpus outside the shared checkout. Relabeling a corpus or passing a development preview cannot satisfy this commitment check.

Earl later executes fixed pretrained/tuned artifacts with identical held-out inputs and agreed prompts/preprocessing/limits, retaining run provenance and raw outputs. Compare the annual-expense checklist and plain form under documented conditions. Participant effort/comprehension stays unmeasured until actually observed. Model/schema accuracy, clear images and source matching establish no document authenticity or borrower outcome. Runtime promotion remains a separate reviewed Robert/Aaron handoff.

## Verification and receiving owners

```sh
npx vitest run --config evaluation/synthetic/vitest.config.ts
npx tsc -p evaluation/synthetic/tsconfig.json --noEmit
npx eslint evaluation/synthetic
```

The repository's existing test/typecheck discovery excludes `evaluation/`. Robert must register these focused commands in the shared check/CI flow before integration; this task does not edit his configuration. Continue the contributor-required `npm run check` and `npm run test:e2e` checks on the integration environment. Exact observed results and remaining dependencies belong in [Earl's handoff](../../docs/tasks/production/04-accounting-monitoring.md).

- Robert: review the candidate formats and shared-schema compatibility; register focused test/typecheck checks and update the central tracker from PR evidence.
- Benedict: review the concrete inputs/targets/schema and document format; confirm the loader and artifact interface before tuning. Consume only an agreed release and retain its hashes.
- Aaron: review financial/evidence labels, duplicate/recurrence meanings and [the separate research protocol](../explainable/README.md). Actual inference still uses his single adapter.
- Earl: complete independent label review, final held-out families/storage, frozen criteria and later artifact scoring. Actual model runs, participant measurements and accepted training releases remain pending.
