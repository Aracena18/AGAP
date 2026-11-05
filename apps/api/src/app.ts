import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Controller, Get, Post, Patch, Param, Body, Query, Req, Res, Inject, Module, Catch, type ExceptionFilter, type ArgumentsHost, HttpException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import type { Pool } from 'pg';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { operations } from '../../../packages/contracts/src/operations.js';
import { CONTRACT_VERSION } from '../../../packages/contracts/src/schemas.js';
import { createPool, PostgresUnitOfWork } from './platform/database.js';
import { ApiError } from './platform/errors.js';
import { expectedVersion } from './platform/commands.js';
import { assertConnectedLending, assertLocalPresentation, type Config } from './platform/config.js';
import { IdentityService, cookieValue } from './modules/identity/identity.service.js';
import { MembersService } from './modules/members/members.service.js';
import { ApplicationsService } from './modules/applications/applications.service.js';
import { StaffService } from './modules/identity/staff.service.js';
import { limitLogin } from './modules/identity/login-limit.js';
import { createPresentationSession } from './modules/identity/local-presentation.js';
import { PostgresMemberUnitOfWork } from './platform/member-database.js';
import { MemberApplicationsService } from './modules/applications/member-applications.service.js';
import { MemberPortalService } from './modules/member-portal/member-portal.service.js';
import { MemberController,MEMBER_PLATFORM,type MemberRequest } from './modules/member-portal/member.controller.js';
import { WorkflowController,WORKFLOW } from './modules/evidence/workflow.controller.js';
import { configureWorkflow,requireRelease } from './modules/evidence/configure.js';
import { LoanReads } from './modules/servicing/loan-reads.js';
import { ReconciliationService } from './modules/accounting/reconciliation.service.js';
import { ReconciliationController,RECONCILIATIONS } from './modules/accounting/reconciliation.controller.js';
import { MonitoringService } from './modules/monitoring/monitoring.service.js';
import { MonitoringController,SupportFollowUpController,MONITORING } from './modules/monitoring/monitoring.controller.js';
import { unavailableMemberDomains } from './modules/member-portal/member-portal.service.js';
import { DECISIONS, DecisionsController, type DecisionServices } from './modules/decisions/decisions.controller.js';
import { DecisionsService } from './modules/decisions/decisions.service.js';
import { DecisionStaffReads } from './modules/decisions/staff-read.service.js';
import { DecisionReviewService } from './modules/decisions/decision-review.service.js';
import { LendingDecisionProducers } from './modules/decisions/lending-producers.js';
import { WorkflowDecisionProducer } from './modules/evidence/decision-basis.producer.js';
import type { MemberDomainPorts } from '../../../packages/contracts/src/ports.js';

interface StaffRequest extends Request,MemberRequest { staff?: Awaited<ReturnType<IdentityService['authenticate']>> }
interface PlatformServices { config: Config; identity: IdentityService; staff: StaffService; members: MembersService; applications: ApplicationsService; database: Pool; identityDatabase: Pool; onModuleDestroy(): Promise<void> }
const PLATFORM = Symbol('PLATFORM');
const actor = (request: StaffRequest) => {
  if (!request.staff) throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');
  return request.staff.actor;
};

@Catch()
class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest<StaffRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    let safe = error instanceof ApiError ? error : new ApiError(500,'server_error','The request could not be completed. Use the reference when contacting staff.');
    if (error instanceof ZodError) safe = new ApiError(422,'validation_failed','Check the submitted fields.',error.issues.map(item => ({path: item.path.join('.'),message: item.message})));
    else if (error instanceof HttpException) safe = new ApiError(error.getStatus(),error.getStatus()===404?'not_found':'request_failed',error.getStatus()===404?'This API endpoint is not available.':'The request could not be completed.');
    else if (error && typeof error === 'object' && 'code' in error && error.code === '23505') safe = new ApiError(409,'reference_conflict','The reference cannot be used. Check the record or choose another reference.');
    else if (error && typeof error === 'object' && 'status' in error && error.status === 400) safe = new ApiError(400,'invalid_json','Send a valid JSON object.');
    else if (error && typeof error === 'object' && 'status' in error && error.status === 413) safe = new ApiError(413,'request_too_large','The submitted request exceeds the supported size.');
    if (safe.status >= 500) process.stderr.write(`${JSON.stringify({level:'error',code:safe.code,correlationId:request.correlationId})}\n`);
    response.status(safe.status).json({error:{code:safe.code,message:safe.message,correlationId:request.correlationId ?? randomUUID(),...(safe.fields?{fields:safe.fields}:{})}});
  }
}

@Controller()
class PlatformController {
  constructor(@Inject(PLATFORM) private readonly services: PlatformServices) {}
  @Get('health') async health() { await Promise.all([this.services.database.query('SELECT 1'),this.services.identityDatabase.query('SELECT 1')]); return {status:'ok',contractVersion:CONTRACT_VERSION}; }
  @Get('openapi.json') async openapi() { return JSON.parse(await readFile('packages/contracts/openapi.json','utf8')) as unknown; }
  @Get('capabilities') capabilities() {
    return {contractVersion:CONTRACT_VERSION,modules:[{name:'platform',owner:'Robert',state:'available'},{name:'identity',owner:'Robert',state:'available'},{name:'members',owner:'Robert',state:'available'},{name:'applications',owner:'Robert',state:'available'},{name:'member_portal',owner:'Robert',state:'available'},{name:'evidence',owner:'Aaron',state:this.services.config.EVIDENCE_WORKFLOW_ENABLED?'available':'contract_only'},{name:'credit',owner:'Aaron',state:this.services.config.EVIDENCE_WORKFLOW_ENABLED?'available':'contract_only'},{name:'decisions',owner:'Benedict',state:'contract_only'},{name:'decisions.staff_review',owner:'Benedict',state:this.services.config.CONNECTED_LENDING_ENABLED?'available':'contract_only'},{name:'servicing',owner:'Benedict',state:'contract_only'},{name:'accounting',owner:'Earl',state:'contract_only'},{name:'monitoring',owner:'Earl',state:'contract_only'},{name:'servicing.member_loan_reads',owner:'Benedict',state:'available'},{name:'accounting.principal_reconciliation',owner:'Earl',state:'available'},{name:'monitoring.payment_help',owner:'Earl',state:'available'},{name:'monitoring.follow_ups',owner:'Earl',state:'available'}]};
  }
  @Get('auth/login') async login(@Req() request:StaffRequest,@Res() response: Response) {
    await limitLogin(this.services.identityDatabase,this.services.config.SESSION_SECRET,request.socket.remoteAddress??'unknown');
    const result = await this.services.identity.beginLogin('staff',request.query);
    response.cookie('agap_login',result.cookie,{httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax',path:'/api/v1/auth',maxAge:600_000});
    response.redirect(302,result.url);
  }
  @Get('auth/callback') async callback(@Req() request: StaffRequest,@Res() response: Response) {
    const login = cookieValue(request.headers.cookie,'agap_login');
    const previous = cookieValue(request.headers.cookie,'agap_session',this.services.config.LOCAL_PRESENTATION_MODE);
    response.clearCookie('agap_login',{path:'/api/v1/auth',httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax'});
    const result = await this.services.identity.finishLogin(login,new URL(request.originalUrl,this.services.config.PUBLIC_ORIGIN),previous);
    response.cookie('agap_session',result.token,{httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:this.services.config.SESSION_TTL_SECONDS*1000});
    response.redirect(302,`${this.services.config.PUBLIC_ORIGIN}/#${result.returnTo}`);
  }
  @Post('auth/logout') async logout(@Req() request: StaffRequest,@Res() response: Response) {
    await this.services.identity.logout(cookieValue(request.headers.cookie,'agap_session',this.services.config.LOCAL_PRESENTATION_MODE)!);
    response.clearCookie('agap_session',{path:'/',httpOnly:true,secure:this.services.config.NODE_ENV==='production',sameSite:'lax'});
    response.status(200).json({signedOut:true});
  }
  @Get('session') session(@Req() request: StaffRequest) {
    const current = actor(request);
    return {user:{id:current.userId,displayName:request.staff!.displayName,organizationId:current.organizationId,branchIds:current.branchIds,branches:request.staff!.branches,roles:current.roles},csrfToken:request.staff!.csrfToken,expiresAt:request.staff!.expiresAt,privacyNoticeVersion:this.services.config.PRIVACY_NOTICE_VERSION,contractVersion:CONTRACT_VERSION,recordMode:this.services.config.EVIDENCE_RECORD_MODE};
  }
  @Get('members') listMembers(@Req() request: StaffRequest,@Query() query: unknown) { return this.services.members.list(actor(request),query); }
  @Get('staff') listStaff(@Req() request: StaffRequest,@Query() query: unknown) { return this.services.staff.list(actor(request),query); }
  @Post('staff/:id/revocations') revokeStaff(@Req() request: StaffRequest,@Param('id') id: string,@Body() body: unknown) { return this.services.staff.revoke(actor(request),id,body,expectedVersion(request.headers['if-match']),request.headers['idempotency-key']); }
  @Get('members/:id') member(@Req() request: StaffRequest,@Param('id') id: string) { return this.services.members.get(actor(request),id); }
  @Post('members') createMember(@Req() request: StaffRequest,@Body() body: unknown) { return this.services.members.create(actor(request),body,request.headers['idempotency-key']); }
  @Patch('members/:id') updateMember(@Req() request: StaffRequest,@Param('id') id: string,@Body() body: unknown) { return this.services.members.update(actor(request),id,body,expectedVersion(request.headers['if-match']),request.headers['idempotency-key']); }
  @Get('applications') listApplications(@Req() request: StaffRequest,@Query() query: unknown) { return this.services.applications.list(actor(request),query); }
  @Get('applications/:id') application(@Req() request: StaffRequest,@Param('id') id: string) { return this.services.applications.get(actor(request),id); }
  @Post('applications') createApplication(@Req() request: StaffRequest,@Body() body: unknown) { return this.services.applications.create(actor(request),body,request.headers['idempotency-key']); }
  @Patch('applications/:id') updateApplication(@Req() request: StaffRequest,@Param('id') id: string,@Body() body: unknown) { return this.services.applications.update(actor(request),id,body,expectedVersion(request.headers['if-match']),request.headers['idempotency-key']); }
  @Post('applications/:id/assignments') assignApplication(@Req() request:StaffRequest,@Param('id') id:string,@Body() body:unknown){return this.services.applications.assign(actor(request),id,body,expectedVersion(request.headers['if-match']),request.headers['idempotency-key']);}
}

export async function createApp(config: Config,memberDomains?:MemberDomainPorts) {
  assertLocalPresentation(config);
  assertConnectedLending(config);
  if(config.EVIDENCE_RECORD_MODE==='real'){if(config.NODE_ENV!=='production')throw new Error('Real records require production and institutional release.');await requireRelease(process.env);}
  const database = createPool(config.DATABASE_URL);
  const identityDatabase = createPool(config.IDENTITY_DATABASE_URL);
  try {
    for (const pool of [database,identityDatabase]) {
      const result = await pool.query<{rolsuper:boolean;rolbypassrls:boolean}>("SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user");
      if (result.rows[0].rolsuper || result.rows[0].rolbypassrls) throw new Error('API database credentials must not be superuser or BYPASSRLS roles.');
      const owned=await pool.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('platform','identity','members','applications','portal','evidence','credit','decisions','servicing','accounting','monitoring') AND c.relkind IN ('r','p') AND pg_has_role(current_user,c.relowner,'MEMBER') LIMIT 1");
      if(owned.rowCount)throw new Error('API database credentials must not own application tables or inherit their owner role.');
    }
    const guarded={lendingGuard:config.CONNECTED_LENDING_ENABLED};
    const uow = new PostgresUnitOfWork(database,guarded);
    const memberUow=new PostgresMemberUnitOfWork(database,guarded);
    const reconciliations = new ReconciliationService(new PostgresUnitOfWork(database,{isolation:'repeatable read'}),new LoanReads(uow));
    const workflow=config.EVIDENCE_WORKFLOW_ENABLED?await configureWorkflow(config,uow,memberUow):null;
    const members = new MembersService(uow,config.PRIVACY_NOTICE_VERSION);
    const identity = new IdentityService(identityDatabase,config);
    const services: PlatformServices = {config,database,identityDatabase,identity,staff:new StaffService(new PostgresUnitOfWork(identityDatabase,guarded)),members,applications:new ApplicationsService(uow,members),async onModuleDestroy(){await Promise.all([database.end(),identityDatabase.end()]);}};
    const producers=config.CONNECTED_LENDING_ENABLED&&workflow?new LendingDecisionProducers(new WorkflowDecisionProducer(workflow.workflow),true):null;
    const decisionServices:DecisionServices|null=producers?{reads:new DecisionStaffReads(uow,producers),commands:new DecisionsService(uow,producers),reviews:new DecisionReviewService(uow,producers)}:null;
    const loanReads=new LoanReads(uow),monitoring=new MonitoringService(uow,loanReads);
    const domains:MemberDomainPorts=memberDomains??{...unavailableMemberDomains,loans:tx=>loanReads.memberLoans(tx),support:tx=>monitoring.memberHistory(tx),supportPage:(tx,query)=>monitoring.memberHistoryPage(tx,query),requestSupport:(tx,data,key)=>monitoring.submit(tx,data,key)};
    const portal=new MemberPortalService(memberUow,new MemberApplicationsService(memberUow,config.PRIVACY_NOTICE_VERSION),config.PRIVACY_NOTICE_VERSION,domains);
    @Module({controllers:[DecisionsController,PlatformController,MemberController,WorkflowController,ReconciliationController,MonitoringController,SupportFollowUpController],providers:[{provide:DECISIONS,useValue:decisionServices},{provide:MONITORING,useValue:monitoring},{provide:RECONCILIATIONS,useValue:reconciliations},{provide:WORKFLOW,useValue:workflow},{provide:PLATFORM,useValue:services},{provide:MEMBER_PLATFORM,useValue:{config,identity,identityDatabase,portal,workflow}}]})
    class AppModule {}
    const app = await NestFactory.create<NestExpressApplication>(AppModule,{logger:false,bodyParser:false,abortOnError:false});
    app.set('trust proxy',false);
    app.use((request: StaffRequest,response: Response,next: NextFunction) => {request.correlationId=randomUUID();response.setHeader('X-Request-ID',request.correlationId);response.setHeader('Cache-Control','no-store');next();});
    app.use(helmet());
    app.useBodyParser('json',{limit:'32kb',strict:true});
    const publicPaths = new Set(['/api/v1/health','/api/v1/capabilities','/api/v1/openapi.json','/api/v1/auth/login','/api/v1/auth/callback','/api/v1/member/auth/login','/api/v1/member/auth/callback']);
    const errors = new ErrorFilter();
    app.use(async (request: StaffRequest,response: Response,next: NextFunction) => {
      try {
        if (!publicPaths.has(request.path)) {
          const isMember=request.path.startsWith('/api/v1/member/');
          const cookieName=isMember?'agap_member_session':'agap_session';
          let token = cookieValue(request.headers.cookie,cookieName,config.LOCAL_PRESENTATION_MODE);
          const sessionRead=request.method==='GET'&&request.path===(isMember?'/api/v1/member/session':'/api/v1/session');
          if(config.LOCAL_PRESENTATION_MODE&&sessionRead){
            response.setHeader('X-AGAP-Presentation','true');
            if(request.headers.host!==new URL(config.PUBLIC_ORIGIN).host||request.headers.origin&&request.headers.origin!==config.PUBLIC_ORIGIN||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(request.socket.remoteAddress??''))throw new ApiError(403,'presentation_origin_required','Open the local presentation address.');
          }
          const authenticate=async()=>{if(isMember)request.member=await identity.authenticateMember(token,request.correlationId);else request.staff=await identity.authenticate(token,request.correlationId);};
          try{await authenticate();}catch(error){
            if(!(config.LOCAL_PRESENTATION_MODE&&sessionRead&&error instanceof ApiError&&error.status===401))throw error;
            await limitLogin(identityDatabase,config.SESSION_SECRET,request.socket.remoteAddress??'unknown');
            token=await createPresentationSession(identityDatabase,config,isMember?'member':'staff');
            await authenticate();
            response.cookie(cookieName,token,{httpOnly:true,secure:false,sameSite:'lax',path:isMember?'/api/v1/member':'/',maxAge:config.SESSION_TTL_SECONDS*1000});
          }
          if (!['GET','HEAD','OPTIONS'].includes(request.method)) identity.verifyCsrf(token!,request.headers['x-csrf-token'],request.headers.origin);
        }
        const pending = operations.find(op => !op.implemented && op.method === request.method && new RegExp(`^/api/v1${op.path.replace(/\{\w+\}/g,'[^/]+')}$`).test(request.path));
        if (pending) throw new ApiError(501,'module_not_available',`This operation is defined for ${pending.owner}'s module and has not been implemented.`);
        next();
      } catch (error) {
        // Middleware errors must use the same public shape as controller errors.
        const safe = error instanceof ApiError ? error : new ApiError(503,'identity_unavailable','The sign-in service is temporarily unavailable.');
        response.status(safe.status).json({error:{code:safe.code,message:safe.message,correlationId:request.correlationId}});
      }
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(errors);
    if(config.NODE_ENV!=='test')app.enableShutdownHooks();
    await app.init();
    return app;
  } catch (error) { await Promise.all([database.end(),identityDatabase.end()]); throw error; }
}
