# AGAP model training and evaluation plan

This plan defines training, reproducibility, evaluation, and promotion requirements. The [team reference](../Assignment.md) records ownership/status; [verification](AGAP_Verification.md) separates supplied artifacts and tools from actual inference and independent acceptance.

## Current artifact status

Experiment D retains its original [manifest](../models/qwen/model_manifest.json) and [local instructions](../models/qwen/README_LOCAL.md). [Experiment F](../models/qwen/experiment_f/README.md) supplies a verified qualitative-review LoRA import and private service candidate, distinct from pretrained financial extraction. Its original development comparison is not independent acceptance. Large weights remain outside Git; the repository does not provide an approved live model endpoint.

Actual GPU execution/parity, compatible runtime evidence, missing training provenance, independent comparisons, and promotion remain required. Numerical 5C review and goal guidance are separately evaluated planned extensions. EBM/logistic survey research has no operational lending API.

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

The [Unsloth Qwen3.5 training guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune) supplies model-specific LoRA/Colab instructions and, when checked, advised against 4-bit QLoRA for this family. Pin a tested environment during implementation; do not assume every free GPU supports the same precision or memory configuration. [Colab's FAQ](https://research.google.com/colaboratory/faq.html) states that free resources and limits are not guaranteed. Colab is a training option, not a guaranteed always-on application inference service. If resources fail, record QWN-01 as unfinished/blocked with evidence; the manual/checklist or evaluated pretrained path remains available without a claim of completed fine-tuning.

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

Canonical artifact/provenance contracts bind base/adapter checksums, prompt/schema/dataset/evaluation versions, and runtime limits. The implemented extraction/review transports remain subject to their separate release or fictional-candidate gates. A notebook output/prerecorded response is labeled as such, not a live tuned-model call. Keep EBM/logistic research reports outside operational lending/member APIs.

The historical 16-unit-per-owner allocation covered first-demo preparation/testing/integration; it does not guarantee a date, complete product, or free hosted inference. The first demo retains the controlled money path and payment-help queue, while Benedict's first authorized contractual amendment and the remaining SRV-01 lifecycle remain assigned to stage 2. Full lending/accounting/operational obligations are preserved.

## 6. Goal-guidance training extension (29 October 2026)

The planned extension covers personalized saving/investment suggestions and emergency, travel, leisure or other member-chosen goals. The [product scope](AGAP_Product_Solution.md#member-goals-savings-and-cooperative-product-guidance), [architecture](AGAP_Production_Architecture.md#8-models-research-and-planned-extensions) and [design](../design.md#11-planned-goals-savings-and-product-guidance-29-october-2026) govern the future workflow. This is a new task/release target, not a claim that an extraction-trained model can already advise safely. It adds no new model family or provider adapter. EBM/logistic research has no role in an individual's contribution, investment readiness, product suitability or guidance priority.

### Task, corpus and independent ownership

Benedict owns QWN-02 in the existing models/qwen training boundary. Earl owns EVAL-02 data/protocol and independent final evaluation within evaluation/synthetic; Aaron supplies reviewed CRD-02 outputs and the single inference adapter; Robert proposes FND-04 contracts/runtime wiring and owns MOB-02. Earl owns monitoring's reviewed educational corpus and domain prompts under GOL-01. Qualified institutional reviewers must validate financial content and product-specific suitability examples before those labels are used; external educational text is not proof of a local product's availability or permission to reproduce it. Record source/license/date and approval/version. No real member records are required for the fictional corpus.

Add paired fictional contexts and expected bounded guidance: confirmed household facts, stated assumptions, goal and deadline/priority, allocated accessible savings, checked dated contribution scenarios, permitted catalogue terms and review requirements. Targets may explain a checked contribution/date, request missing information, propose member-agreed alternatives or draft a product consideration with appropriate review status. They cannot calculate authoritative amounts, fabricate product terms, infer hidden expenses/risk preferences, promise returns or change contracts. Numerical answers are supplied by independently checked planner outputs rather than model-generated arithmetic. Approved education is retrieved/versioned at runtime; fine-tuning does not replace current product facts or policy.

Coverage must include emergency, travel and leisure goals without shaming; absent/uncertain dates or values; no surplus and pre-payday shortages; variable income; simultaneous commitments to the same money; existing restricted share capital; unavailable/expired products; fees/lockups; uncertain returns/loss; unsupported advice; stale source/goal/catalogue versions; refusal/paused goals; malicious document instructions; and AI-unavailable template behavior. Include examples where appropriate guidance is to clarify, keep funds accessible, revisit a goal or seek staff support, rather than always suggest saving/investing. A general promise that everyone can save or a fixed savings percentage is not an acceptable target.

### Training, evaluation and promotion

Earl first freezes grouped household/scenario/template splits and the reviewed content/catalogue snapshots, handing only training/validation references to Benedict. This data/protocol handoff precedes training; final EVAL-02 scoring later consumes returned QWN-02 artifacts, avoiding a whole-task dependency cycle. Keep holdout families and labels out of tuning. Existing Ana/Ben/Cora fixtures remain referenced historical checks, not a new training registry or an untouched goal benchmark.

Compare the current eligible Qwen, a guidance-adapted checkpoint and a deterministic calculator-plus-reviewed-template/checklist on identical inputs. Benedict may reuse the QWN-01 training pipeline and start from a documented eligible checkpoint, but goal tuning must also regression-test extraction, source fidelity and abstention. Do not automatically replace the shared runtime artifact or multiply runtimes; an integrated artifact needs evidence for every enabled capability.

Before opening the holdout, Earl and the institutional reviewers record target measures and acceptable regressions: exact reproduction of checked money/dates/product references; explicit horizon/uncertainty; essential-needs and allocation constraints; missing-data abstention; correct advice-review status; risk/fee/liquidity disclosure; no invented returns, sales pressure or unsuitable product steering; member comprehension and correction burden; latency/resources and honest fallback. Check source-grounded claims, not merely fluent text or schema validity. Keep advice safety and extraction performance separately reported. Technical guidance accuracy is not evidence of a member saving money or improving wellbeing; that needs later separately authorized outcome evaluation.

Save base/processor/adapter revisions, corpus/split/content/catalogue/engine versions, environment/config/seed, logs, resource measurements and release decision as for QWN-01. Promote goal guidance only after its separate reviewed gate passes, and keep product-specific investment drafts staff-only until human suitability review, even after model promotion. If training is unfinished or offers no supported improvement, retain the evaluated template/manual or eligible baseline path and label the result honestly. GOL-01/QWN-02/EVAL-02 and their related contract/planner/portal work are additional unestimated scope, stage 2 by default; they are not hidden in the current 64-unit first-demo budget.

## 7. Institution-rubric 5C analysis and explanation extension (29 October 2026)

QWN-03 is a separately evaluated use of the same Qwen family for [5C evidence analysis and handoff](AGAP_Product_Solution.md#ai-assisted-5c-review-and-explainable-handoff). It is distinct from QWN-01 extraction and QWN-02 goal guidance. Benedict owns adaptation and source-checked decision explanations/handoff within existing owned model/decision paths; Earl owns EVAL-03 reviewed corpus, protocol and final evaluation; Aaron supplies CRD-03 rubric/checked results and the same AI adapter; Robert owns proposed FND-05 contracts/registration. Additional work is unestimated stage 2 scope, not hidden in current first-demo budgets.

Define the institution/product-specific rubric before creating numerical labels. Record source/date, approval, criteria, ordinal levels/points/weights, applicability/unknown rules and versions. Public five-Cs educational sources do not supply validated outcome labels or universal weights. A fictional rubric may be used for labeled development examples with independently calculated expectations, never claimed as a real lender's scorecard. Do not ask Qwen to create its own scores as ground truth or learn from unreviewed generated rationales.

Training pairs include authorized fictional documents/member statements, confirmed facts/verification state, defined rubric criteria and checked finance results. Expected outputs are source-linked category/criterion findings, supported candidate interpretations, focused clarification and faithful explanations of supplied scoring traces. Objective scores and every percentage are calculated by the deterministic rule service. Discretionary interpretations remain staff-reviewed. Do not label an honest/dishonest trait, infer risk from language/appearance/sensitive proxies, invent facts/weights, or convert model confidence into a repayment probability.

Earl freezes grouped household/template/rubric-family development and holdout splits before adaptation. Train/select on training/validation only, reserve final labels for independent review, and regress extraction and any enabled goal capabilities when selecting a shared artifact. Compare Qwen-assisted review with the same rubric/finance tools plus a checklist/template and blinded staff rubric review. Test category mapping, accepted-criterion agreement, source/reference/trace fidelity, missing/illegible/conflicting data, no credit file, product-specific not-applicable collateral, denominator/rounding, altered source/rubric versions, prompt injection, fabricated probabilities, unsupported explanations, and counterfactual changes to irrelevant demographic/language details while financial evidence stays the same. Preserve Ben's shortfall and Cora's incomplete state rather than hiding them behind an aggregate. Measure correction burden, comprehension and appropriate next action; report uncertainty and disagreements, not just format validity.

A fluent Qwen explanation is not independent explainable-AI evidence. For the rule score, publish the actual criterion/weight/point calculation trace and its limits. A later trained predictive model would need its own valid target and relevant outcome data, independent predictive/calibration testing, and an explanation method faithful to that model. XAI-01 EBM/logistic artifacts concern reported emergency-fund difficulty and cannot be retargeted or presented as explanations of Qwen's 5C judgment. No default/repayment-probability deployment is part of QWN-03.

Release only after schema/source/score-trace validation, expert rubric review, independent comparison and current human-review controls pass. No acceptable result means retain the reviewed manual/template baseline. Keep model/rubric/content/engine/data/split versions and promotion evidence together; training completion alone changes neither lending authority nor runtime capability flags.
