# EVAL-01 independent research protocol

Earl independently evaluates Aaron's XAI-01 EBM/logistic artifacts under the [training plan](../../docs/AGAP_Model_Training_Plan.md#3-explainable-research-data-and-workflow). This protocol is a proposal for review. No research dataset has been downloaded, response code mapping adopted, model executed or research result measured by this implementation.

The Philippine Findex source and `fin24a` target referenced in that plan are candidates. Aaron must provide verified access/processing terms, attribution, the actual dataset/codebook version and response coding before data is used. The intended target is reported emergency-fund difficulty, not loan default, future hardship or causal response to support. Keep this research separate from [fictional application data](../synthetic/README.md).

## Freeze before fitting

Record the following decisions in an immutable, hash-addressed protocol/data manifest agreed by Aaron and Earl. Robert reviews any shared artifact/wire interface or dependency proposal. Do not fill unresolved items with invented response codes, sample counts or thresholds.

| Protocol item | Required evidence |
| --- | --- |
| Access and provenance | Source/version/date, permitted processing/attribution, dataset/codebook hashes and approved raw-data storage |
| Cohort | Reproducible inclusion/exclusion rules, stable row identities, duplicate/related-record treatment and counts at each step |
| Target | Exact codebook mapping, positive class, exclusions and limits of any binary collapse. Refused/unknown/skipped responses are not negatives |
| Features | Justified predeclared list; exclude identifiers, weights as predictors, the target, derived target copies and unreviewed near-equivalent questions |
| Missingness/preprocessing | Training-only fitting/imputation/encoding; frozen transforms reused on validation/holdout; report exclusions and unavailable inputs |
| Weights/design | Explicit treatment in fitting and weighted/unweighted reporting; survey/design limitations and any resampling unit |
| Splits | Development/validation and untouched holdout IDs/seed/hashes; grouping rules, class distribution, independent counts and no overlap |
| Selection | Validation-only checkpoint/hyperparameter/threshold selection; predefined primary comparisons and acceptable regressions |
| Artifacts | Fixed EBM/logistic and preprocessing artifacts, checksums, configuration, environment, feature order, class order, input/output interface and training logs |
| Final reporting | Discrimination, validation-threshold precision/recall, Brier/calibration, uncertainty method, subgroup counts/small-cell limits and error analysis |

Earl reserves final holdout rows/labels through an agreed evaluator-controlled process. Raw survey data and caches stay outside Git in approved storage; trainers receive the intended development partition. Public availability of source data is not permission to tune on reserved holdout records. Store protocol/cohort/split hashes and access/reproduction instructions without exposing final labels during model selection.

Both models consume identical reviewed cohorts/splits and compatible feature/preprocessing definitions. No feature or threshold is selected from holdout performance. If final evaluation informs another tuning round, preserve its result and retire that holdout before a new experiment.

## Independent artifact evaluation

Aaron first supplies the codebook/cohort/feature proposal for protocol review, then trains in `models/explainable/` and returns both fixed artifacts. Earl runs them independently on the reserved cohort with labels excluded from inference and validates row alignment, artifact/data hashes, class order and probability ranges before calculating metrics. Missing/duplicate/extra row IDs, mismatched transforms or incompatible versions invalidate the run rather than disappearing from denominators.

Report sample/exclusion counts, class balance and measured results with uncertainty and explicit design limitations. Use the predeclared weighting/calibration/threshold protocol. Small or absent subgroups remain insufficient evidence. A weak/null result or an EBM that offers no reliable gain remains a valid outcome; explainability does not establish predictive usefulness or causation.

The research evaluator and metric tests follow once the actual codebook and artifact interface are available. No placeholder metric is zero, and a synthetic harness test cannot substantiate a survey finding.

## Boundary and handoff

The output is an offline research report with dataset/protocol/model versions, source attribution, measured comparisons, error examples and limits. It has no operational endpoint, member score or route into assessments, approvals, goals or support ranking. Any later operational predictive use requires its own reviewed target, relevant data, authorization and architecture.

The initial handoff is this reviewable protocol and the required-data/artifact contract above. Actual source-term/codebook evidence, agreed mappings/splits, returned artifacts and final independent metrics remain receiving-owner inputs, recorded in the [Earl task brief](../../docs/tasks/production/04-accounting-monitoring.md). Assignment.md remains the task/status tracker.
