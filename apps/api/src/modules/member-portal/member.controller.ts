import { Controller,Get,Post,Patch,Param,Body,Query,Req,Res,Inject } from '@nestjs/common';
import type { Request,Response } from 'express';
import type { Config } from '../../platform/config.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { IdentityService,cookieValue } from '../identity/identity.service.js';
import { limitLogin } from '../identity/login-limit.js';
import type { Pool } from 'pg';
import { CONTRACT_VERSION } from '../../../../../packages/contracts/src/schemas.js';
import { sendDocument,uploadMetadata,type WorkflowServices } from '../evidence/workflow.controller.js';
import { MemberPortalService } from './member-portal.service.js';
export const MEMBER_PLATFORM=Symbol('MEMBER_PLATFORM');
export interface MemberRequest extends Request {correlationId:string;member?:Awaited<ReturnType<IdentityService['authenticateMember']>>}
export interface MemberServices {config:Config;identity:IdentityService;identityDatabase:Pool;portal:MemberPortalService;workflow?:WorkflowServices|null}
const actor=(request:MemberRequest)=>{if(!request.member)throw new ApiError(401,'member_authentication_required','Sign in to your member account.');return request.member.actor;};
@Controller('member')
export class MemberController {
  constructor(@Inject(MEMBER_PLATFORM) private readonly services:MemberServices){}
  @Post('support-requests/:id/corrections') correctSupport(@Req()r:MemberRequest,@Param('id')id:string,@Body()body:unknown){return this.services.portal.correctSupport(actor(r),id,body,r.headers['idempotency-key']);}
  @Get('support-requests/:id/correction-link') correctionLink(@Req()r:MemberRequest,@Param('id')id:string){return this.services.portal.supportCorrectionLink(actor(r),id);}
  @Get('support-requests/:id/correction-source') correctionSource(@Req()r:MemberRequest,@Param('id')id:string){return this.services.portal.supportCorrectionSource(actor(r),id);}
  @Get('auth/login') async login(@Req() request:MemberRequest,@Res() response:Response){
    await limitLogin(this.services.identityDatabase,this.services.config.SESSION_SECRET,request.socket.remoteAddress??'unknown');
    const result=await this.services.identity.beginLogin('member');
    response.cookie('agap_member_login',result.cookie,{httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax',path:'/api/v1/member/auth',maxAge:600_000});response.redirect(302,result.url);
  }
  @Get('auth/callback') async callback(@Req() request:MemberRequest,@Res() response:Response){
    response.clearCookie('agap_member_login',{path:'/api/v1/member/auth',httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax'});
    let token:string;
    try{token=(await this.services.identity.finishLogin(cookieValue(request.headers.cookie,'agap_member_login'),new URL(request.originalUrl,this.services.config.PUBLIC_ORIGIN),cookieValue(request.headers.cookie,'agap_member_session',this.services.config.LOCAL_PRESENTATION_MODE),'member')).token;}
    catch(error){if(!(error instanceof ApiError))throw error;const reason=error.code==='member_access_required'?'access':'retry';response.redirect(302,`${this.services.config.PUBLIC_ORIGIN}/#/member?signin=${reason}`);return;}
    response.cookie('agap_member_session',token,{httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax',path:'/api/v1/member',maxAge:this.services.config.SESSION_TTL_SECONDS*1000});response.redirect(302,`${this.services.config.PUBLIC_ORIGIN}/#/member`);
  }
  @Post('auth/logout') async logout(@Req() request:MemberRequest,@Res() response:Response){
    await this.services.identity.logoutMember(cookieValue(request.headers.cookie,'agap_member_session',this.services.config.LOCAL_PRESENTATION_MODE)!);
    response.clearCookie('agap_member_session',{path:'/api/v1/member',httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax'});response.status(200).json({signedOut:true});
  }
  @Get('session') async session(@Req() request:MemberRequest){const profile=await this.services.portal.applications.profile(actor(request));return {principal:{kind:'member',memberId:profile.id,displayName:profile.fullName},csrfToken:request.member!.csrfToken,expiresAt:request.member!.expiresAt,privacyNoticeVersion:this.services.config.PRIVACY_NOTICE_VERSION,contractVersion:CONTRACT_VERSION,recordMode:this.services.config.EVIDENCE_RECORD_MODE,...(this.services.config.FICTIONAL_PILOT_ENABLED?{fictionalPilot:true}:{})};}
  @Get('me') profile(@Req() r:MemberRequest){return this.services.portal.applications.profile(actor(r));}
  @Get('applications') list(@Req() r:MemberRequest,@Query() q:unknown){return this.services.portal.applications.list(actor(r),q);}
  @Get('applications/:id') get(@Req() r:MemberRequest,@Param('id') id:string){return this.services.portal.applications.get(actor(r),id);}
  @Post('applications') create(@Req() r:MemberRequest,@Body() body:unknown){return this.services.portal.applications.create(actor(r),body,r.headers['idempotency-key']);}
  @Patch('applications/:id') update(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.portal.applications.update(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Post('applications/:id/submission') submit(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.portal.applications.submit(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Get('reminder-preferences') preferences(@Req() r:MemberRequest){return this.services.portal.preferences(actor(r));}
  @Patch('reminder-preferences') updatePreferences(@Req() r:MemberRequest,@Body() body:unknown){return this.services.portal.updatePreferences(actor(r),body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Get('applications/:id/evidence') evidence(@Req() r:MemberRequest,@Param('id') id:string){return this.services.workflow?this.services.workflow.workflow.memberEvidence(actor(r),id):this.services.portal.evidence(actor(r),id);}
  @Post('applications/:id/documents') upload(@Req() r:MemberRequest,@Param('id') id:string){
    if(this.services.workflow)return this.services.workflow.documents.upload(actor(r),id,uploadMetadata(r),r,r.headers['idempotency-key']);
    let name:string;try{if(typeof r.headers['x-file-name']!=='string')throw new Error();name=decodeURIComponent(r.headers['x-file-name']);}catch{throw new ApiError(422,'invalid_file_name','Select a file with a valid name.');}
    const rawSize=r.headers['x-upload-size'];if(typeof rawSize!=='string'||!/^\d{1,9}$/.test(rawSize))throw new ApiError(422,'invalid_upload_size','Select a file no larger than 10 MB.');
    return this.services.portal.upload(actor(r),id,{fileName:name,mediaType:r.headers['content-type'],size:Number(rawSize)},r,r.headers['idempotency-key']);
  }
  @Get('applications/:id/documents/:sourceId') async download(@Req() r:MemberRequest,@Param('id') id:string,@Param('sourceId') sourceId:string,@Res() response:Response){
    if(this.services.workflow){sendDocument(response,await this.services.workflow.documents.download(actor(r),id,sourceId));return;}
    const file=await this.services.portal.download(actor(r),id,sourceId);
    response.setHeader('Content-Type',file.metadata.mediaType);response.setHeader('Content-Length',file.bytes.byteLength);response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(file.metadata.fileName)}`);response.status(200).send(file.bytes);
  }
  @Post('applications/:id/confirmations') confirm(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.workflow?this.services.workflow.workflow.confirm(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']):this.services.portal.confirm(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Get('applications/:id/options') options(@Req() r:MemberRequest,@Param('id') id:string){return this.services.portal.options(actor(r),id);}
  @Get('applications/:id/decision') decision(@Req() r:MemberRequest,@Param('id') id:string){return this.services.portal.decision(actor(r),id);}
  @Post('applications/:id/acceptances') accept(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.portal.accept(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Get('loans') loans(@Req() r:MemberRequest){return this.services.portal.loans(actor(r));}
  @Get('assisted-check-ins') assistedCheckIns(@Req() r:MemberRequest,@Query() q:unknown){return this.services.portal.assistedCheckIns(actor(r),q);}
  @Get('assisted-check-ins/:id') assistedCheckIn(@Req() r:MemberRequest,@Param('id') id:string){return this.services.portal.assistedCheckIn(actor(r),id);}
  @Post('assisted-check-ins/:id/confirmations') confirmAssistedCheckIn(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.portal.confirmAssistedCheckIn(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Post('assisted-check-ins/:id/declines') declineAssistedCheckIn(@Req() r:MemberRequest,@Param('id') id:string,@Body() body:unknown){return this.services.portal.declineAssistedCheckIn(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
  @Get('support-requests') support(@Req() r:MemberRequest){return this.services.portal.support(actor(r));}
  @Get('support-history') supportHistory(@Req() r:MemberRequest,@Query() query:unknown){return this.services.portal.supportHistory(actor(r),query);}
  @Post('support-requests') requestSupport(@Req() r:MemberRequest,@Body() body:unknown){return this.services.portal.requestSupport(actor(r),body,r.headers['idempotency-key']);}
}
