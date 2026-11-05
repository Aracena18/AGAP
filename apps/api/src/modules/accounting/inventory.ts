import { ServicingInventoryPageSchema,INVENTORY_RECORD_LIMIT,type InventoryCursor,type PagedServicingInventoryPort } from '../../../../../packages/contracts/src/reporting.js';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import type { ReconciliationInput,ReportingScope } from './ledger-reader.js';

/** Fully consumes bounded producer pages in the already-established snapshot, never across HTTP calls. */
export async function servicingInventory(tx:TransactionContext,scope:ReportingScope,producer:PagedServicingInventoryPort):Promise<ReconciliationInput['servicing']>{
 const result:Extract<ReconciliationInput['servicing'],{state:'available'}>={state:'available',snapshotId:scope.snapshotId,complete:true,events:[],allocations:[],receipts:[]};
 let cursor:InventoryCursor|null=null;const visited=new Set<string>();
 for(let pageNumber=0;pageNumber<100;pageNumber++){
  const page=ServicingInventoryPageSchema.parse(await producer.inventoryPage(tx,scope,cursor));
  if(page.state==='unavailable')return page;
  if(page.snapshotId!==scope.snapshotId)return{state:'unavailable',reason:'Servicing inventory pages do not share the reporting snapshot.'};
  for(const name of ['events','allocations','receipts'] as const){if(result[name].length+page[name].length>INVENTORY_RECORD_LIMIT)return{state:'unavailable',reason:'Servicing inventory exceeds the 5000-record budget. Choose a smaller date range.'};}
  result.events.push(...page.events);result.allocations.push(...page.allocations);result.receipts.push(...page.receipts);
  const stages=['posted','pending','legacy'],stage=stages.indexOf(cursor?.stage??'posted');
  if(page.nextCursor===null)return stage===2?result:{state:'unavailable',reason:'Servicing inventory ended before all source stages were read.'};
  const nextStage=stages.indexOf(page.nextCursor.stage);
  if(nextStage<stage||nextStage>stage+1||(nextStage===stage&&(!page.nextCursor.after||(cursor?.after&&page.nextCursor.after<=cursor.after)))||(nextStage===stage+1&&page.nextCursor.after!==null))return{state:'unavailable',reason:'Servicing inventory cursor did not advance through its source stages.'};
  const key=JSON.stringify(page.nextCursor);if(visited.has(key))return{state:'unavailable',reason:'Servicing inventory paging did not advance.'};visited.add(key);cursor=page.nextCursor;
 }
 return{state:'unavailable',reason:'Servicing inventory exceeded the bounded page budget.'};
}
