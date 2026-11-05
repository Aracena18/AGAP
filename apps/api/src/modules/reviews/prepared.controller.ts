import { Controller,Get,Inject,Param,Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext,MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import { PreparedReviewService } from './prepared.service.js';
import { ApiError } from '../../platform/errors.js';
export const PREPARED=Symbol('PREPARED');
interface AuthRequest extends Request{staff?:{actor:ActorContext};member?:{actor:MemberActorContext}}
@Controller()
export class PreparedReviewController{
 constructor(@Inject(PREPARED)private readonly service:PreparedReviewService|null){}
 @Get(['applications/:id/prepared-review','member/applications/:id/prepared-review'])read(@Req()r:AuthRequest,@Param('id')id:string){
  if(!this.service)return {state:'absent' as const};
  const actor=r.path.startsWith('/api/v1/member/')?r.member?.actor:r.staff?.actor;
  if(!actor)throw new ApiError(401,'authentication_required','Sign in to continue.');return this.service.read(actor,id);
 }
}
