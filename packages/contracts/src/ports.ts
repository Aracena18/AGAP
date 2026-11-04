import type { z } from 'zod';
import type { AssessmentCreateSchema, AssessmentSchema, FinancialCommandSchema, LoanPositionSchema, PostingRequestSchema, JournalReceiptSchema, StaffRole } from './schemas.js';
import type { schemas } from './schemas.js';

/** Constructed by the identity boundary, never deserialized from a browser request. */
export interface ActorContext {
  readonly userId: string; readonly organizationId: string; readonly branchIds: readonly string[];
  readonly roles: readonly StaffRole[]; readonly sessionId: string; readonly authenticatedAt: Date;
  readonly authenticationMethods: readonly string[]; readonly correlationId: string;
}
export interface QueryResult<Row> { rows: Row[]; rowCount: number | null }
/** Only the transaction coordinator owns BEGIN/COMMIT/ROLLBACK and connection release. */
export interface TransactionContext {
  readonly actor: ActorContext;
  query<Row extends Record<string, unknown> = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
}
export interface UnitOfWork { run<T>(actor: ActorContext, work: (tx: TransactionContext) => Promise<T>): Promise<T> }
export interface MemberActorContext {
  readonly kind:'member'; readonly linkId:string; readonly memberId:string; readonly organizationId:string;
  readonly sessionId:string; readonly correlationId:string;
}
export interface MemberTransactionContext {
  readonly actor:MemberActorContext;
  query<Row extends Record<string,unknown> = Record<string,unknown>>(sql:string,values?:readonly unknown[]):Promise<QueryResult<Row>>;
}
export interface MemberUnitOfWork { run<T>(actor:MemberActorContext,work:(tx:MemberTransactionContext)=>Promise<T>):Promise<T> }
type Output<K extends keyof typeof schemas> = z.output<(typeof schemas)[K]>;
export interface MemberDomainPorts {
  evidence(tx:MemberTransactionContext,applicationId:string):Promise<Output<'MemberEvidenceView'>>;
  upload(tx:MemberTransactionContext,applicationId:string,metadata:Output<'MemberUpload'>&{sha256:string},stream:AsyncIterable<Uint8Array>,key:string):Promise<Output<'MemberSource'>>;
  download(tx:MemberTransactionContext,applicationId:string,sourceId:string):Promise<{metadata:Output<'MemberUpload'>;stream:AsyncIterable<Uint8Array>}>;
  confirm(tx:MemberTransactionContext,applicationId:string,input:Output<'DraftConfirmation'>,version:number,key:string):Promise<Output<'CommandReceipt'>>;
  options(tx:MemberTransactionContext,applicationId:string):Promise<Output<'MemberOptionsView'>>;
  decision(tx:MemberTransactionContext,applicationId:string):Promise<Output<'MemberDecisionView'>>;
  accept(tx:MemberTransactionContext,applicationId:string,input:Output<'MemberAcceptance'>,version:number,key:string):Promise<Output<'CommandReceipt'>>;
  loans(tx:MemberTransactionContext):Promise<Output<'MemberLoansView'>>;
  support(tx:MemberTransactionContext):Promise<Output<'MemberSupportView'>>;
  supportPage?(tx:MemberTransactionContext,query:Output<'MemberSupportHistoryQuery'>):Promise<Output<'MemberSupportPageView'>>;
  requestSupport(tx:MemberTransactionContext,input:Output<'MemberSupportCreate'>,key:string):Promise<Output<'MemberSupport'>>;
}
export interface AssessmentPort { assess(tx: TransactionContext, applicationId: string, request: z.input<typeof AssessmentCreateSchema>): Promise<z.output<typeof AssessmentSchema>> }
export interface ReleaseAuthorizationPort { authorizeRelease(tx: TransactionContext, loanId: string, commandId: string): Promise<void> }
export interface PostingPort { post(tx: TransactionContext, request: z.input<typeof PostingRequestSchema>): Promise<z.output<typeof JournalReceiptSchema>> }
export interface LoanPositionPort { getPosition(tx: TransactionContext, loanId: string, asOfDate: string): Promise<z.output<typeof LoanPositionSchema>> }
export type ProviderOutcome = { state: 'confirmed'; providerReference: string } | { state: 'failed'; code: string } | { state: 'unknown'; providerReference: string | null };
export interface PaymentProviderPort {
  submit(command: z.output<typeof FinancialCommandSchema>, idempotencyKey: string): Promise<ProviderOutcome>;
  getStatus(providerReference: string): Promise<ProviderOutcome>;
}
export interface DocumentStorePort {
  putQuarantined(stream: AsyncIterable<Uint8Array>, maxBytes: number, reservedKey?: string): Promise<{ key: string; sha256: string; size: number }>;
  read(key: string): Promise<AsyncIterable<Uint8Array>>;
  remove(key: string): Promise<void>;
}
