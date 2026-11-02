# Phase 7 — actual preparation and verification results

2 November 2026. QWN-01 / Benedict. Isolated branch `feat/benedict-qwn-phase7`, base `1776d9f`. Scope is the user's model-verification request, not the entire application demonstration. [Assignment.md](../../../../Assignment.md) remains the authoritative tracker.

**Offline preparation and integrity/contract verification are complete. Actual model inference and independent acceptance are not complete.** This machine cannot access its NVIDIA driver and has none of the recorded ML packages installed. No successful model output, accuracy, improvement or runtime integration is claimed.

## Implemented

The [verification module](../../../../models/qwen/verification/README.md) provides environment preflight, immutable public-development input preparation, strict output validation and an opt-in local GPU baseline/tuned runner. The [Colab notebook](../../../../models/qwen/verification/COLAB_VERIFY.ipynb) is explicitly unexecuted and calls the same runner. No new model family, application inference provider, field registry, scoring service, reviewed labels or holdout split was created.

Preparation consumes Earl's existing development preview and generated finding schema. It excludes target answers/rationale, does not open holdout files, and freezes 12 fictional source-linked input cases with exact hashes. This is a publicly known smoke set, not a blinded evaluation. Prompt/template changes from the existing research experiment are versioned by byte hash. The runner performs clean-base inference before attaching D; C is not relabeled as a clean base. It preserves invalid/truncated raw outputs, rejects source truncation and produces canonical predictions only for a complete passing variant. Source/schema validity remains explicitly distinct from semantic correctness.

## Checks actually executed

| Check | Observed result | Limit |
| --- | --- | --- |
| Actual model re-audit | All **37** original export entries passed hash/size checks; supported LoRA structure passed | No new inference or remote-origin attestation |
| Public input preparation | **12** fictional cases; targets not copied; producer schema retained exactly | Preview is unreviewed and public |
| New Phase 7 tests | **18 passed** | Fictional parser/contract tests, no model execution |
| Phase 6 prerequisite regressions | **60 passed** | Offline evidence tooling, not model-quality tests |
| Runtime preflight | Unavailable: NVIDIA-SMI exit **9**; five ML packages absent | Prevents actual local GPU load |
| Actual `run-gpu` CLI attempt | Exit **1**, refused before model load; no success directory created | Recorded failure, not a smoke-test pass |
| Syntax/docs/ownership | Python and notebook code syntax, links, whitespace and owned paths checked | GPU API compatibility still requires execution |

Evidence: [artifact recheck](./artifact-recheck.json), [runtime preflight](./runtime-preflight.json), [GPU attempt](./gpu-attempt.json), [input manifest](./development-inputs/manifest.json), and [plan](./PLAN.md).

The downloadable kit is `/tmp/agap-qwn-phase7-kit.zip` (38,254 bytes). Its 19 included files and ZIP CRC were verified; [kit-verification.json](./kit-verification.json) records the archive and kit-manifest checksums. Archive SHA-256: `2c237b5154eee7c8a85a9b7f165ec5117ad0967c2befa01ed839eddbadf5cb59`. It contains source modules, the unexecuted notebook, frozen public inputs and root instructions, with no model weights or target answers. Save it outside temporary storage before cleanup. Preparation-kit integrity does not establish GPU execution.

Input manifest SHA-256: `572c401a6732f9b5325d64998c1d2aed91ecb6bef2d40faf1fa89eba35147646`.

Commands used for focused verification:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest models.qwen.verification.test_verification -q
TMPDIR=/tmp PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s models/qwen/handoff/tests -q
```

The prerequisite suite uses temporary directories outside Git to exercise the existing external-weight guard. No model packages were installed, driver changed, cloud job started, GPU credits spent, training resumed or weights merged. The NVIDIA error was captured as unavailable, not masked by CPU fallback. Existing notebook successes remain historical evidence and do not substitute for this run.

## Next executable step

Extract the verification kit in the **original compatible GPU environment** and provide the original base-plus-adapter export. Open the unexecuted notebook, set its two explicit folder paths, run preflight and then baseline/tuned inference. Package/driver issues must be resolved there without bypassing checks. Preserve the full result directory, including failures and raw outputs, for source/semantic review. The [runner instructions](../../../../models/qwen/verification/README.md) give exact commands and known limits.

After execution, Earl independently evaluates source/value correctness, missing-data/clarification behavior, unsupported claims, correction burden and measured resource limits using the reviewed protocol. The public smoke is insufficient for final release. Recover the original Phase 6 manifests/raw predictions in parallel, retaining the [existing handoff gaps](../benedict-phase6/HANDOFF.md). Aaron owns the single application adapter; Robert owns shared contracts/registration. Neither is implemented or accepted by this model-only change.

## Preservation and integration

Uncommitted Phase 6 owned tooling/docs were copied unchanged into this isolated worktree as prerequisites. The original Phase 6 and Phase 5 worktrees remain intact. Main's user-edited ignore file, original model artifacts, shared schemas/dependencies/tracker, Earl's producer and all application files were not changed. No commit, push, PR, merge or external message was performed.

Application `npm run check` / `npm run test:e2e` were not run: this is offline Python/model preparation, with no application integration claim. They remain required for the wider Phase 7 application gate. `graft` and `graphify` are unavailable on PATH; no indexed navigation or graph update is claimed.
