import {Body,Controller,Get,Inject,Param,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import type {ActorContext} from '../../../../../packages/contracts/src/ports.js';
import {ApiError} from '../../platform/errors.js';
import {expectedVersion} from '../../platform/commands.js';
import {ConnectedMoneyService} from './connected-money.service.js';
export const CONNECTED_MONEY=Symbol('CONNECTED_MONEY');
interface StaffRequest extends Request{staff?:{actor:ActorContext}}
function actor(r:StaffRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');return r.staff.actor;}
@Controller()
export class ConnectedMoneyController{
 constructor(@Inject(CONNECTED_MONEY) private readonly service:ConnectedMoneyService|null){}
 private get enabled(){if(!this.service)throw new ApiError(501,'module_not_available','Connected fictional money operations are not enabled.');return this.service;}
 @Get('financial-applications') applications(@Req()r:StaffRequest,@Query()q:unknown){return this.enabled.applications(actor(r),q);}
 @Get('applications/:id/financial-workspace') application(@Req()r:StaffRequest,@Param('id')id:string){return this.enabled.application(actor(r),id);}
 @Get('loans/:id/workspace') workspace(@Req()r:StaffRequest,@Param('id')id:string,@Query()q:unknown){return this.enabled.workspace(actor(r),id,q);}
 @Post('loans/:id/disbursements') release(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.prepare(actor(r),id,b,r.headers['idempotency-key'],'release');}
 @Post('loans/:id/repayments') repayment(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.prepare(actor(r),id,b,r.headers['idempotency-key'],'repayment');}
 @Get('financial-commands/:id') read(@Req()r:StaffRequest,@Param('id')id:string){return this.enabled.read(actor(r),id);}
 @Post('financial-commands/:id/authorizations') authorize(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.authorize(actor(r),id,b,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('financial-commands/:id/submissions') submit(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.submit(actor(r),id,b,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('financial-commands/:id/simulation-observations') observe(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.observe(actor(r),id,b,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('financial-commands/:id/postings') finalize(@Req()r:StaffRequest,@Param('id')id:string,@Body()b:unknown){return this.enabled.finalize(actor(r),id,b,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
}
