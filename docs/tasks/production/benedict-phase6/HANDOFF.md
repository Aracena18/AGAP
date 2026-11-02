# Experiment D — current Phase 6 handoff

Prepared 2 November 2026. QWN-01, Benedict. This supersedes the original missing-export assessment, while preserving the historical audits. It is evidence supporting the existing [assignment](../../../../Assignment.md), not a competing task tracker.

## Disposition

**Benedict's local offline tooling, actual-export audit and research candidate packaging are complete. Full Phase 6 reproducibility/acceptance and QWN-01 release are not complete.** No training was restarted, inference executed, provider installed, shared application file changed, or review approval fabricated. The package is a reviewable handoff of the actual Experiment D artifact with explicit recovery work, not an independently eligible AGAP model.

The current [audit](./experiment-d-audit.json) verifies all **37 files** listed in the original export manifest. Original manifest SHA-256:

```text
377ca3440cf7429d2056d500c253d4ad9313e1309c3fc91e92d2d2b6eedc90de
```

Base: `unsloth/Qwen3.5-2B`, revision `fffbc0d8711cf87df6d1f97938c5e50ef94aadc7`. Adapter SHA-256:

```text
1df4455fcbd17630a4256a0ea4feb7ee10545ab4a27ec29aec295f70655c7c37
```

The adapter contains 372 paired A/B tensors (186 pairs), rank 16, alpha 16, dropout zero. Static tensor/config/hash inspection passed; this tool did not independently execute the weights. The actual adapter configuration leaves `revision` null; the external export manifest supplies the pinned base revision. Processor revision is not separately attested and remains null, although processor/tokenizer files have verified byte hashes. Neither repository identifier is silently substituted for the other.

## Recovered execution evidence

The audit summarizes four original notebooks by SHA-256 and cell index. It preserves saved error types rather than treating every notebook cell as successful. In the D continuation notebook:

- Cell 6 configures seed 3407, maximum sequence length 4096, two epochs and learning rate 0.00005.
- Cell 20 configures BF16, batch size 1, gradient accumulation 4, 722 training rows and 116 validation rows; D starts from C's trained adapter with a fresh optimizer.
- Cell 22's saved stream reports 362 optimizer steps, aggregate training loss 0.06277114339944655 and peak allocated GPU memory 5.03 GiB. The memory figure is rounded and is not a total device-memory or wall-clock measure.
- Four saved error outputs occur elsewhere in that notebook. Their presence is recorded; later success messages do not erase them or independently establish that every experimental variant was valid.

The final-export notebook's saved outputs report model loading, HTTP 200 and successful GPU reload, including the same adapter checksum. These are recorded Colab results, not a new local smoke run. No standalone API module is present in the supplied folder; a notebook containing API code does not register that API in AGAP.

The supplied balanced public dataset has 602 training and 116 validation rows. A separate synthetic messages dataset has 120 rows. Those counts sum to D's stated 722 training rows, but **counts alone do not prove the exact final mixture, order, filtering, review or byte commitments**. Do not manufacture a replacement D training manifest from this arithmetic.

## Development comparison and limits

Both available public validation files match the saved evaluation configuration hashes. The saved C/D comparison covers 58 PAYSLIPS and 102 TAT-QA cases. PAYSLIPS entity F1 rises from 0.619765 to 0.680628; TAT-QA normalized answer rate rises from 0.627451 to 0.705882. However, PAYSLIPS JSON/schema compliance falls from 58/58 to 57/58, and the corrected TAT-QA schema audit falls from 101/102 to 100/102. Overall improvements do not erase those regressions.

These are development results. C is a tuned predecessor, not the clean pretrained Qwen baseline required by QWN-01. The raw C/D predictions are referenced by checksum in saved reports but absent from the supplied export, so semantic scoring was not independently reproduced here. Public PAYSLIPS/TAT-QA output contracts are not a substitute for Aaron/Robert's agreed source-linked AGAP extraction/clarification contract. No QWN-02 guidance or QWN-03 5C release follows from these results.

## Package and reproduction

The actual external package is `/tmp/agap-qwn-phase6-experiment-d-20261102`. Its manifest checksum and verification result are recorded in [experiment-d-package-verification.json](./experiment-d-package-verification.json). This temporary location is for review/download, not archival storage. Preserve the original model folder and move/archive the completed directory through the team's normal artifact storage before temporary files are cleared. Communicate its manifest hash separately.

A downloadable ZIP is available at `/tmp/agap-qwn-phase6-experiment-d-20261102.zip` (67,414,991 bytes). Its [archive checksum record](./experiment-d-archive.json) binds it to the verified candidate manifest. ZIP SHA-256: `77ce9725d9af973eb3fddca236ee71d4cdf4cee7eff9b09c6e6818e3facf0ac6`. The archive contains the same 22 candidate files plus their candidate manifest; it does not contain the base weights.

The package includes the original adapter, processor configuration, chat template, license, environment, C/D reports/CSV summaries, original export manifest and a generated audit/model card. Base weights and large tokenizer data remain in the original verified export; raw notebooks, datasets and holdout labels are excluded. Original notebook hashes and selected output summaries remain in the audit for traceability. Packaging does not claim to authenticate notebooks or inspect all private data.

Run verification from this Phase 6 worktree using the checksum in the verification record:

```bash
python3 -m models.qwen.handoff verify-export \
  --bundle /tmp/agap-qwn-phase6-experiment-d-20261102 \
  --expected-manifest-sha256 CHECKSUM_FROM_VERIFICATION_RECORD
```

For an actual ML reload, use the original verified base folder and this adapter in a compatible environment matching the recorded versions. Load the processor/tokenizer from the base folder and apply its original chat template. Follow the original loading instructions, explicitly keeping quantization disabled and model inference-only. This offline work has not certified that the recorded dependency stack installs or runs on Benedict's local machine. Actual execution limits, timeouts and output schema must be agreed for Aaron's adapter; no new runtime entrypoint is introduced here.

## Recovery and acceptance checklist

| Remaining item | Evidence to recover / action | Responsibility |
| --- | --- | --- |
| Original D provenance and logs | From the notebook's original Drive run `05-Model-Experiments/experiment-D-from-C-20261101T051353Z`: `step18_experiment_manifest.json`, `training_results.json`, `training_started.json`, and checkpoint trainer state/training arguments where retained | Benedict |
| Exact D mixture | Original `phase-D9-final-training-mixture-v1` manifest and final training/validation metadata/checksums; retain review status | Benedict preserves original evidence; Earl authenticates the corpus/review handoff |
| Source C lineage | Original source C adapter/checksums, run configuration/results, prompt/preprocessing and code/environment provenance; do not replace with current versions | Benedict |
| Recomputable development comparison | Original raw C/D predictions, prompt/gold commitments and corrected schema audit implementation; preserve sampled-generation settings and per-example seeds | Benedict |
| Reload/API reproducibility | Standalone source, result/configuration and resource reports referenced by the final-export notebook; resolve error history and identify the exact selected export | Benedict |
| QWN-01 baseline and AGAP behavior | Clean pretrained comparison on agreed grouped reviewed data; source-linked extraction/clarification/abstention contract and untouched evaluation | Benedict supplies candidate/output evidence; Earl retains independent evaluation; Aaron/Robert own contracts |
| Runtime acceptance | Independent outcome, supported capability/limit decision, single adapter and application release wiring | Earl / Aaron / Robert |

Recovery means exporting existing evidence, not rerunning optimizer updates. Preserve anything unavailable as unavailable. If original artifacts are unrecoverable, agree the necessary reproduction separately; do not relabel public exploratory data as the reviewed AGAP release. Phase 7 integration verification can be prepared, but pending Phase 6 acceptance remains explicit.

## Verification and boundaries

The focused suite passes **60 tests**, including research-package round trips, byte tampering, changed C/D bindings, changed validation inputs, symbolic links, extra files, overwrite refusal, credential preflight, filtered notebook summaries, regex rejection and the inspected Unsloth target expression. Original reviewed-release gates continue to pass their existing tests. Application checks were not run because this change adds no application code or dependencies and is not declared application-integrated. `graft` and `graphify` are unavailable on PATH. Main, Phase 5, shared schemas, dependency files and the central assignment tracker remain unchanged. No commit, push or merge was performed.
