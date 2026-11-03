import { Body,Controller,Get,Inject,Param,Post,Query,Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ApiError } from '../../platform/errors.js';
import { ReconciliationService } from './reconciliation.service.js';
export const RECONCILIATIONS=Symbol('RECONCILIATIONS');
interface StaffRequest extends Request {staff?:{actor:ActorContext}}
function actor(request:StaffRequest){if(!request.staff)throw new ApiError(401,'authentication_required','Sign in to view reconciliation.');return request.staff.actor;}
@Controller('reconciliations')
export class ReconciliationController {
  constructor(@Inject(RECONCILIATIONS)private readonly service:ReconciliationService){}
  @Post() create(@Req() request:StaffRequest,@Body() body:unknown){return this.service.create(actor(request),body,request.headers['idempotency-key']);}
  @Get() list(@Req() request:StaffRequest,@Query() query:unknown){return this.service.list(actor(request),query);}
  @Get(':id') get(@Req() request:StaffRequest,@Param('id') id:string){return this.service.get(actor(request),id);}
}
