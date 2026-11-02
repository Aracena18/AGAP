import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { ApiError } from '../../platform/errors.js';
import type { FinancialAuthority, OperationContext } from './context.js';

/** Consumer proposals. Producers must establish current scope and guard every
 * material writer through commit. These are never deserialized from HTTP JSON. */
export interface ServicingBackendPorts {
  authorize(tx: TransactionContext, applicationId: string): Promise<void>;
  operation(tx: TransactionContext, applicationId: string): Promise<OperationContext>;
  observationAuthority(tx: TransactionContext, applicationId: string): Promise<FinancialAuthority>;
}
const unavailable = async (): Promise<never> => { throw new ApiError(501, 'module_not_available', 'Servicing producer integration is unavailable. No movement was initiated.'); };
export const unavailableServicingPorts: ServicingBackendPorts = { authorize: unavailable, operation: unavailable, observationAuthority: unavailable };
