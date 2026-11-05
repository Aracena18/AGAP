import {Body,Controller,Get,Inject,Param,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import type {ActorContext} from '../../../../../packages/contracts/src/ports.js';
import {expectedVersion} from '../../platform/commands.js';
import {ApiError} from '../../platform/errors.js';
import {MonitoringService} from './monitoring.service.js';
export const MONITORING=Symbol('MONITORING');
interface StaffRequest extends Request{staff?:{actor:ActorContext}}
function actor(r:StaffRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to staff support.');return r.staff.actor;}
@Controller('support-requests')
export class MonitoringController{
 constructor(@Inject(MONITORING)private readonly service:MonitoringService){}
 @Get()list(@Req()r:StaffRequest,@Query()q:unknown){return this.service.list(actor(r),q);}
 @Get(':id')get(@Req()r:StaffRequest,@Param('id')id:string){return this.service.get(actor(r),id);}
 @Get(':id/loan-position')freshPosition(@Req()r:StaffRequest,@Param('id')id:string){return this.service.freshPosition(actor(r),id);}
 @Get(':id/history')history(@Req()r:StaffRequest,@Param('id')id:string){return this.service.history(actor(r),id);}
 @Get(':id/position')position(@Req()r:StaffRequest,@Param('id')id:string){return this.service.currentPosition(actor(r),id);}
 @Get(':id/actions')actions(@Req()r:StaffRequest,@Param('id')id:string,@Query()q:unknown){return this.service.actions(actor(r),id,q);}
 @Post(':id/assignments')assign(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.assign(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post(':id/responses')respond(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.respond(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post(':id/actions')createAction(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.respondPaged(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
}

@Controller('support-follow-ups')
export class SupportFollowUpController{
 constructor(@Inject(MONITORING)private readonly service:MonitoringService){}
 @Get('queues/:state')list(@Req()r:StaffRequest,@Param('state')state:string,@Query()q:unknown){return this.service.followUps.list(actor(r),state,q);}
 @Get(':id')get(@Req()r:StaffRequest,@Param('id')id:string){return this.service.followUps.get(actor(r),id);}
 @Get(':id/events')events(@Req()r:StaffRequest,@Param('id')id:string,@Query()q:unknown){return this.service.followUps.events(actor(r),id,q);}
 @Post(':id/completions')complete(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.followUps.complete(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post(':id/reschedules')reschedule(@Req()r:StaffRequest,@Param('id')id:string,@Body()body:unknown){return this.service.followUps.reschedule(actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
}
