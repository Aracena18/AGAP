import type { AgapClient } from '../../../packages/api-client/src';
import type { z } from 'zod';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { CommandReceiptSchema, DecisionCreateSchema, DecisionSchema, RecommendationCreateSchema } from '../../../packages/contracts/src/schemas';
import type { PreviewViewSchema } from '../../../apps/api/src/modules/decisions/backend-contracts';
import type { WorkspaceView, HistoryPage, SavedBrief } from '../../../apps/api/src/modules/decisions/staff-views';
export type { WorkspaceView, HistoryPage, SavedBrief };
export type Preview = z.output<typeof PreviewViewSchema>;
export type DecisionInput = z.input<typeof DecisionCreateSchema>;
export type WriteOptions = { version: number; csrfToken: string; idempotencyKey: string };
/** Local consumer port only. Robert supplies the canonical generated-client adapter.
 * No unregistered endpoint, backend persistence type, fixture or actor is sent.
 */
export interface StaffDecisionGateway {
  workspace(applicationId: string, signal: AbortSignal): Promise<WorkspaceView>;
  history(applicationId: string, cursor: string | undefined, signal: AbortSignal): Promise<HistoryPage>;
  brief(applicationId: string, decisionId: string, signal: AbortSignal): Promise<SavedBrief>;
  document(applicationId: string, decisionId: string, signal: AbortSignal): Promise<{ id: string; text: string; sha256: string }>;
  recommend(applicationId: string, body: z.input<typeof RecommendationCreateSchema>, options: WriteOptions): Promise<z.output<typeof CommandReceiptSchema>>;
  preview(applicationId: string, body: Omit<DecisionInput, 'explanationReviewed'>, options: WriteOptions): Promise<Preview>;
  record(applicationId: string, body: DecisionInput, previewId: string, options: WriteOptions): Promise<z.output<typeof DecisionSchema>>;
}
const unavailable = async (): Promise<never> => { throw new ApiClientError(501, 'module_not_available', 'The staff decision integration is unavailable. No decision was recorded.'); };
export const unavailableStaffDecisions: StaffDecisionGateway = { workspace: unavailable, history: unavailable, brief: unavailable, document: unavailable, recommend: unavailable, preview: unavailable, record: unavailable };
export const recordedInstant = (value: string) => new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' }).format(new Date(value)) + ' (Manila)';

/** Canonical client only; no browser-supplied participant or authority context. */
export function connectedStaffDecisions(client:AgapClient):StaffDecisionGateway {
  return {
    workspace:(id,signal)=>client.getStaffDecisionWorkspace(id,{signal}),
    history:(id,cursor,signal)=>client.listStaffDecisions(id,{cursor,limit:20,signal}),
    brief:(id,decision,signal)=>client.getStaffDecisionBrief(id,decision,{signal}),
    async document(id,decision,signal){
      const brief=await client.getStaffDecisionBrief(id,decision,{signal});
      if(!brief.document)throw new ApiClientError(404,'not_found','This decision has no saved terms.');
      const bytes=await (await client.downloadStaffDecisionDocument(id,decision,{signal})).arrayBuffer();
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
      if(digest!==brief.document.sha256)throw new ApiClientError(503,'document_integrity','The saved document checksum does not match.');
      return {id:brief.document.id,text:new TextDecoder('utf-8',{fatal:true}).decode(bytes),sha256:digest};
    },
    recommend:(id,body,options)=>client.recommendOffer(id,body,options),
    preview:(id,body,options)=>client.previewDecision(id,body,options),
    record:(id,decision,previewId,options)=>client.recordDecision(id,{previewId,decision},options),
  };
}
