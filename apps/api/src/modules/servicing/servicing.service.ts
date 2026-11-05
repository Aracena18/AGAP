import { actionReasonRequest, recordActionNote } from './action-note.js';
import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { FinancialCommandCreateSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { command, recordEvent } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';
import { unavailableServicingPorts, type ServicingBackendPorts } from './backend-contracts.js';
import { ObservationInputSchema, OperationContextSchema } from './context.js';
import { authorizeCommand, inspectCommand, preparePendingOrigination, prepareReleaseCommand, prepareSubmission, recordObservation, recoveryAdvice, ServicingRuleError } from './command-rules.js';
import { ServicingRepository } from './servicing.repository.js';

export async function servicingOperation<T>(work: () => Promise<T>) {
  try { return await work(); } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof ZodError) throw new ApiError(422, 'invalid_servicing_input', 'Check the servicing fields and current references.',
      error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })));
    if (error instanceof ServicingRuleError) {
      const denied = ['actor_scope', 'role_required', 'action_forbidden', 'self_authorization', 'fresh_mfa_required'];
      throw new ApiError(error.code === 'stale_version' ? 412 : denied.includes(error.code) ? 403 : 409, error.code, error.message);
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === '42501') throw new ApiError(403, 'servicing_forbidden', 'This servicing action is unavailable to the current account.');
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new ApiError(409, 'servicing_identity_conflict', 'This origination, first release or evidence identity already exists. Inspect the saved command.');
    const failure = new ApiError(503, 'servicing_unavailable', 'The servicing operation could not be confirmed. Retry the identical submission or inspect its recorded status.');
    Object.defineProperty(failure, 'cause', { value: error });
    throw failure;
  }
}
const operation = servicingOperation;
/** Simulation-only persistence candidate. No provider call, posting or route registration. */
export class ServicingService {
  constructor(private readonly uow: UnitOfWork, private readonly ports: ServicingBackendPorts = unavailableServicingPorts,
    private readonly repository = new ServicingRepository(), private readonly now = () => new Date()) {}
  originate(actor: ActorContext, applicationId: string, input: unknown, key: unknown) {
    return operation(async () => {
      requireRoles(actor, ['cashier']); const app = Id.parse(applicationId), data = z.strictObject({ method: z.enum(['cash', 'bank']) }).parse(input);
      return this.uow.run(actor, async tx => {
        await this.ports.authorize(tx, app);
        return command(tx, `servicing.originate:${app}`, key, { app, data }, async () => {
          const context = OperationContextSchema.parse(await this.ports.operation(tx, app));
          if (context.basis.current.application.id !== app) throw notFound();
          await this.repository.lockApplication(tx, app);
          const existing = await this.repository.originForApplication(tx, app);
          const candidate = preparePendingOrigination(actor, context, { id: randomUUID(), at: this.now().toISOString(), method: data.method, existingOriginationId: existing?.id ?? null });
          // This service can prepare only simulations, even before command creation.
          if (context.execution.status !== 'configured' || context.execution.mode !== 'simulation') throw new ApiError(501, 'actual_execution_unavailable', 'Only the fictional simulation foundation is available.');
          await this.repository.insertOrigin(tx, candidate);
          await recordEvent(tx, 'servicing.origination_prepared', candidate.id, 1);
          return candidate;
        });
      });
    });
  }
  prepare(actor: ActorContext, loanId: string, input: unknown, key: unknown) {
    return operation(async () => {
      requireRoles(actor, ['cashier']); const id = Id.parse(loanId), data = FinancialCommandCreateSchema.parse(input);
      return this.uow.run(actor, async tx => {
        const origin = await this.repository.origin(tx, id);
        await this.ports.authorize(tx, origin.applicationId);
        return command(tx, `servicing.prepare:${id}`, key, { id, data }, async () => {
          const context = await this.ports.operation(tx, origin.applicationId);
          await this.repository.lockApplication(tx, origin.applicationId);
          const candidate = prepareReleaseCommand(actor, context, origin, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: this.now().toISOString(),
            releaseClaim: await this.repository.hasClaim(tx, id) ? 'reserved' : 'none', request: data });
          await this.repository.claim(tx, candidate); await this.repository.append(tx, candidate);
          await recordEvent(tx, 'servicing.release_prepared', candidate.id, candidate.version);
          return candidate;
        });
      });
    });
  }
  authorize(actor: ActorContext, commandId: string, version: number, key: unknown, reason?:string) { return this.transition(actor, commandId, version, key, 'authorize',reason); }
  submitIntent(actor: ActorContext, commandId: string, version: number, key: unknown, reason?:string) { return this.transition(actor, commandId, version, key, 'submit',reason); }
  private transition(actor: ActorContext, commandId: string, version: number, key: unknown, action: 'authorize' | 'submit',reason?:string) {
    return operation(async () => {
      requireRoles(actor, action === 'authorize' ? ['financial_authorizer'] : ['cashier', 'financial_authorizer']);
      const id = Id.parse(commandId); Version.parse(version);
      return this.uow.run(actor, async tx => {
        const initial = await this.repository.command(tx, id);
        await this.ports.authorize(tx, initial.applicationId);
        return command(tx, `servicing.${action}:${id}`, key, { id, version,...actionReasonRequest(reason) }, async () => {
          const context = await this.ports.operation(tx, initial.applicationId);
          await this.repository.lockApplication(tx, initial.applicationId);
          const current = await this.repository.command(tx, id), request = { id, expectedVersion: version, at: this.now().toISOString() };
          const next = action === 'authorize' ? authorizeCommand(actor, context, current, request)
            : prepareSubmission(actor, context, current, { ...request, attemptId: randomUUID() });
          await this.repository.append(tx, next);
          await recordActionNote(tx,next,'release-v1',action,reason);
          await recordEvent(tx, `servicing.${action}_recorded`, id, next.version);
          return next;
        });
      });
    });
  }
  observe(actor: ActorContext, commandId: string, input: unknown, version: number, key: unknown,reason?:string) {
    return operation(async () => {
      requireRoles(actor, ['cashier', 'financial_authorizer']); const id = Id.parse(commandId), data = ObservationInputSchema.parse(input); Version.parse(version);
      return this.uow.run(actor, async tx => {
        const initial = await this.repository.command(tx, id);
        await this.ports.authorize(tx, initial.applicationId);
        return command(tx, `servicing.observe:${id}`, key, { id, data, version,...actionReasonRequest(reason) }, async () => {
          if((await tx.query('SELECT id FROM servicing.staff_money_commands WHERE organization_id=$1 AND id=$2',[actor.organizationId,id])).rowCount)throw new ApiError(409,'legacy_adopted','Use the current posted command and the separate correction workflow.');
          // Known movement intake intentionally does not reload release/source prerequisites.
          const authority = await this.ports.observationAuthority(tx, initial.applicationId);
          await this.repository.lockApplication(tx, initial.applicationId);
          const current = await this.repository.command(tx, id);
          let result = recordObservation(actor, { authority }, current, { id, expectedVersion: version, at: this.now().toISOString(), observation: data, action: 'observe' });
          if (result.disposition === 'duplicate') return result;
          if (data.movementId !== null) {
            const conflict = await this.repository.movementConflict(tx, current, data.producer, data.movementId);
            if (conflict) result = recordObservation(actor, { authority }, current, { id, expectedVersion: version, at: this.now().toISOString(), observation: data, action: 'observe', movementClaimedElsewhere: true });
          }
          await this.repository.append(tx, result.command); await this.repository.insertObservation(tx, result.command);
          await recordActionNote(tx,result.command,'release-v1','observe',reason);
          await recordEvent(tx, 'servicing.observation_recorded', id, result.command.version);
          return result;
        });
      });
    });
  }
  read(actor: ActorContext, commandId: string) {
    return operation(async () => {
      requireRoles(actor, ['cashier', 'financial_authorizer', 'auditor']); const id = Id.parse(commandId);
      return this.uow.run(actor, async tx => {
        const current = await this.repository.command(tx, id); await this.ports.authorize(tx, current.applicationId);
        return { command: inspectCommand(current), recovery: recoveryAdvice(current) };
      });
    });
  }
}
