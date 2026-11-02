# Phase 7 — QWN-01 model preparation and verification

Scope confirmed by the user's latest request: model preparation/verification, not shared application routing, financial integration, retraining or deployment. Branch `feat/benedict-qwn-phase7` starts at `1776d9f`; unchanged Phase 6 owned tooling/docs are copied as prerequisites because they remain uncommitted in their original worktree. Originals, Phase 5, main and its user-edited ignore file are preserved.

Authorities: [assignment](../../../../Assignment.md), [product](../../../AGAP_Product_Solution.md), [architecture](../../../AGAP_Production_Architecture.md), [delivery](../../../AGAP_Delivery_Plan.md), [model plan](../../../AGAP_Model_Training_Plan.md), [Benedict brief](../03-decisions-servicing.md), [frontend contract](../../../AGAP_Frontend_Spec.md), [design](../../../../design.md), and historical [freeze](../../../AGAP_Product_Freeze.md). The current [Phase 6 handoff](../benedict-phase6/HANDOFF.md) records pending independent acceptance.

## Execution

1. Reverify the actual exported manifest/checkpoint using the Phase 6 consumer. Capture runtime metadata and NVIDIA status without importing/installing ML packages or inferring execution from notebook outputs.
2. Consume Earl's existing public fictional development preview and generated finding schema read-only. Verify manifest commitments and sources; build model inputs without targets, expected findings or rationale. Never open private holdout. Label this public development smoke, not independent evaluation.
3. Freeze a text-only extraction prompt, case order, source bytes, token budgets and deterministic settings in a hashed input package. Reuse the canonical prediction/provenance envelope. No additional field registry, curated corpus, expert labels or holdout scoring is introduced.
4. Supply an offline inference-only GPU runner for the existing pinned environment and local verified base/adapter. Run clean base before attaching D, preserving the same prompt/schema/limits. Keep raw responses, truncation, schema/source failures and actual timings/memory separate; fail unavailable on unsupported runtime/input rather than crop sources or invent findings. No HTTP service or second provider client.
5. Validate supplied outputs against the generated finding schema, source/page/version/excerpt and requested fields. This is structural/source-reference validation, not semantic truth, fairness, improvement or authenticated execution. Do not promote from a passing local check.
6. Run meaningful parser/envelope/leakage/tamper tests and prerequisite regressions. Record the exact commands/results, environment blockers and GPU execution instructions. Preserve missing/incompatible outputs and unsupported cases. No unrelated application suite is required or application-integration claim made.

## Limits and exit criteria

On initial inspection Python 3.12.3 has none of torch/transformers/PEFT/Unsloth/safetensors installed; NVIDIA-SMI cannot communicate with the driver. No automatic CPU fallback, large installation, driver change, GPU purchase or new training run is planned. The runner can be syntax/contract tested here; its actual pinned-runtime compatibility and model output quality remain unverified until it runs in the original compatible GPU environment.

Local preparation is complete only when artifact integrity, input isolation/hashes, runtime preflight, output checks and tests have actual reports. Actual model verification additionally requires completed baseline/tuned executions and independent review. Earl retains final scoring/holdout. Aaron owns the single application inference adapter and Robert owns shared contracts/registration. Phase 7 cannot close the wider first-demonstration gate from these offline model checks.

Primary implementation references: [PEFT model API](https://huggingface.co/docs/peft/main/package_reference/peft_model), [Unsloth inference](https://unsloth.ai/docs/basics/inference-and-deployment/unsloth-inference), and the supplied executed local notebook. Actual compatibility is tested by execution, not assumed from current documentation.
