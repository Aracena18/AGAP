import {Body,Controller,Get,Inject,Param,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import type {ActorContext} from '../../../../../packages/contracts/src/ports.js';
import {expectedVersion} from '../../platform/commands.js';
import {ApiError} from '../../platform/errors.js';
import {AssistedCheckInsService} from './assisted-check-ins.service.js';
export const ASSISTED_CHECK_INS=Symbol('ASSISTED_CHECK_INS');
interface StaffRequest extends Request{staff?:{actor:ActorContext}}
function actor(r:StaffRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to staff support.');return r.staff.actor;}
@Controller()
export class AssistedCheckInsController{
 constructor(@Inject(ASSISTED_CHECK_INS)private readonly service:AssistedCheckInsService){}
 @Get('support-requests/:id/assisted-check-ins')list(@Req()r:StaffRequest,@Param('id')id:string,@Query()q:unknown){return this.service.list(actor(r),id,q);}
 @Post('support-requests/:id/assisted-check-ins')prepare(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.prepare(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Get('support-assisted-check-ins/:id')get(@Req()r:StaffRequest,@Param('id')id:string){return this.service.get(actor(r),id);}
 @Post('support-assisted-check-ins/:id/revisions')revise(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.revise(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('support-assisted-check-ins/:id/withdrawals')withdraw(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.withdraw(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
}
