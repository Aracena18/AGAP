# Benedict — Phase 0 interface alignment

**Prepared:** 1 November 2026, Asia/Manila. **Scope:** DEC-01/PAY-01/QWN-01 boundary review, retaining later SRV-01/QWN-02/QWN-03 ownership. This is Benedict's prepared review package, not a claim that Robert, Aaron, Earl or the cooperative has accepted the proposals.

The user confirms the team's meeting agreement to centralize UI/UX documentation. Existing [design.md](../../../../design.md) remains the sole UI/UX authority, with [tokens](../../../../src/styles/tokens.css), [global styles](../../../../src/styles/global.css), [shared controls](../../../../src/shared/ui/index.tsx) and [frontend specification](../../../AGAP_Frontend_Spec.md). No new design system, visual values or screen-layout rules are defined here. Follow the existing decision/print and planned 5C blueprints; propose any required design change through its owner.

Phase 0 also aligns technical module interfaces: data provenance, actor scope, versions, transactions, money commands and handoffs. Centralized appearance does not establish these runtime boundaries. [Assignment.md](../../../../Assignment.md#benedict) remains the sole task-status tracker; local review IDs below identify interface questions, not new project tasks.

## Review basis and readiness

| Item | Evidence and treatment |
| --- | --- |
| Inspected Git base | `1776d9fdd5022e141a48ba1fda318636637e3d85`; includes Earl's posting/reconciliation candidates |
| Working branch | `feat/benedict-dec-01-phase1`; Phase 0 documentation follows the unmerged Phase 1 implementation in the same isolated worktree |
| Canonical executable contract | 0.2.0 in `packages/contracts/src/schemas.ts`; generation and domain registration remain Robert's |
| Phase 1 rules | [Module-local proposal](../../../../apps/api/src/modules/decisions/README.md), with [verification](../03-benedict-phase1-verification.md); independent rules do not establish an accepted shared contract |
| Existing staff/member foundation | Real identity/intake/facade code exists. Decision/servicing operations and default member domain implementations remain unavailable |
| Accounting candidate | Earl's actual posting/checker code exists. Accepted registration, real PAY-01 projection and approved mappings are still integration requirements |
| Owner agreement | **Not recorded.** Inspected base/version are review inputs, not an owner-agreed integration base |

[source_manifest.json](source_manifest.json) records inspected file hashes, including the uncommitted Phase 1 files. A hash identifies reviewed content; it is not a signature or proof of acceptance. If relevant content/base changes, review the affected proposal again. The historical platform/model verification records are not rerun or overwritten by this documentation work.

## Package contents

| Artifact | Purpose |
| --- | --- |
| [Interface proposal](INTERFACE_PROPOSAL.md) | Fifteen reviewed boundaries, canonical reuse and exact gaps to settle |
| [Permission matrix](permission_matrix.csv) | Principal/role/scope/separation rules and current versus proposed enforcement |
| [Transition matrix](transition_matrix.csv) | Allowed actions, prerequisites, version/idempotency expectations and transaction effects |
| [Owner handoffs](OWNER_HANDOFFS.md) | Concrete requests and receiving-owner deliverables; prepared here, not sent externally |
| [Scenario checklist](SCENARIO_CHECKLIST.md) | Independent rule evidence and the runtime/integration checks still needed |
| [Review log](review_log.csv) | Affected task IDs, responsible producer/reviewers, evidence fingerprint and empty acceptance fields |
| [Verification](VERIFICATION.md) | Executed consistency checks and the boundary between preparation and actual owner agreement |

Permission rows containing several roles mean **any listed role plus all stated scope/authority guards**, not automatic access to every record. Empty role cells identify an unresolved permission mapping or a member principal, not permission for anyone. Transition rows describe the proposed persistent lifecycle: `phase1_rule_only` means a pure candidate/guard exists, while status mutation and transaction effects still require integration. The Phase 1 functions do not persist these transitions.

## What is settled and what remains open

Reuse the repository's stack, shared UI, canonical money/date/schema definitions, generated transport, real actor/transaction coordinators and one finance/inference implementation. These are documented project directions. Follow existing `If-Match`, idempotency and error conventions. Do not introduce a second provider client, calculator, ledger, member portal or command coordinator.

The proposed additional projections/operations are not yet canonical. Named owners must review the source/freshness/permission/transaction boundaries, and Robert must publish any accepted shared revision and register the real services. The cooperative still needs to confirm operative product/authority/conflict/exception/expiry/acknowledgment settings. Generic safeguards and fictional rule tests can progress before these settings are approved; operational activation cannot use guessed defaults.

The user-reported Colab run can continue independently. Model completion does not authorize runtime promotion, and inference delay does not block the deterministic/manual decision path. Earl retains independent evaluation; Robert/Aaron retain runtime selection/adapter integration.

## Closure procedure

1. Each named producer/consumer reviews its rows using the exact source manifest and records `accept`, `revise`, `defer` or `reject`, reviewer/date and an evidence reference in the review log. Its initial `pending` values record that no agreement was supplied here.
2. Robert records the agreed base and canonical contract version or an explicitly scoped revision. A meeting agreement about UI centralization does not count as acceptance of each technical proposal.
3. Required revisions update the owned proposal first; Robert alone changes canonical schema/client/route/migration registration. Retain superseded review evidence and review affected changes again.
4. An accepted contract proposal does not make the corresponding service implemented. Producers supply implementation/test evidence; consequential operations remain unavailable until authorized integration checks pass.
5. Phase 0 closes for a particular implementation slice only when its required interface rows have no unresolved revision/blocker and the applicable owners have recorded agreement. Stage 2 rows may remain explicitly deferred without blocking the earlier demo; do not silently defer a prerequisite of the slice being activated.

No acceptance, permission grant, configuration change, task-status update or external message was performed. Preparing this package completes the autonomous review work; producer/consumer agreement remains outstanding.
