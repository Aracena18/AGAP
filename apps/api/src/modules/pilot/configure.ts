import type { MemberUnitOfWork,UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import type { WorkflowService } from '../evidence/workflow.service.js';
import { PilotService } from './pilot.service.js';
import type { PilotReadiness } from './producers.js';
/** Root calls only after its fictional-mode/normal-auth configuration guard. No seeds. */
export function configurePilot(input:{uow:UnitOfWork;memberUow:MemberUnitOfWork;workflow:WorkflowService;readiness:PilotReadiness}){
 const service=new PilotService(input.uow,input.memberUow,input.workflow,input.readiness);
 return {service,basis:{load:service.producers.reviewStatus.bind(service.producers)},memberDomains:service.memberDomains(),loans:service.loans};
}
