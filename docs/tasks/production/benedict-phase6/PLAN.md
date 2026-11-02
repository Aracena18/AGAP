# QWN-01 Phase 6 — reproducible model evidence and artifact handoff

Prepared 2 November 2026, Asia/Manila. Benedict owns this plan and implementation under QWN-01. [Assignment.md](../../../../Assignment.md#benedict) remains the only task-status tracker. Authorities: [product](../../../AGAP_Product_Solution.md), [architecture](../../../AGAP_Production_Architecture.md), [delivery](../../../AGAP_Delivery_Plan.md), [model plan](../../../AGAP_Model_Training_Plan.md), [owner brief](../03-decisions-servicing.md), [frontend boundary](../../../AGAP_Frontend_Spec.md) and [design.md](../../../../design.md).

**Evidence reconciliation, 2 November:** the user subsequently supplied the actual base/adapter/notebooks/evaluation under the main checkout's model folder. The missing-export statements below describe the original inspection, not current availability. Execute the additional research-export integrity/package path described in [HANDOFF.md](./HANDOFF.md). Preserve the original reviewed-release gate: this public research export must not be relabeled as an accepted fictional AGAP training release. Close local tooling/package work independently of pending reproducibility recovery and independent acceptance; do not declare full QWN-01 acceptance from hashes or notebook outputs.

## Outcome and inspected starting point

Produce a reproducible, auditable candidate handoff for an existing Qwen3.5-2B LoRA run: exact base/processor revisions, adapter/config hashes, train/validation release references, prompt/schema/preprocessing/settings, environment/resource measurements, run logs, matched pretrained/tuned development outputs, reload-smoke evidence and explicit independent-evaluation status. Training completion is not runtime promotion.

The isolated implementation branch is `feat/benedict-qwn-phase6` from main `1776d9f`. Phase 6 is independent of the uncommitted Phase 5 money path, which is preserved in its own worktree. The earlier user-reported Colab run has no exported adapter/notebook/log visible in the inspected checkout. Its location has been requested; do not invent its outcome, restart it or expend GPU credits automatically.

The existing 60-example preparation pilot is unreviewed and has no train/validation release. Earl's supplied EVAL-01 tools can generate development previews and reviewed releases, but do not bundle an accepted review/private holdout. Both are preparation evidence, not a trained model or approved data release. Preserve the existing run even if it used an exploratory/unreviewed corpus; record the limitation rather than relabeling that corpus.

## Execution packages

| Package | Implementation/deliverable | Evidence gate |
| --- | --- | --- |
| P6-A | Isolated branch, artifact discovery and bounded current-state report | Actual paths/results recorded; no cloud/notebook access inferred |
| P6-B | Offline strict run specification, read-only evidence inventory and audit CLI | Unknown stays null; running/interrupted/completed distinguished; pinned provenance and resource claims checked for consistency |
| P6-C | Read-only EVAL-01 reviewed-release consumer | Exact expected manifest/file hashes and train/validation IDs checked; preview/unreviewed releases rejected; no holdout file opened/exported or second split generator |
| P6-D | Safe PEFT adapter audit and baseline/tuned comparison prerequisites | Adapter/config/LoRA consistency, safetensors structure and exact hashes; same prompt/schema/preprocessing/limits and validation case IDs; no invented model gain |
| P6-E | Immutable evaluator candidate package and run/model cards | New external directory only, complete hashed inventory, adapter checksum and smoke/log references; no large weights or raw corpus copied into Git |
| P6-F | Round-trip verifier, corruption/leakage/unsupported-format tests and CLI checks | Tampering, path escape, symbolic links, missing files, duplicate JSON/IDs, NaN, holdout labels and changed settings rejected |
| P6-G | Receiving-owner instructions and current missing-evidence report | Earl receives candidate and retains independent evaluation; Aaron/Robert receive only reviewed runtime release through the one adapter |

Implement the standard-library offline path now. Consume supplied exports when available; do not fabricate a PEFT checkpoint to claim training or run a new GPU job merely to fill the package. An actual model reload/baseline/final evaluation cannot be substituted with a unit-test fixture.

## Owned paths and boundaries

- Own `models/qwen/handoff/` CLI/library/tests/docs and this phase's evidence. No shared dependency, canonical schema/client, registration, AI provider, member/financial table or other owner's file changes.
- Earl owns accepted corpus/grouped splits/private holdout and final scoring. The consumer verifies the published EVAL-01 file envelope and exact commitments; it does not create expert labels, freeze new splits or score the holdout.
- Aaron owns the single inference adapter; Robert owns shared provenance/configuration/client/runtime promotion wiring. A proposed local JSON envelope is not a canonical runtime contract.
- QWN-02 guidance and QWN-03 5C adaptation remain separate tasks. A QWN-01 extraction artifact cannot silently release those capabilities.

No application/provider connection is implemented. Use Python 3.10+ standard library for evidence handling without torch/transformers/PEFT installation, model download, network calls, pickle loading or shell execution from metadata. Reference primary [PEFT checkpoint documentation](https://huggingface.co/docs/peft/developer_guides/checkpoint), [Qwen model card](https://huggingface.co/Qwen/Qwen3.5-2B) and [safetensors documentation](https://huggingface.co/docs/safetensors/index) checked during planning. Pin the actual executed ML environment in run evidence; these documentation links do not select a tested training stack.

## Run/evidence contract

Use a versioned local run record and explicit evidence paths under a user-selected export root. Record status, exact model/processor commit SHAs, code revision/seed, LoRA config, precision/GPU/memory/runtime, dependency versions, limits, prompt/schema/preprocessing, release hash and log/smoke/output references. Missing values stay null in the draft and block evaluator-ready packaging. No guessed versions, GPU allocation or successful baseline are generated by initialization.

Use the agreed EVAL-01 prediction envelope for supplied model outputs, including its canonical model provenance, exact validation cases and source/field-shaped findings. A structural checker cannot establish semantic correctness or attest that an external model executed. Missing measurements must remain null; declared execution/measurements are explicitly distinguished from independently verified evidence.

Only a locally supported single-file LoRA safetensors export is packaged. Inspect structure without deserializing executable Python; refuse pickle `.bin` weights and unsupported shard/DoRA/rank-pattern variants rather than pretending compatibility. Checksums and tensor layout do not establish that the weights are trained or loadable by the actual pinned runtime; a separately recorded real reload-smoke run is required for the candidate handoff.

Review/public corpus material may be read only through the supplied release directory. Require its independently communicated expected SHA-256, exact inventory and reviewed-release metadata; do not treat a `reviewed` label as authenticated owner approval. Holdout commitments/counts remain references only. No final holdout text/labels, operational member records, arbitrary adjacent files or credentials enter an exported bundle.

## Packaging, comparison and release semantics

Write candidate bundles only to a new path outside any Git checkout; never overwrite prior runs, model cards, adapters or review evidence. Package only explicitly named model/config and necessary evidence files; record hashes for every copied byte and verify after copy. Failures must leave no completed manifest. No auto-upload or model provider installation occurs.

Pretrained and tuned development runs must use the same reviewed validation input hash, prompt/schema/preprocessing and inference limits. Bind supplied outputs to the actual adapter checksum and exact base/model/data versions. Structural/source-shape validation is not Earl's independent semantic scoring or an improvement claim. No model-generated arithmetic, approval outcome or probability becomes a supported runtime capability.

The candidate's disposition is always `not_promoted`; it is for independent evaluation, not a release switch. Do not accept a trainer-written reviewer name or unsigned report as authenticated final approval. Earl supplies the separate comparison and promotion/non-promotion result; Aaron/Robert decide and wire the accepted runtime handoff. No-gain, interrupted, unreviewed-data and missing-baseline outcomes remain valid honest records with explicit blockers and the deterministic/manual fallback.

## Verification and completion criteria

Test a complete **fictional harness** round trip plus malformed JSON, repeated keys, invalid numbers/versions, truncated/overlapping tensors, mismatched LoRA/base/config, preview data, manifest tampering, cross-partition IDs, unsupported paths/symlinks, unsafe output locations, non-model predictions, absent/mismatched baseline, changed prompts/settings, unknown measurements and package corruption. Fixtures are temporary and clearly not trained artifacts or final holdouts.

Execute actual workspace discovery/audit and report missing real artifacts separately from test passes. No application code/dependency changes means focused Python/CLI/link/source/ownership checks are appropriate; do not rerun unrelated app suites or declare the feature integrated. Robert must register eventual CI/dependency/schema changes after review. Use graft/graphify if available and report unavailable tooling honestly.

Phase 6's tooling can be implemented and tested independently. Full QWN-01 handoff remains incomplete until the actual existing run/export, reviewed data commitment, matching baseline/tuned outputs, real smoke/resource/log evidence and Earl's independent outcome are available. Preserve the current run and dataset/training history. No push, merge, external message or paid compute is implied by this implementation request.
