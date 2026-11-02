# Dataset card — AGAP cooperative review pilot 0.1

**Status:** unreviewed preparation candidate, 29 October 2026. Prepared for the user's cooperative-validation exercise. No cooperative sign-off, expert gold labels, model accuracy, lending approval or deployed functionality is claimed.

| Property | Value |
| --- | --- |
| Core data | 12 fictional scenario families, 5 tasks each, 60 examples |
| Tasks | Initial extraction; first clarification; interpretation after a reply; next clarification; five-heading 5C draft |
| Modality / language | Authored plain text / English only |
| Units / dates | Integer PHP centavos; ISO calendar dates; explicit recurring day where supplied |
| Sources | User-provided blank cooperative forms/policy as structural references; public cash-flow tools as gap references; newly authored fictional assertions |
| Label creation | Agent-authored proposed extraction/response labels; no expert review yet |
| Split | Every family is `development_review`; no training/validation/holdout split claimed |
| Real member data | None included; no source documents uploaded to a third-party service |
| Checked financial results | Not supplied; draft cannot establish affordability |
| Review evidence | Per-task CSV with candidate hashes and empty reviewer/date/check columns |

Provenance references are recorded in the source registers and gap mapping. Public structural references prompted relevant question categories; they are not borrowed borrower observations, cooperative policy or expert target labels. The core cases contain no copied real identities, credentials or cooperative member histories. Source-span targets demonstrate faithful extraction only; they do not establish the truth of the fictional speaker's claim.

The 5C targets deliberately include empty/unavailable headings where evidence is absent. They are preliminary **evidence-organized drafts**, not fully evidenced five-factor assessments. Character and collateral coverage is particularly limited. None of the examples teaches a numeric score, loan outcome, creditworthiness forecast or legal-enforcement advice. No financial arithmetic is calculated by this dataset builder.

The small, regular text template makes this useful for structure and boundary review, not a representative benchmark or sufficient full fine-tuning dataset. There are no document images, OCR errors, signatures, tables, genuine officer interactions, Filipino/Cebuano examples or reviewed complete 5C cases. One shared text-template family cannot measure generalization to unseen document templates. The trainer has seen every example and cannot call any portion of this pilot untouched.

Do not train on this candidate release. The annotation sheet is for expert correction, not an automatic acceptance switch. Preserve rejected targets and their reasons in review history, create a corrected version, and have Earl accept canonical data plus grouped splits independently. A future frozen release must record per-source permission, dataset/license versions, task/schema version, hashes, exclusions, reviewers and partition membership.

Do not use a public default/approval dataset as synthetic 5C ground truth. United States household tools provide question structure only; they do not imply appropriate Philippine expense amounts, eligibility, enforcement rules or thresholds. The separate Gretel metadata audit is excluded from all 60 examples. Its PII annotations and producer quality ratings do not label cooperative lending quality.

Rights: cooperative originals are user-supplied reference material and are not redistributed by this package; their permission for external training has not been established. CFPB-created content has a public-domain notice with a third-party-material exception; only structural ideas and links are used, without logos or endorsement. Gretel identifies its dataset as Apache-2.0; only audit metadata is retained. No blanket claim of rights over third-party source documents is made.
