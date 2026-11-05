import type { z } from 'zod';
import { createHash } from 'node:crypto';
import type { MemberActorContext,MemberDomainPorts,MemberUnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { schemas } from '../../../../../packages/contracts/src/schemas.js';
import { MemberApplicationsService } from '../applications/member-applications.service.js';
import { memberCommand,memberEvent,memberKey } from '../../platform/member-commands.js';
import { ApiError } from '../../platform/errors.js';
const checked=<T,>(schema:z.ZodType<T>,value:unknown):T=>{const result=schema.safeParse(value);if(!result.success)throw new ApiError(503,'domain_data_unavailable','This information cannot be displayed safely yet. Try again later or contact the cooperative.');return result.data;};
const validOption=(option:z.output<typeof schemas.MemberOption>)=>option.offer.id===option.checked.offerVersionId&&option.horizonStart<=option.horizonEnd;
const unavailable=()=>({state:'unavailable' as const,message:'This service is temporarily unavailable. You can return later or contact the cooperative.'});
const pending=():never=>{throw new ApiError(501,'module_not_available','This service is not available yet. Your request has not been saved. Contact the cooperative for assistance.');};
/** Honest production defaults. Tests can inject fictional domain services explicitly. */
export const unavailableMemberDomains:MemberDomainPorts={
  evidence:async()=>unavailable(),options:async()=>unavailable(),decision:async()=>unavailable(),loans:async()=>unavailable(),support:async()=>unavailable(),
  upload:async()=>pending(),download:async()=>pending(),confirm:async()=>pending(),accept:async()=>pending(),requestSupport:async()=>pending(),
};
export class MemberPortalService {
  constructor(private readonly uow:MemberUnitOfWork,readonly applications:MemberApplicationsService,private readonly noticeVersion:string,private readonly domains:MemberDomainPorts=unavailableMemberDomains){}
  preferences(actor:MemberActorContext){return this.uow.run(actor,async tx=>{
    const row=(await tx.query('SELECT notices_enabled,version FROM portal.preferences WHERE organization_id=$1 AND member_id=$2',[actor.organizationId,actor.memberId])).rows[0];
    if(!row)throw new ApiError(503,'preferences_unavailable','Your reminder preferences are unavailable. Contact the cooperative.');
    return schemas.ReminderPreferences.parse({noticesEnabled:row.notices_enabled,version:Number(row.version)});
  });}
  updatePreferences(actor:MemberActorContext,input:unknown,version:number,key:unknown){
    const data=schemas.ReminderPreferenceUpdate.parse(input);
    return this.uow.run(actor,tx=>memberCommand(tx,'preferences.update',key,{data,version},async()=>{
      const row=(await tx.query('UPDATE portal.preferences SET notices_enabled=$3,version=version+1 WHERE organization_id=$1 AND member_id=$2 AND version=$4 RETURNING notices_enabled,version',[actor.organizationId,actor.memberId,data.noticesEnabled,version])).rows[0];
      if(!row)throw new ApiError(412,'stale_version','Your preferences changed. Reload before saving.');
      const result=schemas.ReminderPreferences.parse({noticesEnabled:row.notices_enabled,version:Number(row.version)});
      await memberEvent(tx,'member.preferences.updated',actor.memberId,result.version);return result;
    }));
  }
  evidence(actor:MemberActorContext,id:string){return this.uow.run(actor,async tx=>{
    await this.applications.own(tx,id);const result=checked(schemas.MemberEvidenceView,await this.domains.evidence(tx,id));
    if(result.state==='available'&&result.data.drafts.some(draft=>(draft.origin==='model'&&!draft.provenance)||!result.data.sources.some(source=>source.id===draft.source.sourceId&&source.version===draft.source.sourceVersion&&source.state==='cleared')))throw new ApiError(503,'draft_provenance_unavailable','Document suggestions are unavailable until their source and model versions can be checked.');
    return result;
  });}
  options(actor:MemberActorContext,id:string){return this.uow.run(actor,async tx=>{await this.applications.own(tx,id);const view=checked(schemas.MemberOptionsView,await this.domains.options(tx,id));if(view.state==='available'&&view.data.some(option=>!validOption(option)))throw new ApiError(503,'options_unavailable','These repayment options are unavailable until their terms and calculations match.');return view;});}
  decision(actor:MemberActorContext,id:string){return this.uow.run(actor,async tx=>{await this.applications.own(tx,id);const view=checked(schemas.MemberDecisionView,await this.domains.decision(tx,id));if(view.state==='available'&&view.data?.terms&&!validOption(view.data.terms))throw new ApiError(503,'decision_unavailable','The recorded terms are unavailable until their basis is checked.');return view;});}
  loans(actor:MemberActorContext){return this.uow.run(actor,async tx=>{const view=checked(schemas.MemberLoansView,await this.domains.loans(tx));if(view.state==='available'&&view.data.some(loan=>loan.id!==loan.position.loanId||loan.receipts.some(receipt=>receipt.loanId!==loan.id)))throw new ApiError(503,'loans_unavailable','Your loan information cannot be displayed safely yet.');return view;});}
  support(actor:MemberActorContext){return this.uow.run(actor,async tx=>checked(schemas.MemberSupportView,await this.domains.support(tx)));}
  supportHistory(actor:MemberActorContext,input:unknown){
    const query=schemas.MemberSupportHistoryQuery.parse(input);
    return this.uow.run(actor,async tx=>checked(schemas.MemberSupportPageView,this.domains.supportPage?await this.domains.supportPage(tx,query):unavailable()));
  }
  confirm(actor:MemberActorContext,id:string,input:unknown,version:number,key:unknown){
    const data=schemas.DraftConfirmation.parse(input),stable=memberKey(key);
    return this.uow.run(actor,async tx=>{await this.applications.own(tx,id);return checked(schemas.CommandReceipt,await this.domains.confirm(tx,id,data,version,stable));});
  }
  accept(actor:MemberActorContext,id:string,input:unknown,version:number,key:unknown){
    const data=schemas.MemberAcceptance.parse(input),stable=memberKey(key);
    return this.uow.run(actor,async tx=>{
      await this.applications.own(tx,id);const view=checked(schemas.MemberDecisionView,await this.domains.decision(tx,id));
      if(view.state==='unavailable')return pending();
      if(!view.data||view.data.outcome!=='approve'||!view.data.terms||!validOption(view.data.terms)||view.data.id!==data.decisionId||view.data.documentVersionId!==data.documentVersionId)throw new ApiError(409,'approved_terms_required','Review the current complete approved terms before accepting.');
      return checked(schemas.CommandReceipt,await this.domains.accept(tx,id,data,version,stable));
    });
  }
  requestSupport(actor:MemberActorContext,input:unknown,key:unknown){
    const data=schemas.MemberSupportCreate.parse(input),stable=memberKey(key);
    if(data.noticeVersion!==this.noticeVersion)throw new ApiError(409,'notice_changed','Review who will receive your request before submitting.');
    return this.uow.run(actor,async tx=>{
      if(data.loanId){
        const loans=checked(schemas.MemberLoansView,await this.domains.loans(tx));
        if(loans.state!=='available')return pending();
        if(!loans.data.some(loan=>loan.id===data.loanId))throw new ApiError(404,'not_found','This record is not available.');
      }
      return checked(schemas.MemberSupport,await this.domains.requestSupport(tx,data,stable));
    });
  }
  correctSupport(actor:MemberActorContext,id:unknown,input:unknown,key:unknown){
    const request=schemas.SupportCorrectionCreate.parse(input),prior=schemas.MemberSupport.shape.id.parse(id),stable=memberKey(key);
    if(request.noticeVersion!==this.noticeVersion)throw new ApiError(409,'notice_changed','Review who will receive your correction before submitting.');
    return this.uow.run(actor,async tx=>{if(!this.domains.correctSupport)return pending();return checked(schemas.MemberSupport,await this.domains.correctSupport(tx,prior,request,stable));});
  }
  supportCorrectionLink(actor:MemberActorContext,id:unknown){
    const request=schemas.MemberSupport.shape.id.parse(id);
    return this.uow.run(actor,async tx=>{if(!this.domains.supportCorrectionLink)return pending();return checked(schemas.SupportCorrectionLink,await this.domains.supportCorrectionLink(tx,request));});
  }
  async upload(actor:MemberActorContext,id:string,input:unknown,stream:AsyncIterable<Uint8Array>,key:unknown){
    const metadata=schemas.MemberUpload.parse(input),stable=memberKey(key);
    if(/[/\\]/.test(metadata.fileName)||[...metadata.fileName].some(char=>char.charCodeAt(0)<32))throw new ApiError(422,'invalid_file_name','Use a file name without folders or control characters.');
    // Check current ownership before consuming even the legacy projection's upload body.
    await this.uow.run(actor,tx=>this.applications.own(tx,id));
    // Bound and hash exact bytes before delegation, including idempotent retries.
    const chunks:Buffer[]=[];let size=0;
    for await(const chunk of stream){size+=chunk.byteLength;if(size>metadata.size||size>10*1024*1024)throw new ApiError(413,'request_too_large','Choose a file no larger than 10 MB.');chunks.push(Buffer.from(chunk));}
    if(size!==metadata.size)throw new ApiError(422,'upload_size_mismatch','The complete file was not received. Select it again.');
    const bytes=Buffer.concat(chunks),sha256=createHash('sha256').update(bytes).digest('hex');
    return this.uow.run(actor,async tx=>{
      await this.applications.own(tx,id);
      async function* content(){yield bytes;}
      return checked(schemas.MemberSource,await this.domains.upload(tx,id,{...metadata,sha256},content(),stable));
    });
  }
  download(actor:MemberActorContext,id:string,sourceId:string){
    return this.uow.run(actor,async tx=>{
      await this.applications.own(tx,id);
      const evidence=checked(schemas.MemberEvidenceView,await this.domains.evidence(tx,id));
      if(evidence.state==='unavailable')return pending();
      const source=evidence.data.sources.find(item=>item.id===sourceId&&item.state==='cleared');
      if(!source)throw new ApiError(404,'not_found','This document is not available.');
      const file=await this.domains.download(tx,id,sourceId),metadata=checked(schemas.MemberUpload,file.metadata),chunks:Buffer[]=[];let size=0;
      for await(const chunk of file.stream){size+=chunk.byteLength;if(size>metadata.size||size>10*1024*1024)throw new ApiError(503,'document_unavailable','This document could not be read safely. Contact the cooperative.');chunks.push(Buffer.from(chunk));}
      if(size!==metadata.size)throw new ApiError(503,'document_unavailable','This document is incomplete. Contact the cooperative.');
      return {metadata,bytes:Buffer.concat(chunks)};
    });
  }
}
