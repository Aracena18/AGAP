# QWN-01 Phase 7 model verification

Offline, text-only public-development preparation and inference tooling. This is Benedict's model code, not Aaron's application inference adapter or Earl's evaluation service. It adds no API, frontend, provider registration, reviewed corpus, holdout or model promotion. See the [plan](../../../docs/tasks/production/benedict-phase7/PLAN.md) and [actual results](../../../docs/tasks/production/benedict-phase7/IMPLEMENTATION.md).

## What is verified

- Actual model-export hashes and LoRA structure use the existing Phase 6 checker.
- Input preparation consumes Earl's exact preview manifest/input/schema commitments. It reads no targets, rationale or private holdout. Prepared packages have an exact inventory and cannot be overwritten.
- Generated outputs must use the canonical EVAL-01 prediction envelope, exact case order, requested fields and model/prompt/schema/data provenance. Findings are checked against Earl's generated schema; citations must match actual source ID/version/page and verbatim text. Missing measurement stays null.
- Baseline and tuned provenance are distinct. A valid citation and JSON shape do not prove the extracted value or interpretation is correct. No local passing result attests execution, establishes model gain or releases a capability.

## Run here

From this worktree's root:

```bash
python3 -m models.qwen.verification preflight --out /tmp/new-qwn-runtime-preflight.json
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest models.qwen.verification.test_verification -q
```

Preflight exit `2` means the GPU/dependency prerequisites are missing, not that the model artifact is corrupt. It queries installed metadata and bounded NVIDIA-SMI output without importing ML packages. No package/driver installation or CPU fallback occurs. A GPU attempt refuses an incomplete environment before creating successful output artifacts.

The committed/prepared [development inputs](../../../docs/tasks/production/benedict-phase7/development-inputs/) contain 12 publicly known fictional cases, exact generated schema and the new smoke prompt. They are not an accepted train/validation release or independent evaluation. Prompt/generation settings differ from the earlier C/D public-task experiment; do not compare their metrics as if they were the same experiment. The prepared input manifest SHA-256 is:

```text
572c401a6732f9b5325d64998c1d2aed91ecb6bef2d40faf1fa89eba35147646
```

## Execute in the original compatible GPU environment

Use the [unexecuted Colab notebook](./COLAB_VERIFY.ipynb) with the downloadable kit, or run the commands below. The kit contains this module, its Phase 6 dependencies, and development inputs. It does not include model weights or ML packages. Extract it and set its root as the working directory; supply the original verified base-plus-adapter folder from Drive. Do not rerun optimizer/training cells.

```bash
python3 -m models.qwen.verification run-gpu \
  --inputs ./development-inputs \
  --expected-input-sha256 572c401a6732f9b5325d64998c1d2aed91ecb6bef2d40faf1fa89eba35147646 \
  --artifacts /absolute/original/models/qwen \
  --expected-export-sha256 377ca3440cf7429d2056d500c253d4ad9313e1309c3fc91e92d2d2b6eedc90de \
  --out /absolute/new-gpu-results
```

The runner requires an available BF16 CUDA device and the original recorded versions of torch, transformers, PEFT, Unsloth and safetensors. These checks do not pin every transitive package or certify compatibility. No network/model download is enabled; local-only loading is required. It first runs the clean pretrained base, then attaches the original D adapter inference-only. No optimizer, training, merging or saved model mutation occurs. This clean baseline is a new development comparison, not the earlier tuned C predecessor.

The same new prompt, source bytes, schema and greedy decoding are used for both variants. Limits are 4096 input tokens, 512 new tokens and a 120-second generation budget per case. Inputs exceeding the budget are refused rather than cropped. Generation time limits are not a hard process/loading timeout; manually interrupt a hung GPU if necessary. Images/OCR, runtime load robustness and the specific dependency stack remain unverified until actual execution.

Each variant preserves incremental `*.raw.jsonl`, including response text, actual tokens, latency, allocated GPU peak and token-limit flags. Errors leave an incomplete run and `failure.json`. A complete canonical `*.predictions.json` is written only when every case parses and passes schema/reference checks without exhausting its token budget. Invalid responses are never silently converted into abstention or zero. `result.json` records both variants and any schema failures. No semantic scores are calculated.

Validate a complete tuned output (use `--variant baseline` and its file for the base):

```bash
python3 -m models.qwen.verification validate \
  --inputs ./development-inputs \
  --expected-input-sha256 572c401a6732f9b5325d64998c1d2aed91ecb6bef2d40faf1fa89eba35147646 \
  --predictions /absolute/new-gpu-results/tuned.predictions.json \
  --export-manifest /absolute/original/models/qwen/model_manifest.json \
  --expected-export-sha256 377ca3440cf7429d2056d500c253d4ad9313e1309c3fc91e92d2d2b6eedc90de \
  --variant tuned --out /absolute/new-tuned-validation.json
```

All outputs refuse overwrite. Exit `1` is invalid input/runtime failure, `2` is unavailable preflight or completed GPU execution with incomplete canonical outputs, and `0` means the operation's stated checks passed. Preserve partial runs; use a new output directory for retries. Return original raw outputs, bindings, environment and failures to Earl for independent review rather than selecting only successful cases.

Primary implementation references: [PEFT model API](https://huggingface.co/docs/peft/main/package_reference/peft_model) and [Unsloth inference](https://unsloth.ai/docs/basics/inference-and-deployment/unsloth-inference). The supplied executed notebook informed the local loader; this runner has not yet been exercised on a working GPU and is not claimed runtime-certified.
