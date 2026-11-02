# Private pretrained Qwen extraction service

The executable is `python3 -m models.qwen.service.server`. It performs inference only, loads the checksum-bound pretrained base **before any adapter**, and never attaches Experiment D. Its offline loader/environment verification reuses the existing QWN-01 handoff. The baseline repository/revision come from [the existing model manifest](../model_manifest.json); no second model pin is invented.

`finding.schema.json` is generated from the canonical 0.3.0 TypeScript contract by `npm run contracts:generate` and checked by `npm run contracts:check`. Every candidate may retain null dates, empty cash dates, unknown gross/net/period/deduction treatment and explicit unavailable amounts. The service has no database, affordability engine, decision function or document-download credentials.

Required deployment inputs:

- Compatible actual CUDA BF16 environment with the exact [recorded versions](../environment_versions.json), local verified original `base_model`/handoff export and valid GPU quota. Install libraries from an independently reviewed build; this repository does not silently download model code or weights at runtime.
- `QWEN_ARTIFACT_DIRECTORY`, `QWEN_EXPORT_MANIFEST_SHA256`, `QWEN_RELEASE_FILE`, `QWEN_RELEASE_SHA256`, `QWEN_SERVICE_TOKEN` (32+ characters). The API/worker uses the same artifact binding and private endpoint/token; all secrets stay server-side.
- Private authenticated HTTPS ingress. Bind `QWEN_BIND=0.0.0.0` only inside that private container/network; the process defaults to loopback. No public GPU endpoint or unauthenticated inference is allowed.
- Explicit resource limits, single concurrent generation, 4,096 input tokens, 2,048 output tokens and generation deadline. Over-budget/incomplete generation fails and produces manual fallback. The worker allows at most 32 exact 2,000-character chunks/document, preserves pages, bounds retries and validates response size/schema/amounts/dates/excerpts. Content never enters operational logs.

## Execution and release

1. Run `python3 -m models.qwen.verification preflight --out NEW-REPORT.json`; failures are actual blockers, not successful model evaluation. The [current local report](../../../docs/evidence/qwen-preflight-2026-11-03.json) records no GPU/libraries and `modelExecuted:false`.
2. Obtain/check the original artifact export and compatible GPU environment. Compute SHA-256 for this service's prompt and generated schema. Bind those hashes as `artifact.promptVersion` and `artifact.schemaVersion`. Use the manifest's base model/revision, `artifactSha256:null` for the pretrained base, actual corpus commitment and evaluation reference.
3. Execute the service against fictional documents and the reviewed independent corpus, preserving raw results, exact input/prompt/schema/runtime hashes, latency, resource limits and failures. Compare independent expected facts, unsupported suggestions, gross/net/deduction mistakes, hallucinated dates, source citations and instruction attacks. Test the actual application worker-to-service call, manual fallback and restart recovery. The deterministic HTTP adapter tests are explicitly simulated and establish no model accuracy.
4. Have an independent evaluator review actual outputs against the release criteria and record the real review reference. Existing research summaries and the GPU preflight do not approve a release. Experiment D additionally needs its missing provenance/reproducibility evidence and a separately authorized adapter release implementation; it is rejected by the deployment adapter now.
5. Only then create a release record with `approved:true`, actual `independentReviewReference`, explicitly approved `realRecordsApproved`, and the exact `artifact` envelope. Do not copy a test fixture or invent review evidence. `QwenAdapter.configured` requires that release and its committed checksum; real mode requires real-record acceptance as well. The service can run in an isolated fictional evaluation environment before application activation; it does not create an approval itself.

No actual GPU inference or independent financial/model acceptance has been completed by this implementation. Missing configuration leaves the application's documented manual entry path available.
