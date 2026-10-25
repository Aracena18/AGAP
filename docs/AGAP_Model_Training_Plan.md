# AGAP model training and evaluation plan

**Direction:** 25 October 2026. This is a planned implementation specification, not a trained model, measured result or deployment approval. [Assignment.md](../Assignment.md) alone records tasks/status; [delivery](AGAP_Delivery_Plan.md) defines exclusive paths and staged workload. This plan supplements the [product](AGAP_Product_Solution.md) and [architecture](AGAP_Production_Architecture.md).

The user assigns **Qwen training to Benedict** and **explainable-model training to Aaron**. Two main model families are planned, with logistic regression trained as a comparison baseline. Training and evaluation are required work packages; a tuned model is not automatically eligible for runtime use.

## 1. Selected models and purpose

| Component | Owner | Purpose and boundary |
| --- | --- | --- |
| Qwen3.5-2B, LoRA fine-tuning | Benedict — QWN-01 | Read approved document images/text into source-linked candidate fields, identify possible irregular expenses and ask focused clarification questions. Neural-network fine-tuning, not training from random weights. No authenticity verdict, authoritative calculation or loan decision |
| Explainable Boosting Machine (EBM) | Aaron — XAI-01 | Offline exploratory classification of reported emergency-fund difficulty, with inspectable feature contributions. No member health score, future default forecast or lending input |
| Logistic regression | Aaron — XAI-01 | Simpler comparison for the same target, cohort, preprocessing and evaluation splits; not a third member-facing feature |
| Corpus, splits and independent evaluation | Earl — EVAL-01 | Verifiable fictional documents/known truth; frozen training/validation/holdout manifests; separate public-survey research protocol and independent artifact evaluation |
| Runtime integration and release evidence | Robert — FND-03/SHOW-01; Aaron — AI-01 | Robert reviews shared contracts/dependencies and wires registration; Aaron implements the single reusable application inference adapter. Benedict supplies the Qwen artifact and compatible inference instructions |

Technical sources checked 25 October 2026: the official [Qwen3.5-2B model card](https://huggingface.co/Qwen/Qwen3.5-2B) identifies image/text generation and Apache-2.0 licensing; [InterpretML EBM documentation](https://interpret.ml/docs/ebm.html) describes its additive, inspectable model. These support model selection, not AGAP-specific performance claims.

## 2. Qwen training data and workflow

Earl owns `evaluation/synthetic/`: generator, source documents, independent truth and split manifests. All application/presentation cases remain fictional and visibly labeled. Reference the canonical Ana/Ben/Cora cases and historical calculation oracles rather than copying them into a second fixture registry. Those known presentation cases are not an untouched benchmark.

Start with a small reviewed corpus of fictional payslips, household-expense records and farm-income/cost statements. Each example has source/page/text references; explicit supported, conflicting or unavailable values; dates; gross/net/payroll treatment; possible irregular costs; and appropriate clarification/abstention. Ground truth comes from the underlying fictional record and independent review, not unreviewed Qwen output. A past repair or repeated mention does not establish a future recurring expense.

Freeze grouped splits before tuning: keep all pages, image augmentations and paraphrases of one fictional household/scenario family together; also reserve unseen document-template families for evaluation. Do not treat near-duplicate renders as independent test cases. Training and prompt/model selection use training/validation only. Earl reserves holdout labels and executes final evaluation; if final errors guide another tuning round, retire that holdout and obtain new untouched cases.

Benedict's sequence in `models/qwen/`:

1. Agree the bounded task and proposed output envelope with Aaron/Robert, and receive Earl's versioned training/validation manifest and hashes. Training scripts consume those references without editing the corpus or evaluation runners.
2. Record the pretrained Qwen baseline with the same prompt/output schema, document preprocessing and inference limits used for comparison.
3. Run a small LoRA smoke test on an available free cloud GPU. Verify supported precision, image tokens, sequence length, batch size and actual peak memory before increasing scope. No GPU purchase or paid service is implied.
4. Fine-tune on the reviewed training split; choose checkpoint/prompt/hyperparameters using validation only. Save resumable checkpoints outside Git and record actual failed/interrupted runs as well as successful ones.
5. Return the artifact manifest, adapter/config, pinned base-model and tokenizer/processor revisions, code/environment versions, seed, dataset/split hashes, license/provenance, training logs and reproducible evaluation/inference instructions. Keep large weights/checkpoints in an approved artifact location with checksums; no secrets or raw real member records in Git.

The [Unsloth Qwen3.5 training guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune) supplies model-specific LoRA/Colab instructions and currently advises against 4-bit QLoRA for this family. Pin a tested environment during implementation; do not assume every free GPU supports the same precision or memory configuration. [Colab's FAQ](https://research.google.com/colaboratory/faq.html) states that free resources and limits are not guaranteed. Colab is a training option, not a guaranteed always-on application inference service. If resources fail, record QWN-01 as unfinished/blocked with evidence; the manual/checklist or evaluated pretrained path remains available without a claim of completed fine-tuning.

## 3. Explainable research data and workflow

The initial public-data candidate is the [Philippine Global Findex 2025 survey](https://microdata.worldbank.org/catalog/7965), collected in 2024. Its [dictionary](https://microdata.worldbank.org/catalog/7965/data-dictionary/F1?file_name=Findex_Microdata_2025_updatePhilippines) lists `fin24a`, reported difficulty obtaining emergency funds within 30 days. This is a cross-sectional self-report target, not observed loan default, future hardship or an experimentally measured response to assistance.

This is a **separate offline research dataset**, not a source of application fixtures, real cooperative records or member-model training labels. The synthetic application demo remains unchanged in that respect. Aaron must verify access terms, attribution, version, response coding and permitted processing before obtaining/using data. Raw survey files stay in an approved local/cloud research cache outside Git, with source/version/hash references in the run manifest. If access or coding cannot be established, report the blocker; fictional smoke tests do not substantiate survey findings.

Aaron's sequence in `models/explainable/`, reviewed by Earl:

1. Freeze the cohort and codebook-derived difficult/not-difficult target mapping before model fitting. Unknown/refused/skipped target responses are not negative labels. Document exclusions, feature missingness and the limits of any binary collapse.
2. Choose a small justified feature set. Exclude IDs, survey weights as predictors, the target itself, derived copies, and near-equivalent emergency-resilience responses unless independently justified. Do not select features because they happened to correlate well on the holdout. Report sample/exclusion counts and class balance.
3. Agree split IDs/seed and evaluation protocol with Earl before tuning. Use training-only preprocessing/imputation, stratified train/validation or cross-validation within development data, and one untouched final holdout. Both models use identical cohorts/splits. Survey weights receive an explicit, documented treatment in fitting and reporting; a convenient random split is not proof of deployment generalization.
4. Fit logistic regression and an EBM on CPU. Tune only on development data. Record configuration, seeds, feature/target mappings, fitted preprocessing, data hashes and artifacts with an offline model card.
5. Deliver both artifacts and fixed inference interfaces to Earl for independent evaluation. Show additive EBM contributions and their limitations in an offline report; association does not establish a cause or prove that changing a feature improves wellbeing.

Do not map these survey features onto members, show an individual probability in the portal, feed it to affordability/approval, or use it to rank support requests. Any cooperative-specific predictive deployment requires a separately reviewed target, relevant data, permissions, evaluation and architecture proposal. Training XAI-01 is part of the current scope; runtime deployment is not.

## 4. Evaluation and release gates

Earl owns the final reports and runners in `evaluation/synthetic/` and `evaluation/explainable/`. Trainers supply artifacts and reproduce development runs within their own paths. Evaluation occurs in two handoffs: data/protocol first, final artifact scoring later, so training and evaluation are not mutually blocking whole tasks. Robert owns shared manifest schemas, dependency registration and presentation wiring.

| Evaluation | Required evidence |
| --- | --- |
| Qwen pretrained versus tuned | Same held-out documents/task/settings; field/date and source-reference correctness, schema validity, missed relevant expenses, invented values/recurrence, appropriate abstention, correction effort, latency and peak resources; show denominators and error examples |
| AI workflow versus checklist/plain form | Same relevant scenarios; completion and missed costs, unsupported assumptions, human corrections and appropriate next action; distinguish observed participant effort from automated proxy measures |
| EBM versus logistic regression | Same weighted/unweighted reporting protocol; class distribution, discrimination and precision/recall at validation-chosen thresholds, Brier/calibration evidence, uncertainty and small-sample/subgroup limits. Do not claim broad fairness from limited cells |
| Financial/workflow integrity | Independently checked calculations and existing oracles, no duplicate expense/deduction, explicit unknowns/horizon, source confirmation, stale-input review and no AI authority |

Before the holdout is opened, record the intended improvement measure and acceptable regressions, including unsupported financial claims and source errors. Promote the tuned Qwen artifact only after reproducibility, schema/source checks and that reviewed comparison pass. Do not invent a successful result or automatically promote the latest checkpoint. A documented training run with no demonstrated gain is still an honest experiment; retain the better evaluated baseline/manual path and record the non-promotion.

The same rule applies to XAI conclusions: report a weak/null result when the EBM offers no reliable advantage. Neither explainability nor synthetic accuracy establishes causation, document authenticity, reduced defaults or improved real household outcomes.

## 5. Runtime and delivery boundary

Training notebooks run offline from AGAP's loan API/database. Approved Qwen inference uses Aaron's single adapter; the configured endpoint/runtime is selected and wired through Robert after evaluation, without exposing browser keys. Cleared minimum document inputs produce untrusted drafts; member/staff confirmation precedes assessment inputs, independent verification remains separate, and the existing deterministic engine alone calculates financial results. Templates/manual entry remain available.

FND-03 proposes base/artifact/checksum, prompt/schema/dataset/evaluation versions and runtime limits in the next shared contract review. This document changes no executable contract, generated client, migration or dependency. A notebook output/prerecorded response is labeled as such, not a live tuned-model call. Keep EBM/logistic research reports outside operational lending/member APIs.

The 16-unit-per-owner allocation includes model/data preparation, testing/review and integration. It expands total estimated effort; it does not guarantee a date or free hosted inference. The first demo retains the controlled money path and payment-help queue, while Benedict's first authorized contractual amendment and the remaining SRV-01 lifecycle remain assigned to stage 2. Full lending/accounting/operational obligations are preserved.
