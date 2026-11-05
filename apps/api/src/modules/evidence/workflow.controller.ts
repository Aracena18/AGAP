import { GuidanceService } from './guidance.service.js';
import { Controller,Get,Post,Param,Body,Req,Res,Inject } from '@nestjs/common';
import type { Request,Response } from 'express';
import type { ActorContext,MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { WorkflowService } from './workflow.service.js';
import { DocumentsService } from './documents.service.js';
export const WORKFLOW=Symbol('WORKFLOW');
export interface WorkflowServices {workflow:WorkflowService;documents:DocumentsService}
interface AuthRequest extends Request {staff?:{actor:ActorContext};member?:{actor:MemberActorContext}}
export function workflowActor(r:AuthRequest){const actor=r.path.startsWith('/api/v1/member/')?r.member?.actor:r.staff?.actor;if(!actor)throw new ApiError(401,'authentication_required','Sign in to continue.');return actor;}
export function uploadMetadata(r:Request){let fileName:string;try{if(typeof r.headers['x-file-name']!=='string')throw new Error();fileName=decodeURIComponent(r.headers['x-file-name']);}catch{throw new ApiError(422,'invalid_file_name','Choose a valid file name.');}const size=r.headers['x-upload-size'];if(typeof size!=='string'||!/^\d{1,9}$/.test(size))throw new ApiError(422,'invalid_upload_size','Choose a document no larger than 10 MB.');return {fileName,mediaType:r.headers['content-type'],size:Number(size)};}
export function sendDocument(response:Response,file:{bytes:Uint8Array;mediaType:string;fileName:string}){response.setHeader('Content-Type',file.mediaType);response.setHeader('Content-Length',file.bytes.byteLength);response.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);response.setHeader('Cache-Control','private, no-store');response.status(200).send(Buffer.from(file.bytes));}
@Controller()
export class WorkflowController {
 constructor(@Inject(WORKFLOW) private readonly services:WorkflowServices|null){}
 private get enabled(){if(!this.services)throw new ApiError(501,'module_not_available','The evidence workflow is not enabled in this environment.');return this.services;}
 @Get(['applications/:id/guidance','member/applications/:id/guidance']) guidance(@Req() r:AuthRequest,@Param('id') id:string){return new GuidanceService(this.enabled.workflow).read(workflowActor(r),id);}
 @Post(['applications/:id/guidance/responses','member/applications/:id/guidance/responses']) respond(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return new GuidanceService(this.enabled.workflow).respond(workflowActor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Get(['applications/:id/evidence','member/applications/:id/workflow']) view(@Req() r:AuthRequest,@Param('id') id:string){return this.enabled.workflow.view(workflowActor(r),id);}
 @Get('applications/:id/evidence/history') history(@Req() r:AuthRequest,@Param('id') id:string){return this.enabled.workflow.history(r.staff!.actor,id);}
 @Post(['applications/:id/facts','member/applications/:id/facts']) fact(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.workflow.saveFact(workflowActor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/corrections') correction(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.workflow.correct(r.staff!.actor,id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/draft-reviews') review(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.workflow.review(workflowActor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/verifications') verify(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.workflow.verify(r.staff!.actor,id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/assessments') assess(@Req() r:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.workflow.assess(r.staff!.actor,id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/documents') upload(@Req() r:AuthRequest,@Param('id') id:string){return this.enabled.documents.upload(workflowActor(r),id,uploadMetadata(r),r,r.headers['idempotency-key']);}
 @Get('applications/:id/documents/:sourceId') async download(@Req() r:AuthRequest,@Param('id') id:string,@Param('sourceId') sourceId:string,@Res() response:Response){sendDocument(response,await this.enabled.documents.download(workflowActor(r),id,sourceId));}
}
