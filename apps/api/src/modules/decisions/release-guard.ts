import { randomUUID } from 'node:crypto';
import type { ReleaseAuthorizationPort, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { Id } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import { unavailableServicingPorts, type ServicingBackendPorts } from '../servicing/backend-contracts.js';
import { ServicingRepository } from '../servicing/servicing.repository.js';
import { prepareSubmission } from '../servicing/command-rules.js';
import { servicingOperation } from '../servicing/servicing.service.js';

/** Pre-dispatch canonical port adapter. It validates stored identities/current
 * guards in the CALLER transaction; no new submission, transfer or coordinator.
 * The caller must retain its reviewed lock order and separately persist intent. */
export class StoredReleaseGuard implements ReleaseAuthorizationPort {
  constructor(private readonly ports: ServicingBackendPorts = unavailableServicingPorts,
    private readonly repository = new ServicingRepository(), private readonly now = () => new Date()) {}
  authorizeRelease(tx: TransactionContext, loanId: string, commandId: string): Promise<void> {
    return servicingOperation(async () => {
      const loan = await this.repository.origin(tx, Id.parse(loanId));
      await this.ports.authorize(tx, loan.applicationId);
      const current = await this.ports.operation(tx, loan.applicationId);
      await this.repository.lockApplication(tx, loan.applicationId);
      const c = await this.repository.command(tx, Id.parse(commandId));
      if (c.loanId !== loan.id) throw new ApiError(409, 'release_binding', 'The command does not belong to this stored loan.');
      // Discarded pure candidate: validates every existing pre-submission guard.
      // Does not persist or claim that another submission is authorized later.
      prepareSubmission(tx.actor, current, c, { id: c.id, expectedVersion: c.version, at: this.now().toISOString(), attemptId: randomUUID() });
    });
  }
}
