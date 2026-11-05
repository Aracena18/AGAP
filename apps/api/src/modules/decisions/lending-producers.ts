import { z } from 'zod';
import type { MemberTransactionContext, TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { Id, Role } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { applicationView } from '../applications/applications.service.js';
import { WorkflowDecisionProducer } from '../evidence/decision-basis.producer.js';
import { MemberGuardSchema, type DecisionBackendPorts } from './backend-contracts.js';
import { LendingConfigurationSchema } from './lending-configuration.js';
import { ReviewContextSchema } from './context.js';
import { loadReviewReadiness } from './review-readiness.js';

export const ParticipantSchema=z.strictObject({userId:Id,active:z.boolean(),organizationId:Id,branchIds:z.array(Id),roles:z.array(Role)});
/** Authoritative owner adapters. No test context tables and no browser authority. */
export class LendingDecisionProducers implements DecisionBackendPorts {
  constructor(private readonly credit:WorkflowDecisionProducer,private readonly fictionalEnabled:boolean) {}
  async authorizeStaff(tx:TransactionContext,app:string) {
    requireLendingTransaction(tx);Id.parse(app);
    if(!this.fictionalEnabled)throw new ApiError(501,'module_not_available','Connected fictional lending is not enabled.');
    if(!tx.actor.roles.some(r=>['officer','reviewer','auditor'].includes(r)))throw notFound();
    const result=await tx.query('SELECT branch_id FROM applications.applications WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,app]);
    if(!result.rows[0]||!tx.actor.branchIds.includes(String(result.rows[0].branch_id)))throw notFound();
  }
  async loadStaffBasis(tx:TransactionContext,app:string) {
    await this.authorizeStaff(tx,app);
    const evidence=await this.credit.load(tx,app);
    const row=(await tx.query(`SELECT a.*,m.full_name AS member_name FROM applications.applications a JOIN members.members m
      ON m.organization_id=a.organization_id AND m.id=a.member_id WHERE a.organization_id=$1 AND a.id=$2`,[tx.actor.organizationId,app])).rows[0];
    if(!row)throw notFound();
    const application=applicationView(row),products=[...new Set(evidence.offers.map(o=>o.productVersionId))];
    if(products.length!==1)throw new ApiError(409,'product_configuration_required','The first connected journey requires one explicitly configured fictional product.');
    const configuration=await this.configuration(tx,application.branchId,products[0]);
    if(evidence.workflowBasis.policy.offers.some(o=>o.feesPaidSeparatelyCentavos!==0 || o.separateFees.length
      || o.netReceivedCentavos!==o.principalCentavos
      || o.payments.reduce((sum,p)=>sum+BigInt(p.amountCentavos),0n)!==BigInt(o.principalCentavos)))
      throw new ApiError(409,'first_product_unsupported','The configured fictional journey supports principal-only terms with explicit zero fees. Other products require their reviewed component implementation.');
    const grants=configuration.authority.status==='configured'?configuration.authority.grants:[];
    const participants=await this.participants(tx,app,[...new Set([...(application.assignedOfficerId?[application.assignedOfficerId]:[]),...grants.map(g=>g.userId)])]);
    const inScope=(userId:string,role:string)=>participants.some(p=>p.userId===userId&&p.active&&p.organizationId===application.organizationId&&p.branchIds.includes(application.branchId)&&p.roles.includes(role as z.output<typeof Role>));
    const authority=configuration.authority;
    const declarations=(await tx.query(`SELECT DISTINCT ON(user_id) user_id,status,reference FROM decisions.conflict_declarations
      WHERE organization_id=$1 AND application_id=$2 AND (input_version=$3 OR status='restricted') ORDER BY user_id,(status='restricted') DESC,recorded_at DESC,id DESC`,[tx.actor.organizationId,app,application.assessmentInputVersion])).rows;
    const conflicts=participants.map(p=>{
      const d=declarations.find(d=>d.user_id===p.userId);
      return {userId:p.userId,status:inScope(p.userId,p.userId===application.assignedOfficerId?'officer':'reviewer')&&d ? d.status : 'unavailable',reference:d?.reference??'No current conflict declaration is recorded.'};
    });
    if(application.assignedOfficerId&&!inScope(application.assignedOfficerId,'officer')) {
      const declaration=conflicts.find(c=>c.userId===application.assignedOfficerId);
      if(declaration)declaration.status='unavailable';
    }
    const context=ReviewContextSchema.parse({application,...evidence,authority,conflicts,recommendation:null,
      integration:{format:'connected-review/v2',configurationId:configuration.id,sourceReview:configuration.sourceReview}});
    context.reviewReadiness=(await loadReviewReadiness(tx,context,participants)).proof;
    const {recommendation:_recommendation,...basis}=context;void _recommendation;return basis;
  }
  async citation(tx:TransactionContext,app:string,input:unknown) {await this.authorizeStaff(tx,app);return this.credit.citation(tx,app,input);}
  async sourceMetadata(tx:TransactionContext,app:string) {await this.authorizeStaff(tx,app);return this.credit.sourceMetadata(tx,app);}
  async candidateNames(tx:TransactionContext,app:string,userIds:string[]) {
    await this.authorizeStaff(tx,app);
    return z.array(z.strictObject({userId:Id,displayName:z.string().trim().min(1).max(2000)})).parse(
      (await tx.query('SELECT decisions.review_candidate_names($1,$2) AS data',[app,userIds])).rows[0]?.data);
  }
  async configuration(tx:TransactionContext,branchId:string,productVersionId:string) {
    requireLendingTransaction(tx);
    const row=(await tx.query(`SELECT body FROM decisions.lending_configurations WHERE organization_id=$1 AND branch_id=$2
      AND product_version_id=$3 ORDER BY published_at DESC,id DESC LIMIT 1`,[tx.actor.organizationId,branchId,productVersionId])).rows[0];
    if(!row||!this.fictionalEnabled)throw new ApiError(409,'lending_configuration_unavailable','An explicitly reviewed fictional first-product configuration is required.');
    const c=LendingConfigurationSchema.parse(row.body);
    if(c.organizationId!==tx.actor.organizationId||c.branchId!==branchId||c.productVersionId!==productVersionId)throw notFound();
    return c;
  }
  async participants(tx:TransactionContext,app:string,userIds:string[]) {
    requireLendingTransaction(tx);
    return z.array(ParticipantSchema).parse((await tx.query('SELECT decisions.current_participants($1,$2) AS data',[app,userIds])).rows[0]?.data);
  }
  async transitionStaff(tx:TransactionContext,app:string,expected:number,action:'recommend'|'approve'|'decline'|'return') {
    await this.authorizeStaff(tx,app);
    return Number((await tx.query('SELECT decisions.advance_application($1,$2,$3) AS version',[app,expected,action])).rows[0].version);
  }
  async authorizeMember(tx:MemberTransactionContext,app:string) {
    requireLendingTransaction(tx);Id.parse(app);
    if(!this.fictionalEnabled)throw new ApiError(501,'module_not_available','Connected fictional lending is not enabled.');
    const row=(await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND member_id=$2 AND id=$3',[tx.actor.organizationId,tx.actor.memberId,app])).rows[0];
    if(!row)throw notFound();
  }
  async loadMemberGuard(tx:MemberTransactionContext,app:string) {
    await this.authorizeMember(tx,app);
    const raw=(await tx.query('SELECT decisions.member_basis_guard($1) AS data',[app])).rows[0]?.data;
    if(!raw)throw new ApiError(409,'renewed_review_required','The current terms require renewed staff review.');
    return MemberGuardSchema.parse(raw);
  }
  async transitionMember(tx:MemberTransactionContext,app:string,expected:number) {
    await this.authorizeMember(tx,app);
    return Number((await tx.query("SELECT decisions.advance_application($1,$2,'accept') AS version",[app,expected])).rows[0].version);
  }
}
