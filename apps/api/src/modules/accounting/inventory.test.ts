import {randomUUID} from 'node:crypto';
import {describe,expect,it,vi} from 'vitest';
import type {TransactionContext} from '../../../../../packages/contracts/src/ports.js';
import {servicingInventory} from './inventory.js';
import type {InventoryCursor,InventoryScope} from '../../../../../packages/contracts/src/reporting.js';
const scope:InventoryScope={organizationId:randomUUID(),fromDate:'2026-11-01',throughDate:'2026-11-03',cutoffAt:'2026-11-05T00:00:00.000Z',snapshotId:'fictional-test-snapshot'},tx={} as TransactionContext;
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function source(count:number){return{inventoryPage:vi.fn(async(_tx:TransactionContext,s:InventoryScope,c:InventoryCursor|null)=>{
 const start=c?.after?Number(c.after.slice(-12)):0,posted=(c?.stage??'posted')==='posted';
 const events=posted?Array.from({length:Math.min(250,count-start)},(_,i)=>({organizationId:s.organizationId,currency:'PHP' as const,id:id(start+i+1),loanId:id(999999),kind:'repayment' as const,effectiveDate:s.fromDate,recordedAt:s.cutoffAt,amountCentavos:1,state:'failed' as const,postingRuleVersionId:id(999998),receiptId:null,journalId:null})):[];
 return{state:'available' as const,snapshotId:s.snapshotId,events,allocations:[],receipts:[],nextCursor:posted?(start+events.length<count?{stage:'posted' as const,after:events.at(-1)!.id}:{stage:'pending' as const,after:null}):c!.stage==='pending'?{stage:'legacy' as const,after:null}:null};
 })};}
describe('bounded same-snapshot inventory collection',()=>{
 it('collects 1001 events and all source stages without changing the transaction or scope',async()=>{const producer=source(1001),result=await servicingInventory(tx,scope,producer);expect(result.state).toBe('available');if(result.state==='available'){expect(result.events).toHaveLength(1001);expect(result.complete).toBe(true);expect(new Set(result.events.map(e=>e.id)).size).toBe(1001);}expect(producer.inventoryPage).toHaveBeenCalledTimes(7);for(const call of producer.inventoryPage.mock.calls){expect(call[0]).toBe(tx);expect(call[1]).toBe(scope);}});
 it('returns unavailable above the collection budget without accepting a truncated report',async()=>{expect(await servicingInventory(tx,scope,source(5001))).toMatchObject({state:'unavailable',reason:expect.stringContaining('5000')});});
 it('rejects incomplete stages, changed snapshots and stationary/reversed cursors',async()=>{for(const body of [{snapshotId:scope.snapshotId,nextCursor:null},{snapshotId:'other',nextCursor:{stage:'pending',after:null}},{snapshotId:scope.snapshotId,nextCursor:{stage:'legacy',after:null}},{snapshotId:scope.snapshotId,nextCursor:{stage:'posted',after:null}}] as const){expect(await servicingInventory(tx,scope,{inventoryPage:async()=>({state:'available',events:[],allocations:[],receipts:[],...body})})).toMatchObject({state:'unavailable'});}});
 it('propagates a late page error without inventing a complete result',async()=>{const producer=source(1001);producer.inventoryPage.mockRejectedValueOnce(new Error('Fictional read failure'));await expect(servicingInventory(tx,scope,producer)).rejects.toThrow('Fictional read failure');});
 it('rejects malformed/private producer fields rather than stripping them',async()=>{await expect(servicingInventory(tx,scope,{inventoryPage:async()=>({...await source(0).inventoryPage(tx,scope,null),privateNote:'secret'})})).rejects.toThrow();});
});
