# AGAP direct documentation publication

25 October 2026, Asia/Manila. The user requested a direct push instead of documentation PRs. This publication is based on main `693ddc8` and adopts the coordinated AI/mobile/model-training plan from immutable source `19674ea8544e8401e7b2c8ed2903f4c84adb6e35`.

[Assignment.md](../Assignment.md) is the sole current task/status tracker. The [model training plan](AGAP_Model_Training_Plan.md), [architecture](AGAP_Production_Architecture.md) and [delivery plan](AGAP_Delivery_Plan.md) are published together. Qwen training stays with Benedict, EBM/logistic training with Aaron, independent data/evaluation with Earl and member screens/contracts/integration with Robert. The four provisional first-demo budgets remain 16 units each; SRV-01 stays assigned to Benedict in stage 2.

## Publication boundary

Only active Markdown documentation is brought into main. The separate platform candidate remains unmerged: no API code, dependencies, generated contracts, migrations, configuration, application tests or executable frontend changes are imported. Main's README commands describe its actual fictional-browser scripts. Staff-intake commands and behavior are explicitly identified as separate-candidate instructions.

Links to candidate code, screenshots and historical verification absent from main point to their immutable published source. Those historical evidence files are preserved on their original commit rather than copied or rewritten. Their earlier audit counts/results remain dated branch evidence, not fresh application results for main.

The direct publication completes documentation tasks PLN-01/PLN-02 under the user's authorized workflow. FND-01/FND-02 remain Ready for review, OPS-01 remains In progress and model/feature tasks remain Not started. Publishing this plan does not freeze a feature-integration base or authorize unrelated feature merges.

## Verification

The audit resolved relative links/heading fragments and pinned-source references, task ownership/acceptance/stages, dependency cycles, exact per-task workload agreement across tracker/delivery/briefs and exclusive path ownership. Every non-publication tracked file was compared with main's base, including executable sources and historical calculation oracles.

| Check | Result |
| --- | --- |
| Changed files | 14 Markdown documents only |
| Local references | 166 links/heading fragments resolve |
| Pinned source references | 32 checked against actual immutable Git objects and applicable Markdown headings |
| Tasks/dependencies | 20 singly owned tasks with acceptance/next actions; acyclic prerequisites |
| Workload | Exact task budgets agree across tracker/delivery/briefs; 16 units per owner |
| Ownership | 44 explicit path entries; no cross-owner prefix overlap |
| Main implementation | All 74 existing tracked files outside the allowed publication documents remain byte-identical |
| Progress/history | Feature statuses and historical handoff content preserved; only completed documentation tasks change to Integrated; original evidence stays on its pinned commit |
| Whitespace | `git diff --check` passed |

Documentation-only contributor checks apply. Application suites and training are not run because neither application code nor models change. Any remote CI result is separate from the local documentation audit; no historical application pass is presented as a new pass.

## Workflow

Publish with a normal fast-forward push to main, without force or a PR merge. Existing documentation PRs are superseded by this publication; their descriptions and feature-candidate branches remain historical references. Future feature work retains the contributor checks and explicit merge authorization. Unrelated local files/worktrees are preserved.
