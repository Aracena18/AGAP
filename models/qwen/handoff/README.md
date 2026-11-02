# QWN-01 offline handoff tools

This standard-library Python 3.10+ tool audits supplied evidence and packages an evaluator candidate. It never trains, downloads, loads, scores, uploads or promotes a model. See the [implementation plan](../../../docs/tasks/production/benedict-phase6/PLAN.md) and [execution report](../../../docs/tasks/production/benedict-phase6/IMPLEMENTATION.md).

## Supplied Experiment D export

The actual supplied package uses `unsloth/Qwen3.5-2B` and an inspected Unsloth regex target configuration. Both are now supported without substituting the base repository or running arbitrary configuration regexes. The following **research-only** path preserves this export's actual development status. It does not relax the reviewed-release requirements of `audit`/`package` below. See the current [handoff](../../../docs/tasks/production/benedict-phase6/HANDOFF.md).

```bash
python3 -m models.qwen.handoff audit-export --root /absolute/models/qwen \
  --expected-manifest-sha256 EXPECTED_ORIGINAL_MANIFEST_SHA256 --out /tmp/new-research-audit.json
python3 -m models.qwen.handoff package-export --root /absolute/models/qwen \
  --expected-manifest-sha256 EXPECTED_ORIGINAL_MANIFEST_SHA256 --out /absolute/new-research-candidate
python3 -m models.qwen.handoff verify-export --bundle /absolute/new-research-candidate \
  --expected-manifest-sha256 EXPECTED_CANDIDATE_MANIFEST_SHA256
```

`audit-export` checks the original manifest's files and adapter, C/D configuration bindings and available validation-file hashes. It summarizes only selected saved notebook outputs with cell/hash provenance; it never executes notebook code or exports arbitrary notebook text. Notebook errors are retained as counts/types, not hidden. Exit zero means export consistency, while `independentEvaluationReady` remains false. Hashes from a self-supplied manifest do not independently authenticate remote origin.

`package-export` copies a fixed allowlist of adapter/configuration, license and development evaluation evidence. Original base weights/tokenizer data, raw notebooks/datasets/holdouts and API implementation are not copied. Load the processor/tokenizer from the original pinned base directory. Packages include notebook summaries and missing-evidence boundaries. They use `agap-qwn-research-candidate/v1`, distinct from the reviewed AGAP candidate envelope. Both package types are immutable and never grant promotion.

Run commands from this worktree's repository root. Paths below are examples: replace them with the existing export and Earl's reviewed release. Keep weights and candidate bundles outside **every** Git checkout, including Git worktrees. Commands refuse to overwrite outputs.

```bash
python3 -m models.qwen.handoff init --run-id existing-colab-run --out /tmp/qwn-run-draft.json
python3 -m models.qwen.handoff inventory --root /absolute/existing/export --out /tmp/qwn-inventory.json
python3 -m models.qwen.handoff audit \
  --run /absolute/completed-run.json --artifacts /absolute/existing/export \
  --release /absolute/earl-reviewed-release \
  --expected-release-sha256 EXPECTED_MANIFEST_SHA256 --out /tmp/qwn-audit.json
python3 -m models.qwen.handoff package \
  --run /absolute/completed-run.json --artifacts /absolute/existing/export \
  --release /absolute/earl-reviewed-release \
  --expected-release-sha256 EXPECTED_MANIFEST_SHA256 --out /absolute/new-candidate-directory
python3 -m models.qwen.handoff verify \
  --bundle /absolute/new-candidate-directory --expected-manifest-sha256 EXPECTED_CANDIDATE_MANIFEST_SHA256
```

Exit codes: `0` means the requested operation passed, `2` means an audit produced a report with blockers, and `1` means invalid input or an operation failed. An audit pass is evidence consistency, not proof of execution, correctness, authenticated review or release approval. Communicate expected manifest hashes separately from the directories they authenticate. The package command returns the new candidate's manifest hash.

## Capture the existing run

1. Locate the original Colab notebook, saved checkpoint and logs. Preserve those originals. Export the existing adapter to a new directory using the original environment; do not restart training or replace prior checkpoints to satisfy this tool. If artifacts were never saved, record that fact.
2. Copy the generated draft to a new run record and fill fields only from recorded evidence. Record exact 40-character base, processor and training-code revisions, seed, timezone-aware start/finish instants, actual precision and limits, batch size, learning rate and epochs. Unknown stays null and blocks packaging. A repository's current revision does not establish the revision used by an earlier run.
3. Declare the base/adapter licenses and the data-permission reference. An exploratory or unreviewed dataset remains exploratory; do not substitute a later accepted release hash for what the run actually used. Earl supplies the reviewed training/validation release and its independently communicated manifest hash.
4. Supply relative, ordinary file paths for every role below, under one export root. Absolute paths, traversal and symbolic links are rejected. Never export tokens or operational records. The text credential check is limited pattern detection, not a privacy certification.
5. Capture a real reload smoke result and matched pretrained/tuned validation outputs in the pinned ML environment. This tool does not perform those executions. Preserve failures or missing measurements honestly; do not turn a draft into a successful record by filling invented values.
6. Audit, resolve evidence inconsistencies, then package to a new external directory. Send the candidate and checksum to Earl through the team's authorized handoff process. Independent evaluation and the runtime release decision remain separate.

| Evidence role | Required content |
| --- | --- |
| `adapter_config`, `adapter_weights` | Original PEFT configuration and single `adapter_model.safetensors` file |
| `training_code` | Actual executed `.py` or `.ipynb` export; never executed by this tool |
| `environment` | JSON with matching `runId`, `python`, and explicit `packages` versions for torch, transformers, peft and safetensors |
| `training_config` | JSON recording `seed`, `precision`, `learning_rate`, `num_train_epochs`, `per_device_train_batch_size`, and `quantization_bits` (null for this supported unquantized path) |
| `trainer_state` | Saved JSON with positive `global_step` and nonempty `log_history` |
| `prompt`, `output_schema` | Exact prompt bytes and Earl's generated finding schema, byte-identical to the supplied release |
| `preprocessing` | Input/prompt/schema hashes and common settings plus per-output bindings described below |
| `baseline`, `tuned` | Earl's `eval-01-predictions/v1` model outputs for exactly the release's validation cases, with canonical artifact provenance |
| `reload_smoke` | Actual JSON result with `schemaVersion: agap-qwn-reload/v1`, matching `runId`, `adapterSha256`, base/processor revisions, `status: passed`, positive `elapsedMs` and `peakMemoryBytes` |

The environment command reads installed distribution metadata without importing ML packages:

```bash
python3 -m models.qwen.handoff environment --run-id existing-colab-run --out /tmp/qwn-environment.json
```

Run it in the original ML environment only if this module is available there. A capture taken here describes this process, not an earlier Colab execution. Preserve the original environment export alongside any normalized evidence.

The preprocessing record requires `validationInputSha256`, `promptSha256`, `schemaSha256`, `maxInputTokens`, `maxNewTokens` and a nonempty `settings` object describing actual text processing/generation. Both `baseline` and `tuned` subrecords bind `outputSha256`, `promptSha256`, `schemaSha256`, `processorRevision`, `settingsSha256`, `environmentSha256`, `precision`, `maxInputTokens` and `maxNewTokens`. Compute `settingsSha256` using this tool's canonical JSON serializer in [files.py](./files.py). Preserve the original record rather than reconstructing undocumented settings. Training and both inference run IDs must be distinct. Baseline artifact hash is null; tuned artifact hash is the actual adapter checksum. Missing per-case latency/memory remains null with explicit measured-case counts.

## Supported boundary and verification

The adapter parser supports the explicit single-file, floating-point, standard LoRA subset in [checkpoint.py](./checkpoint.py). It rejects pickle weights, sharded exports and unsupported LoRA variants. Do not convert or discard an existing run merely to force compatibility: preserve it and record the required follow-up. Safetensors layout checks cannot prove trained weights or actual runtime compatibility. See official [PEFT checkpoint documentation](https://huggingface.co/docs/peft/developer_guides/checkpoint), [Qwen model card](https://huggingface.co/Qwen/Qwen3.5-2B) and [safetensors documentation](https://huggingface.co/docs/safetensors/index).

Bundles contain selected evidence and adapter files, not corpus/target/holdout files. The verifier checks exact inventory and hashes against the expected candidate manifest. Failed packaging leaves no completed manifest; use a new destination for a retry. Treat partial output as incomplete.

```bash
TMPDIR=/tmp PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s models/qwen/handoff/tests -v
```

The temporary directory must be writable and outside Git because the tests exercise the same external-weight guard as production tooling. Tests use tiny fictional parser fixtures, not a trained model. No application UI, provider, authentication, accounting, runtime promotion or QWN-02/QWN-03 integration is included. Every candidate remains `not_promoted` pending the independently evaluated handoff.
