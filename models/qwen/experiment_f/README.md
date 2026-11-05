# Experiment F fictional review pilot

5 November 2026. QWN-01 / AI-01 / SHOW-01. The [coordinated proposal](../../../docs/AGAP_Experiment_F_Pilot_Contract_Proposal.md) precedes these additive contracts. This is an explicitly **unapproved fictional candidate**. It preserves Experiment D and the original pinned pretrained extraction baseline. No model output creates a financial fact, verifies authenticity, calculates affordability or makes a lending decision.

## Imported identity

[identity.json](identity.json) commits the complete supplied F integration ZIP and its 14 file hashes. F is a 67,332,688-byte LoRA on `unsloth/Qwen3.5-2B` revision `fffbc0d8711cf87df6d1f97938c5e50ef94aadc7`; it is not a full model. Its SHA256 is `d545e956fc4bfde80ae78eac592de1bc7355a8e767c20facdc39c536db157f00`. The separately downloaded 4,548,221,488-byte file is the unchanged base shard, SHA256 `aa33250c4fc64891ddfaba3a314fd9542ea371843c387178b425fbcc5ed680b1`.

The upstream README reports 7/20 strict stress passes for F and 9/20 for the clean base, with no independent human/cooperative evaluation. Training completion and these development results do not approve a release. The six-field F payload is qualitative review, not the existing extraction/fact schema.

## Safe local import

The importer uses only Python's standard library. It validates nested member paths, links, inventories, decompressed limits, the exact F ZIP, each upstream file and every base file before atomic publication. It never executes downloaded Python/bytecode, renames originals or overwrites an existing artifact. The large verified base is hardlinked when possible and copied only across filesystems. Startup rechecks all hashes; do not modify a linked original.

```bash
python3 -m models.qwen.import_f import \
  --bundle '/home/robert_jhon/Downloads/NEW TRAINING (11-04-26)-20261104T174659Z-1-002.zip' \
  --bundle '/home/robert_jhon/Downloads/NEW TRAINING (11-04-26)-20261104T174659Z-1-003.zip' \
  --weights '/home/robert_jhon/Downloads/model.safetensors-00001-of-00001-001-001.safetensors' \
  --destination models/qwen/artifacts/experiment-f-v1
python3 -m models.qwen.import_f candidate --directory models/qwen/artifacts/experiment-f-v1
```

The imported directory contains `base_model/`, `adapter/`, inert `upstream/`, the chosen `environment_versions.json`, an artifact manifest, import report and `fictional-candidate.json`. Everything in `models/qwen/artifacts/` remains ignored. The importer excludes foreign compiled bytecode. Original training records, targets and private evaluation packets are not imported.

Actual local import verified 32 files with base hardlinking. Export-manifest SHA256: `f6d68c77f2baa1d70385c24477e889bcd78a1d68ee812798724624b414d7a62b`. Candidate SHA256: `22de187353423cf4b148157474ffc090df7c07411ac4409737228c13ddfba053`. These are import/configuration results, not inference results.

## Capability and deployment contract

[Canonical review schemas](../../../packages/contracts/src/model-review.ts) generate the Python [result](../service/review.schema.json) and [input](../service/review-input.schema.json) schemas. Regenerate/check with `npx tsx models/qwen/service/generate-review-schema.ts [--check]`. This does not duplicate the financial-fact registry.

The existing Qwen transport exposes `reviewAdapter()` only for the configured F candidate. Its extraction `provenance` remains the baseline; review provenance binds F separately. Review receives a question plus 1–12 exact source excerpts and returns either a validated `REQUIRES_HUMAN_REVIEW` payload or `REJECT_AND_ESCALATE` with no payload. All financial-semantic/decision-permission flags remain false. The application resolves authorized current excerpts and persists their versions/spans; the model transport has no database access.

Set `FICTIONAL_PILOT_ENABLED=true`, `EVIDENCE_RECORD_MODE=fictional`, non-production `NODE_ENV`, `QWEN_FICTIONAL_CANDIDATE_FILE` and `QWEN_FICTIONAL_CANDIDATE_SHA256`, plus the normal endpoint/token/artifact bindings. Accepted-release and candidate inputs are mutually exclusive. Missing pilot configuration, production or real records reject candidate activation. Existing accepted baseline release checks remain unchanged; no approval/review reference is fabricated.

[The private service](../service/README.md) runs one BF16 base plus unmerged F behind one generation lock. `/extract` disables F; `/review` enables it. A real clean-base/disabled-adapter startup probe must match before readiness. Both use exact prompt/schema provenance. There is no source truncation, public API key, tool execution or automatic loan decision. Over-limit input, failed output, busy service and generation timeout retain manual follow-up.

The [A100 Docker recipe](../../../infra/Dockerfile.qwen) pins its verified CUDA base digest and the existing six direct ML versions. It records transitive resolved versions in `/opt/runtime-freeze.txt`; this recipe is not an attested F training environment. Capture the built image digest and freeze before GPU evaluation. The F ZIP did not supply an exact environment. No T4/FP16 or quantization fallback is enabled. Actual Azure compatibility remains an execution requirement, subject to the authorized credit/time cap.

## Evidence and limits

Run `python3 -m unittest models.qwen.test_import_f models.qwen.service.test_service` for importer/guard/configuration/auth/lock tests and the focused Qwen platform tests for the transport. These use tiny fictional artifacts and simulated responses. They establish no model accuracy.

`python3 -m models.qwen.service.compare --help` supplies an offline same-task comparison: clean base before attaching F, F, then disabled base. It keeps identical public fictional inputs/prompt/schema/budgets, raw responses, source/schema failures, measured latency/memory and clean/disabled parity. Its four [public development smoke inputs](development-smoke.inputs.json) have no ground-truth labels and are not a held-out benchmark. No pass count certifies financial interpretations.

`python3 -m models.qwen.service.smoke --candidate PATH --output NEW_DIRECTORY` performs actual authenticated readiness → extraction → F review → extraction HTTP calls. Read the private service token from `QWEN_SERVICE_TOKEN`; never put it in a command argument. Outputs remain fictional local evidence and cannot promote the model. Stop the service before running the offline GPU comparator to avoid two resident models competing for memory.

Local preflight still reports absent torch/Transformers/PEFT/Unsloth/safetensors and unavailable NVIDIA runtime. Actual GPU inference, image build, F export parity and independent acceptance have not been established by local parser/import checks.
