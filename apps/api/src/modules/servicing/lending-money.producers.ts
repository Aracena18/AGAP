import { z } from 'zod';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { DecisionCandidateSchema, DocumentSchema } from '../decisions/context.js';
import { LendingDecisionProducers } from '../decisions/lending-producers.js';
import { AcceptanceBindingSchema, OperationContextSchema } from './context.js';
import type { MoneyPorts } from './money.service.js';
import { ServicingRepository } from './servicing.repository.js';

const ReleasePacket=z.strictObject({saved:DecisionCandidateSchema,applicationVersion:Version,applicationStatus:ApplicationSchema.shape.status,
  currentDecisionId:Id,publishedDocument:DocumentSchema,acceptance:AcceptanceBindingSchema});
/** Financial guards read authoritative history/configuration, never request JSON.
 * Repayment guards intentionally do not reload household assessment evidence.
 */
export class LendingMoneyProducers implements MoneyPorts {
  constructor(private readonly decisions:LendingDecisionProducers,private readonly fictionalEnabled:boolean,private readonly origins=new ServicingRepository()) {}
  async authorize(tx:TransactionContext,applicationId:string) {
    requireLendingTransaction(tx);Id.parse(applicationId);
    if(!this.fictionalEnabled)throw new ApiError(501,'module_not_available','Connected fictional money operations are not enabled.');
    if(!tx.actor.roles.some(r=>['cashier','financial_authorizer','auditor'].includes(r)))throw notFound();
    const row=(await tx.query('SELECT branch_id FROM applications.applications WHERE organization_id=$1 AND id=$2',[tx.actor.organizationId,applicationId])).rows[0];
    if(!row||!tx.actor.branchIds.includes(String(row.branch_id)))throw notFound();
  }
  async operation(tx:TransactionContext,applicationId:string) {
    await this.authorize(tx,applicationId);
    const raw=(await tx.query('SELECT decisions.staff_release_basis($1) AS data',[applicationId])).rows[0]?.data;
    if(!raw)throw new ApiError(409,'renewed_review_required','Current approved terms, participant clearance and linked-member acceptance are required.');
    const packet=ReleasePacket.parse(raw),saved=packet.saved,original=saved.snapshot.basis;
    const selected=original.offers.find(o=>o.id===saved.snapshot.input.offerVersionId);
    if(!selected)throw new ApiError(409,'approved_offer_unavailable','The saved approval has no exact offer.');
    const config=await this.decisions.configuration(tx,original.application.branchId,selected.productVersionId);
    const financial=await this.financialConfiguration(tx,applicationId,config);
    // SQL proved every material binding current under the organization fence.
    // Preserve the complete immutable basis; only workflow version/status differ.
    const current={...original,application:{...original.application,version:packet.applicationVersion,status:packet.applicationStatus}};
    return OperationContextSchema.parse({basis:{saved,current,currentDecisionId:packet.currentDecisionId,publishedDocument:packet.publishedDocument,acceptance:packet.acceptance},
      ...financial,execution:config.execution});
  }
  private async financialConfiguration(tx:TransactionContext,app:string,config:Awaited<ReturnType<LendingDecisionProducers['configuration']>>) {
    const authority=config.financialAuthority;
    const userId=authority.status==='configured'?authority.grants.find(g=>g.actions.includes('authorize'))?.userId:undefined;
    const participant=userId?(await this.decisions.participants(tx,app,[userId]))[0]:undefined;
    return {authority,originalAuthorizer:participant?{status:'current' as const,userId:participant.userId,active:participant.active,
      organizationId:participant.organizationId,branchIds:participant.branchIds,roles:participant.roles}:{status:'unavailable' as const}};
  }
  async financial(tx:TransactionContext,applicationId:string) {
    await this.authorize(tx,applicationId);
    const loan=await this.origins.originForApplication(tx,applicationId);
    if(!loan)throw notFound();
    return this.financialConfiguration(tx,applicationId,await this.decisions.configuration(tx,loan.branchId,loan.offer.productVersionId));
  }
  async observationAuthority(tx:TransactionContext,applicationId:string) {return (await this.financial(tx,applicationId)).authority;}
  async policy(tx:TransactionContext,loanId:string) {
    requireLendingTransaction(tx);
    const loan=await this.origins.origin(tx,Id.parse(loanId));await this.authorize(tx,loan.applicationId);
    return (await this.decisions.configuration(tx,loan.branchId,loan.offer.productVersionId)).principalPolicy;
  }
}
