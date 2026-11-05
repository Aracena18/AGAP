import { z } from 'zod';
import { Id, Text } from '../../../../../packages/contracts/src/schemas.js';
import { AuthoritySchema } from './context.js';
import { FinancialAuthoritySchema } from '../servicing/context.js';
import { PrincipalPolicySchema } from '../servicing/money-context.js';

/** First supported integration product. This is explicitly simulation-only. */
export const LendingConfigurationSchema = z.strictObject({
  format:z.literal('connected-principal-configuration/v1'), id:Id, organizationId:Id, branchId:Id, productVersionId:Id,
  status:z.literal('fictional'), policyReference:Text, operatorReference:Text,
  sourceReview:z.enum(['confirmed_statements_permitted','independent_support_required']),
  authority:AuthoritySchema, financialAuthority:FinancialAuthoritySchema, principalPolicy:PrincipalPolicySchema,
  execution:z.strictObject({status:z.literal('configured'),mode:z.literal('simulation'),componentRuleVersionId:Id}),
}).superRefine((c,ctx) => {
  const reject=(message:string) => ctx.addIssue({code:'custom',message});
  if(c.authority.status!=='configured'||c.financialAuthority.status!=='configured') {reject('Explicit fictional lending and financial authority are required.');return;}
  if(c.authority.versionId!==c.id||c.financialAuthority.versionId!==c.id||c.principalPolicy.versionId!==c.id
    ||c.execution.componentRuleVersionId!==c.id) reject('Every authority/component packet must bind this configuration version.');
  if(c.financialAuthority.organizationId!==c.organizationId||c.principalPolicy.organizationId!==c.organizationId
    ||c.financialAuthority.branchId!==c.branchId||c.financialAuthority.productVersionId!==c.productVersionId
    ||c.principalPolicy.productVersionId!==c.productVersionId) reject('The first-product configuration contains mixed scopes.');
  if(c.authority.requiredApprovers!==1) reject('The first fictional product supports one separate reviewer; multi-approver products remain unavailable.');
  if(c.authority.approvalValidity.kind==='unavailable'||c.authority.grants.some(g=>g.exceptionPolicyIds.length)) reject('Fictional integration requires explicit validity and no policy overrides.');
  if(c.authority.effectiveFrom>c.authority.effectiveThrough || c.financialAuthority.effectiveFrom!==c.authority.effectiveFrom
    ||c.financialAuthority.effectiveThrough!==c.authority.effectiveThrough||c.principalPolicy.effectiveFrom!==c.authority.effectiveFrom
    ||c.principalPolicy.effectiveThrough!==c.authority.effectiveThrough) reject('All first-product components must share the explicit valid effective period.');
  for(const grants of [c.authority.grants,c.financialAuthority.grants])
    if(new Set(grants.map(g=>g.userId)).size!==grants.length) reject('Authority grants must be unambiguous.');
  const authorizers=c.financialAuthority.grants.filter(g=>g.actions.includes('authorize'));
  if(authorizers.length!==1 || !c.financialAuthority.grants.some(g=>g.actions.includes('prepare')&&g.userId!==authorizers[0]?.userId))
    reject('The first fictional product requires one financial authorizer and a separate preparer.');
});
export type LendingConfiguration = z.output<typeof LendingConfigurationSchema>;
