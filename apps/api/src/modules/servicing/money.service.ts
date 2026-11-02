import { randomUUID } from 'node:crypto';
import type { ActorContext, PostingPort, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { FinancialCommandCreateSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { command, recordEvent } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';
import { lockPostingPeriod } from '../accounting/accounting.service.js';
import type { ServicingBackendPorts } from './backend-contracts.js';
import { unavailableServicingPorts } from './backend-contracts.js';
import { ServicingRepository } from './servicing.repository.js';
import { binding, fingerprint } from './command-rules.js';
import { ObservationSchema, type OperationContext, type PendingOrigination } from './context.js';
import { MoneyRepository } from './money.repository.js';
import { type MoneyCommand, type PrincipalPolicy, type PostedResult } from './money-context.js';
import { financialPermission, inspectMoney, insist, moneyHash, observeMoney, originalAuthorizer, postedObservation, principalPolicy } from './money-rules.js';
import { servicingOperation } from './servicing.service.js';

/** Current financial guards for repayments must not reload household affordability. */
export interface MoneyPorts extends ServicingBackendPorts {
  policy(tx: TransactionContext, loanId: string): Promise<PrincipalPolicy>;
  financial(tx: TransactionContext, applicationId: string): Promise<Pick<OperationContext, 'authority' | 'originalAuthorizer'>>;
}
const unavailable = async (): Promise<never> => { throw new ApiError(501, 'module_not_available', 'Posting integration is unavailable. No posted success is recorded.'); };
export const unavailableMoneyPorts: MoneyPorts = { ...unavailableServicingPorts, policy: unavailable, financial: unavailable };
const unavailablePosting: PostingPort = { post: unavailable };

export class MoneyService {
  constructor(private readonly uow: UnitOfWork, private readonly ports: MoneyPorts = unavailableMoneyPorts,
    private readonly ledger: PostingPort = unavailablePosting, private readonly money = new MoneyRepository(),
    private readonly origins = new ServicingRepository(), private readonly now = () => new Date()) {}
  private async policy(tx: TransactionContext, loan: PendingOrigination, day: string) { return principalPolicy(await this.ports.policy(tx, loan.id), loan, day); }
  prepareRepayment(actor: ActorContext, loanId: string, input: unknown, key: unknown) {
    return servicingOperation(async () => {
      requireRoles(actor, ['cashier']); const id = Id.parse(loanId), data = FinancialCommandCreateSchema.parse(input);
      return this.uow.run(actor, async tx => {
        const loan = await this.origins.origin(tx, id); await this.ports.authorize(tx, loan.applicationId);
        return command(tx, `money.prepare-repayment:${id}`, key, { id, data }, async () => {
          const guard = await this.ports.financial(tx, loan.applicationId), policy = await this.policy(tx, loan, data.effectiveDate);
          await this.origins.lockApplication(tx, loan.applicationId); await this.money.lockLoan(tx, id);
          const events = await this.money.events(tx, id);
          insist(events.some(e => e.kind === 'disbursement'), 'loan_not_active', 'A posted release is required before a repayment intent.');
          const index = events.filter(e => e.kind === 'repayment').length, scheduled = loan.offer.payments[index];
          insist(scheduled && data.loanId === id && data.amountCentavos === scheduled.amountCentavos && data.effectiveDate === scheduled.date
            && data.method !== 'provider', 'unsupported_repayment', 'Only the exact next scheduled manual repayment is supported.');
          const at = this.now().toISOString();
          const c: MoneyCommand = { format: 'servicing-command-v2', id: randomUUID(), organizationId: loan.organizationId, branchId: loan.branchId,
            applicationId: loan.applicationId, loanId: id, kind: 'repayment', eventId: randomUUID(), providerKey: randomUUID(), payload: data,
            payloadHash: '', policy, preparedBy: actor.userId, createdAt: at, scheduleIndex: index, legacyVersion: null,
            version: 1, state: 'prepared', authorization: null, submission: null, observations: [], conflicts: [], posting: null, mode: 'simulation' };
          c.payloadHash = moneyHash(c); financialPermission(actor, guard.authority, loan, 'prepare', at, c);
          await this.money.create(tx, c); await recordEvent(tx, 'money.repayment_prepared', c.id, c.version); return inspectMoney(c);
        });
      });
    });
  }
  authorize(actor: ActorContext, id: string, version: number, key: unknown) { return this.transition(actor, id, version, key, 'authorize'); }
  submitIntent(actor: ActorContext, id: string, version: number, key: unknown) { return this.transition(actor, id, version, key, 'submit'); }
  observe(actor: ActorContext, id: string, input: unknown, version: number, key: unknown) { return this.transition(actor, id, version, key, 'observe', input); }
  private transition(actor: ActorContext, commandId: string, version: number, key: unknown, action: 'authorize' | 'submit' | 'observe', input?: unknown) {
    return servicingOperation(async () => {
      requireRoles(actor, action === 'authorize' ? ['financial_authorizer'] : ['cashier', 'financial_authorizer']);
      const id = Id.parse(commandId); Version.parse(version);
      return this.uow.run(actor, async tx => {
        const initial = await this.money.get(tx, id), loan = await this.origins.origin(tx, initial.loanId);
        await this.ports.authorize(tx, loan.applicationId);
        return command(tx, `money.${action}:${id}`, key, { id, version, input: input ?? null }, async () => {
          const guard = await this.ports.financial(tx, loan.applicationId);
          await this.origins.lockApplication(tx, loan.applicationId); await this.money.lockLoan(tx, loan.id);
          const c = await this.money.get(tx, id), at = this.now().toISOString();
          if (action === 'observe') {
            financialPermission(actor, guard.authority, loan, 'observe', at, c);
            const next = observeMoney(c, input, actor, at);
            if (next.version === c.version) return c;
            insist(version === c.version, 'stale_version', 'Reload the current command before a new observation.');
            const observation = next.observations.at(-1)!.input;
            if (observation.movementId && await this.money.claimMovement(tx, c, observation.producer, observation.movementId)) {
              next.conflicts = [...new Set([...next.conflicts, 'movement_conflict'])]; next.state = c.state;
            }
            await this.money.append(tx, next); await recordEvent(tx, 'money.observation_recorded', id, next.version); return next;
          }
          insist(version === c.version, 'stale_version', 'Reload the current command version.');
          const policy = await this.policy(tx, loan, c.payload.effectiveDate);
          insist(fingerprint(policy) === fingerprint(c.policy), 'posting_policy_changed', 'The command component policy changed.');
          const authority = financialPermission(actor, guard.authority, loan, action, at, c), next = structuredClone(c);
          if (action === 'authorize') {
            insist(c.state === 'prepared', 'workflow_state', 'Only a prepared repayment can be authorized.');
            next.authorization = { userId: actor.userId, at, authenticatedAt: actor.authenticatedAt.toISOString(), policyVersionId: authority.versionId, payloadHash: c.payloadHash }; next.state = 'authorized';
          } else {
            insist(c.state === 'authorized', 'workflow_state', 'Only an authorized command can produce one submission intent.');
            originalAuthorizer(c, guard, at);
            next.submission = { id: randomUUID(), submittedBy: actor.userId, at, payloadHash: c.payloadHash, claimVersion: c.version + 1 }; next.state = 'submitted';
          }
          next.version++; await this.money.append(tx, next); await recordEvent(tx, `money.${action}_recorded`, id, next.version); return inspectMoney(next);
        });
      });
    });
  }
  finalize(actor: ActorContext, commandId: string, version: number, key: unknown) {
    return servicingOperation(async () => {
      requireRoles(actor, ['financial_authorizer']); const id = Id.parse(commandId); Version.parse(version);
      return this.uow.run(actor, async tx => {
        const existing = await this.money.find(tx, id), legacy = existing ? null : await this.origins.command(tx, id);
        const loan = await this.origins.origin(tx, existing?.loanId ?? legacy!.loanId);
        await this.ports.authorize(tx, loan.applicationId);
        return command(tx, `money.finalize:${id}`, key, { id, version }, async () => {
          // Permanent business identity resolves retries even with a fresh HTTP key.
          const prior = await this.money.result(tx, id); if (prior) return prior;
          const date = existing?.payload.effectiveDate ?? legacy!.payload.effectiveDate;
          const release = (existing?.kind ?? 'disbursement') === 'disbursement';
          const operation = release ? await this.ports.operation(tx, loan.applicationId) : null;
          const guard = operation ?? await this.ports.financial(tx, loan.applicationId), policy = await this.policy(tx, loan, date);
          await lockPostingPeriod(tx, date);
          await this.origins.lockApplication(tx, loan.applicationId); await this.money.lockLoan(tx, loan.id);
          const raced = await this.money.result(tx, id); if (raced) return raced;
          let c = await this.money.find(tx, id);
          if (!c) {
            const source = await this.origins.command(tx, id);
            insist(source.version === version, 'stale_version', 'Reload the exact current release version.');
            insist(source.componentRuleVersionId === policy.versionId && operation, 'posting_policy_changed', 'Release component mapping changed.');
            binding(loan, operation, this.now().toISOString());
            c = { format: 'servicing-command-v2', id, organizationId: loan.organizationId, branchId: loan.branchId, applicationId: loan.applicationId,
              loanId: loan.id, kind: 'disbursement', eventId: source.businessEventId, providerKey: source.providerKey, payload: source.payload,
              payloadHash: '', policy, preparedBy: source.preparedBy, createdAt: source.createdAt, scheduleIndex: null, legacyVersion: source.version,
              version: 1, state: source.state, authorization: source.authorization ? { ...source.authorization } : null,
              submission: source.submission ? { ...source.submission } : null, observations: ObservationSchema.array().parse(source.observations), conflicts: [...source.conflicts], posting: null, mode: 'simulation' };
            c.payloadHash = moneyHash(c);
            if (c.authorization) c.authorization.payloadHash = c.payloadHash;
            if (c.submission) c.submission.payloadHash = c.payloadHash;
            postedObservation(c, this.now().toISOString()); await this.money.create(tx, c);
          } else insist(c.version === version, 'stale_version', 'Reload the current command version.');
          const at = this.now().toISOString(); postedObservation(c, at);
          financialPermission(actor, guard.authority, loan, 'authorize', at, c);
          insist(fingerprint(policy) === fingerprint(c.policy), 'posting_policy_changed', 'Posting policy changed.');
          const events = await this.money.events(tx, loan.id);
          const evidence = postedObservation(c, at);
          insist(!await this.money.claimMovement(tx, c, evidence.producer, evidence.movementId!), 'movement_conflict', 'This movement belongs to a different command. Preserve it for review.');
          const before = events.reduce((n, e) => n + (e.kind === 'disbursement' ? BigInt(e.amountCentavos) : -BigInt(e.amountCentavos)), 0n);
          const after = before + (c.kind === 'disbursement' ? BigInt(c.payload.amountCentavos) : -BigInt(c.payload.amountCentavos));
          insist(after >= 0n && after <= BigInt(Number.MAX_SAFE_INTEGER), 'principal_limit', 'The posted principal would be invalid.');
          if (c.kind === 'disbursement') insist(events.length === 0, 'first_release_conflict', 'The loan already has a posted release.');
          else insist(events.some(e => e.kind === 'disbursement') && c.scheduleIndex === events.filter(e => e.kind === 'repayment').length,
            'schedule_changed', 'The repayment no longer matches the next unpaid schedule entry.');
          const postingRuleVersionId = c.kind === 'disbursement' ? policy.releaseRuleId : policy.repaymentRuleId;
          const result = await this.ledger.post(tx, { sourceEventId: c.eventId, postingKind: c.kind, postingRuleVersionId,
            effectiveDate: date, currency: 'PHP', reversalOfJournalId: null, lines: [
              { accountId: policy.principalAccountId, side: c.kind === 'disbursement' ? 'debit' : 'credit', amountCentavos: c.payload.amountCentavos },
              { accountId: policy.cashAccountId, side: c.kind === 'disbursement' ? 'credit' : 'debit', amountCentavos: c.payload.amountCentavos }] });
          const posted: PostedResult = { eventId: c.eventId, commandId: c.id, loanId: c.loanId, kind: c.kind, amountCentavos: c.payload.amountCentavos,
            currency: 'PHP', effectiveDate: date, postedAt: result.postedAt, journalId: result.journalId, receiptId: c.kind === 'repayment' ? randomUUID() : null,
            principalAfterCentavos: Number(after), postingRuleVersionId };
          const next: MoneyCommand = { ...c, version: c.version + 1, state: 'confirmed', posting: posted };
          await this.money.append(tx, next); await this.money.insertPosted(tx, next, posted);
          await recordEvent(tx, 'money.posted', id, next.version); return posted;
        });
      });
    });
  }
}
