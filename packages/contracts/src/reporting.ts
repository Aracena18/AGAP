import { z } from 'zod';
import { Id, PrincipalReconciliationInputSchema } from './schemas.js';
import type { TransactionContext } from './ports.js';

/** Internal read-port proposal; these cursors never leave the caller's reporting transaction. */
export const INVENTORY_PAGE_SIZE = 250;
export const INVENTORY_RECORD_LIMIT = 5000;
export const InventoryCursorSchema = z.strictObject({stage:z.enum(['posted','pending','legacy']),after:Id.nullable()});
export type InventoryCursor=z.output<typeof InventoryCursorSchema>;
export type InventoryScope=z.output<typeof PrincipalReconciliationInputSchema>['scope'];
const source=PrincipalReconciliationInputSchema.shape.servicing.options[1];
export const ServicingInventoryPageSchema=z.discriminatedUnion('state',[
 PrincipalReconciliationInputSchema.shape.servicing.options[0],
 source.omit({complete:true}).extend({events:source.shape.events.max(INVENTORY_PAGE_SIZE),allocations:source.shape.allocations.max(INVENTORY_PAGE_SIZE),receipts:source.shape.receipts.max(INVENTORY_PAGE_SIZE),nextCursor:InventoryCursorSchema.nullable()}),
]);
export interface PagedServicingInventoryPort {
 inventoryPage(tx:TransactionContext,scope:InventoryScope,cursor:InventoryCursor|null):Promise<z.input<typeof ServicingInventoryPageSchema>>;
}
