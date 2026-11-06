# Qwen dataset preparation — cooperative review candidate

**29 October 2026 · QWN-01 preparation / EVAL-01 proposal · not a trained model.**

This package turns the supplied blank cooperative forms into a source inventory and proposed annotation structure, adds public household cash-flow references for missing question categories, and supplies **12 new fictional scenario families / 60 text-task candidates** for cooperative review. No real member records, completed cooperative assessments, numerical credit labels or untouched holdout are included. All candidate labels were authored during preparation and are **not expert validated**.

Start with [the cooperative review guide](review/COOPERATIVE_REVIEW.md), then open [the printable casebook](review/CASEBOOK.html) in a browser. Record task-specific corrections in [the review sheet](review/annotation_sheet.csv). The [field dictionary](spec/field_dictionary.csv), [5C proposal](spec/FIVE_C_PROTOCOL.md), [gap register](review/gaps.csv) and [policy questions](review/policy_questions.csv) make the unresolved requirements explicit. The [dataset card](DATASET_CARD.md) explains suitability and exclusions.

The authoritative [model plan](../../../docs/AGAP_Model_Training_Plan.md) still assigns Earl the accepted corpus, grouped splits and independent evaluation. Benedict supplies this preparation candidate; Earl retains independent review, split, and release authority. Preparation does not establish accepted labels or an untouched evaluation set.

## Reproduce and check locally

Requires Python 3.10+ standard library only. From the repository root:

```bash
cd models/qwen/data-preparation
python3 build.py
python3 validate.py
python3 -m unittest discover -s tests -v
```

To verify the original cooperative source hashes as well, pass the root that actually contains the user-provided folder. The originals are not bundled into this task branch:

```bash
python3 validate.py --source-root /path/to/private-source-root
```

`build.py` rebuilds the cases and HTML deterministically and **preserves** an existing annotation sheet. If source labels change, the validator detects stale review hashes. Retain the old review evidence and create a versioned corrected review sheet rather than silently attaching old sign-offs to new data.

`python3 validate.py --require-training-ready` deliberately refuses this package. Do not use pending targets as accepted training labels. Earl must accept corrections, create the canonical corpus and supply frozen training/validation manifests before a training exporter is implemented. This gate is an integrity check, not a security boundary against someone manually copying a file.

## Public-source acquisition

[The source register](sources/public_sources.json) records URLs, acquisition status, available hashes, dates, rights statements, intended uses and exclusions. `acquire_sources.py --source-root PATH --cache-dir /tmp/agap-qwen-source-cache` can repeat acquisition using the standard library and internet access. It requests only public source references/synthetic sample metadata and reads local source files for hashes; it never uploads local material. Raw public documents remain outside Git. Network acquisition is separate from the offline build/tests.

The official CFPB toolkit and legal notice were verified through the research browser. Direct PDF/file downloads returned HTTP 403 in this environment, so their registry hashes are explicitly null, not presented as acquired files. The cash-flow and events PDF bodies also timed out in the research browser; their official toolkit links and descriptions were verified. The Gretel card and 20-row sample were downloaded successfully with matching revision evidence. This limitation does not affect reproduction of the original fictional pilot; it does limit offline reproducibility of external reference content.

CFPB tools supply category/timing ideas, not Philippine lending rules or labeled borrower examples. A 20-row Gretel synthetic-finance sample was inspected for fit; only its metadata audit is retained here. Its foreign documents and PII labels are excluded from core 5C training. No generic loan-approval dataset is relabeled as a 5C expert assessment.

## After cooperative review

1. Resolve the policy questions and return corrected source-linked examples and acceptable alternative evidence. No institution-specific threshold is invented to fill a gap.
2. Earl accepts the candidate structure and prepares a larger reviewed corpus, including independently authored scenarios and unseen document-template families. Keep household, document, correction and paraphrase families together; reserve untouched holdout outside the trainer's package.
3. Aaron/Robert agree the bounded task and shared provenance envelope. Initial text questions and 5C drafts are candidates for an extension of the current training plan, not implemented runtime behavior.
4. Benedict records a pretrained `Qwen/Qwen3.5-2B` baseline, then tests LoRA on the allocated L4 using a pinned supported environment. Record actual GPU, memory, sequence length and runtime before spending a larger Colab budget. No training, model download or compute-unit expenditure occurred in this preparation.
5. Earl compares the tuned model, base model and checklist on his independent cases. Promotion requires reviewed source accuracy and boundary checks; a completed training run alone is insufficient.

Canonical presentation examples remain in `src/demo/cases.ts`, with historical independent calculation oracles in [the product freeze](../../../docs/AGAP_Product_Freeze.md). They are referenced, not copied into this candidate corpus and not claimed as untouched tests.
