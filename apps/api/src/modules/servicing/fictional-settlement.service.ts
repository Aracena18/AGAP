import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { CommandReceiptSchema, FinancialActionReasonSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { canonical, command, recordEvent } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';
import { fingerprint, permission } from './command-rules.js';
import { ObservationInputSchema } from './context.js';
import { financialTarget } from './financial-target.js';
import { MoneyService, type MoneyPorts } from './money.service.js';
import { ServicingService, servicingOperation } from './servicing.service.js';

const Outcome=z.enum(['confirmed','failed','unknown']);
type Outcome=z.output<typeof Outcome>;
const Stored=z.strictObject({id:z.uuid(),revision:Version,commandVersion:Version,legacy:z.boolean(),observation:ObservationInputSchema});
/** SQL-backed FICTIONAL adapter. It performs no real cash/bank/provider movement.
 * Test-only scenario functions model trusted provider outcomes; HTTP cannot set
 * outcome, verification, identities, amount or evidence. */
export class FictionalSettlementService {
  constructor(private readonly uow:UnitOfWork,private readonly ports:MoneyPorts,private readonly releases:ServicingService,private readonly money:MoneyService,
    private readonly scenario:{submit:()=>Outcome;status:(previous:Outcome)=>Outcome}={submit:()=> 'confirmed',status:previous=>previous},private readonly now=()=>new Date()){}
  async record(actor:ActorContext,loanId:string,commandId:string,input:unknown,version:number,key:unknown,statusCheck=false){
    return servicingOperation(async()=>{
      requireRoles(actor,['cashier','financial_authorizer']);const data=FinancialActionReasonSchema.parse(input);Version.parse(version);
      const operation=statusCheck?'status':'settlement',request={loanId,commandId,version,data};
      // First independent commit: the original permanent movement and evidence
      // survive subsequent observation/posting failure and process restart.
      const stored=Stored.parse(await this.uow.run(actor,async tx=>{
        const target=await financialTarget(tx,this.ports,loanId,commandId);
        return command(tx,`fictional.${operation}.intake:${commandId}`,key,request,async()=>{
          const c=target.c,authority=await this.ports.observationAuthority(tx,target.loan.applicationId);
          permission(actor,{authority},target.loan,statusCheck?'reconcile':'observe',this.now().toISOString(),c.payload.amountCentavos,c.payload.method);
          const existing=(await tx.query('SELECT * FROM servicing.staff_fictional_movements WHERE organization_id=$1 AND command_id=$2',[actor.organizationId,commandId])).rows[0];
          let movement=existing;
          if(!movement){
            if(statusCheck||target.money?.posting||c.state!=='submitted'||!c.submission)throw new ApiError(409,'submitted_intent_required','Inspect the original committed submission. No replacement movement was created.');
            if(c.version!==version)throw new ApiError(412,'stale_version','Reload the exact command before a new fictional settlement.');
            const id=randomUUID();
            await tx.query(`INSERT INTO servicing.fictional_movements(id,organization_id,branch_id,loan_id,command_id,provider_key,business_event_id,submission_id,payload_hash,kind,amount_centavos,effective_date,currency,created_by)
              VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[id,actor.organizationId,c.branchId,loanId,c.id,c.providerKey,'eventId' in c?c.eventId:c.businessEventId,c.submission.id,c.payloadHash,c.kind,c.payload.amountCentavos,c.payload.effectiveDate,c.payload.currency,actor.userId]);
            movement=(await tx.query('SELECT * FROM servicing.staff_fictional_movements WHERE organization_id=$1 AND id=$2',[actor.organizationId,id])).rows[0];
          }
          if(movement.provider_key!==c.providerKey||movement.payload_hash!==c.payloadHash||movement.submission_id!==c.submission?.id)throw new ApiError(409,'movement_binding','The original movement binding cannot be changed.');
          const last=(await tx.query('SELECT * FROM servicing.staff_fictional_movement_observations WHERE organization_id=$1 AND movement_id=$2 ORDER BY revision DESC LIMIT 1',[actor.organizationId,movement.id])).rows[0];
          const previous=last?Outcome.parse(last.state):null;
          const outcome=Outcome.parse(last?(statusCheck?this.scenario.status(previous!):previous):this.scenario.submit());
          if(last&&outcome===previous)return this.stored(last,target.legacy);
          if(last&&c.version!==version)throw new ApiError(412,'stale_version','Reload the existing movement before recording a new status.');
          if(target.money?.posting)throw new ApiError(409,'posted_movement_preserved','Posted movement evidence is preserved; a contradictory later result requires independent review.');
          const revision=last?Number(last.revision)+1:1,id=randomUUID(),at=this.now().toISOString();
          const observation=ObservationInputSchema.parse({id,producer:'fictional-sql-adapter-v1',commandId:c.id,businessEventId:movement.business_event_id,providerKey:c.providerKey,mode:'simulation',state:outcome,
            movementId:outcome==='confirmed'?movement.id:null,providerReference:outcome==='unknown'?null:`SIMULATED-${movement.id}`,amountMinorUnits:outcome==='confirmed'?c.payload.amountCentavos:null,
            currency:outcome==='confirmed'?'PHP':null,effectiveDate:outcome==='confirmed'?c.payload.effectiveDate:null,occurredAt:outcome==='confirmed'?at:null,verified:outcome!=='unknown',
            evidence:outcome==='unknown'?null:{id:movement.id,sha256:fingerprint({purpose:'fictional-only',movementId:movement.id,commandId:c.id,payloadHash:c.payloadHash,outcome,revision})}});
          await tx.query(`INSERT INTO servicing.fictional_movement_observations(id,organization_id,branch_id,movement_id,revision,command_version,recorded_by,state,body_text,body_hash)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,actor.organizationId,c.branchId,movement.id,revision,c.version,actor.userId,outcome,canonical(observation),fingerprint(observation)]);
          await recordEvent(tx,'fictional.movement_evidence_recorded',Id.parse(movement.id),revision);
          return {id:movement.id,revision,commandVersion:c.version,legacy:target.legacy,observation};
        });
      }));
      // Domain processing is a second transaction. Stable observation identity
      // and key make a crash between commits recover the original evidence.
      const applied=await this.uow.run(actor,async tx=>{
        const target=await financialTarget(tx,this.ports,loanId,commandId);
        const previous=target.c.observations.find(o=>o.input.id===stored.observation.id);
        if(previous){if(fingerprint(previous.input)!==fingerprint(stored.observation))throw new ApiError(503,'movement_integrity','Saved movement evidence does not match.');return {id:commandId,version:target.c.version};}
        return null;
      });
      let receipt=applied;
      if(!receipt){
        const applyKey=`fictional_${stored.observation.id}`;
        const result=stored.legacy?await this.releases.observe(actor,commandId,stored.observation,stored.commandVersion,applyKey,data.reason)
          :await this.money.observe(actor,commandId,stored.observation,stored.commandVersion,applyKey,data.reason);
        receipt={id:commandId,version:'command' in result?result.command.version:result.version};
      }
      // Preserve the exact public response separately from later current reads.
      return this.uow.run(actor,async tx=>{
        await financialTarget(tx,this.ports,loanId,commandId);
        return command(tx,`fictional.${operation}.response:${commandId}`,key,request,async()=>CommandReceiptSchema.parse(receipt));
      });
    });
  }
  private stored(row:Record<string,unknown>,legacy:boolean){
    const observation=ObservationInputSchema.parse(row.body);
    if(fingerprint(observation)!==row.body_hash)throw new ApiError(503,'movement_integrity','The durable fictional evidence cannot be verified.');
    return {id:row.movement_id,revision:Number(row.revision),commandVersion:Number(row.command_version),legacy,observation};
  }
}
