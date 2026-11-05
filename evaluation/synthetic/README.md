# EVAL-01 synthetic corpus and evaluation tools

Offline implementation candidate for Earl's [EVAL-01 assignment](../../Assignment.md#earl), governed by the [training/evaluation specification](../../docs/AGAP_Model_Training_Plan.md). The first deliverable is a data/protocol handoff; final comparisons depend on returned artifacts and independent holdout execution.

## Supplied development data

[pilot.ts](src/pilot.ts) contains twelve fictional development cases and fourteen source pages, with independently authored monetary expectations and source citations. The seed namespaces source identities; money and dates are fixed authored examples, not random finance-engine output. Regenerating the same seed reproduces the corpus and its hash. The repayment/strain counterfactuals share a scenario group and stay together during splitting.

Coverage includes clear payslip fields, conflicting income records, absent versus explicit-zero costs, historical repairs, farm gross/net and cash dates, beyond-cycle costs, repeated obligations, reserve/payment duplication, unreadable values, document instructions and repayment/strain reports. `rationale` explains each expected answer. These labels still require independent owner review; the tool does not create that review.

The PNG renderer produces readable text-document previews. Its unreadable-field case uses an explicitly labeled transcription placeholder; these previews are not an evaluated OCR benchmark or realistic degraded scans. Image-domain/template coverage must be reviewed and expanded for the agreed Qwen task. Renderer output hashes bind the actual browser/platform artifacts; cross-platform PNG byte identity is not promised.

The existing [demo cases](../../src/demo/cases.ts) and [historical calculation oracles](../../docs/AGAP_Product_Freeze.md#5-the-fictional-demonstration) remain known regression references. They are not copied into this corpus or presented as unseen evaluation data.

## Frozen interface compatibility

The existing `eval-01-corpus/v1` extraction interface remains pinned to contract 0.3.0, including the original public development pack and its checksums. Later application lending-contract additions (0.4.0) do not change these extraction fields or relabel/regenerate research material. An actual extraction-interface change requires its own explicit versioned corpus migration and review. No D/E data, ratings, mappings or selection evidence is modified by this compatibility pin.

## Candidate file interfaces

All `eval-01-* /v1` envelopes in [model.ts](src/model.ts), [bundle.ts](src/bundle.ts) and [compare.ts](src/compare.ts) are evaluation-local proposals for Robert/Aaron/Benedict to review. They do not change the canonical API contract. Money, dates, source references and model provenance reuse the [existing schemas](../../packages/contracts/src/schemas.ts).

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

# Compare supplied runs on the same corpus; creates a new report directory.
npx tsx evaluation/synthetic/src/cli.ts compare --corpus CORPUS_FILE --runs RUNS_MANIFEST_FILE --out NEW_REPORT_DIRECTORY
```

The default preview is explicitly `development_preview`, with zero training/validation release counts and no review/holdout commitment. It is suitable for label/format review and harness development. Generating it is not completion of the reviewed training handoff.

## Readable development review pack

The supplied [review document](reviews/development-v1/review.md) and self-contained [HTML version](reviews/development-v1/review.html) project the existing pilot without changing its source records or expected answers. They show all 12 cases, 14 source pages and 18 candidate expected fields, complete source text/citations, rationale, annotated coverage and open review questions. Coverage annotations and unique group counts do not prove sample independence, sufficient template/image coverage or correct labels. The illegible-source case is a text placeholder, not an OCR benchmark.

```sh
# Use an existing validated development corpus; output must be a new directory.
npx tsx evaluation/synthetic/src/cli.ts review --corpus DEVELOPMENT_CORPUS_FILE --out NEW_REVIEW_DIRECTORY
npx tsx evaluation/synthetic/src/cli.ts verify-review --pack NEW_REVIEW_DIRECTORY
```

Open `review.html` locally or read `review.md` in the repository. Sources appear next to candidate answers in the HTML document, with keyboard citation links and responsive/print layouts. All source/label text is inert escaped content; the document requires no network or scripts. Exact PHP displays retain integer centavos, including explicit zero; missing values/dates stay unavailable.

The pack includes the unchanged compatible `development/` bundle, `coverage.json`, a blank [review worksheet](reviews/development-v1/review-worksheet.json) and an outer hash manifest written last. Copy the worksheet separately for actual reviewer names, decisions, disagreements and corrections; keep the original pack intact. It is a review aid, not the `freeze` approval record. No reviewer approval, protected holdout, training split or model result is supplied. New versions must preserve prior evidence. The local reviews attributes retain LF artifact bytes across Git checkouts so hashes remain reproducible.

The exporter refuses reserved holdouts before creating output. Verification checks the exact inventory, refuses symlinks, regenerates the pending pack from its corpus and detects edited documents/worksheets/manifests or added files. Checksums establish consistency, not authentic review or trusted authorship. Actual independent label/interface review, training lineage, protected holdout arrangements and agreed measures/regression limits still precede freezing. Public development examples are already visible to trainers and cannot be relabeled as untouched holdout evidence.

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

## Paired comparison reports

`compare` reuses the existing scorer for two to sixteen prediction files, with an explicitly selected baseline. The runs manifest is a local file interface:

```json
{
  "schemaVersion": "eval-01-comparison-files/v1",
  "baselineRunId": "pretrained-v1",
  "runs": [
    {
      "label": "Pretrained Qwen",
      "protocolSha256": "REPLACE_WITH_AGREED_PROTOCOL_SHA256",
      "predictionsFile": "outputs/pretrained.json"
    },
    {
      "label": "Tuned Qwen",
      "protocolSha256": "REPLACE_WITH_AGREED_PROTOCOL_SHA256",
      "predictionsFile": "outputs/tuned.json"
    }
  ]
}
```

Replace the placeholder with the actual 64-character lowercase hexadecimal SHA-256 of the frozen comparison protocol. Prediction paths resolve relative to the runs manifest, not the shell's current directory. Each prediction's `run.id` must be unique; `baselineRunId` selects one of those actual IDs. Labels are unique ignoring case. The CLI validates all inputs before creating output files.

Every run must declare the same protocol commitment and match the exact corpus/case inventory; model runs also declare the same prompt/output-schema versions. The protocol must record task, source/input format, preprocessing, prompts, inference limits/settings, measurement procedure, baselines, primary measures and regression criteria before final evaluation. Hash equality is a declaration, not proof of identical execution or accepted review. Review original outputs/provenance and run conditions independently. Model artifact hashes identify the returned models; prediction hashes commit canonical validated outputs separately.

The output directory is exclusive and contains:

- `comparison.json`: scored runs, artifact/environment provenance, canonical prediction hashes, count/accuracy deltas, paired field outcomes and jointly observed resource summaries.
- `comparison.md`: readable score/error tables and field-level improvements, regressions and remaining errors.
- `manifest.json`: exact JSON/Markdown artifact hashes, written last as the completion marker. A directory without this file is incomplete; preserve failures rather than treating partial output as a completed report. Existing output directories are never overwritten.

Each expected field is classified as improved, regressed, both correct or both incorrect relative to the baseline. Both sets of problem codes remain inspectable. Missing answers stay in the denominator; unsolicited fields and unsupported recorded values have separate counts. Equal aggregate accuracy can hide an improvement and a regression, so the report shows both. Count deltas are candidate minus baseline: a positive error delta means more errors. These descriptive results establish neither statistical significance nor an automatic winner/promotion.

Simulated runs are compared separately from declared model/template executions; mixed evidence is rejected. An all-simulated report is `harness_only`, with no performance measurements, even if fixture outputs supply numbers. A declared template run is an actually executed template/checklist procedure, not fabricated participant responses. Every report retains `promotion: not_assessed`.

Timing/memory comparisons use only cases observed in both runs with the same declared environment; denominators are explicit and missing values remain null. Memory summaries are mean per-case peak bytes, not whole-process peak memory. Environment equality does not attest equivalent hardware/configuration; differing environments leave paired resource comparisons unavailable while retaining structured accuracy results. Related case/household groups are not independent observations; the tool does not invent confidence intervals, participant measurements or a release threshold.

Holdout comparison uses the same `--release` commitment and external-private-corpus checks as `score`. Keep final error reports, sources and labels evaluator-controlled during model selection. Reviewed corpora/protocols, actual baseline/tuned/checklist/plain-form runs and independent final scoring are still required for EVAL-01 acceptance. The survey EBM/logistic evaluator remains a separate future implementation in `evaluation/explainable/`.

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
