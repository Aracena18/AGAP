import {z} from 'zod';
import {CalendarDay,Id,Text} from './common.js';
import {PilotMoneyApplication,PilotMoneyApplicationQuery,PilotLoanWorkspace,PilotLoanView,PilotMoneyCommand,PilotPostedResult} from './lifecycle.js';

export const ConnectedFinancialApplication=PilotMoneyApplication;
export const ConnectedFinancialApplicationQuery=PilotMoneyApplicationQuery;
export const ConnectedFinancialApplicationPage=z.strictObject({items:z.array(ConnectedFinancialApplication).max(100),nextCursor:Id.nullable()});
const ConnectedLoanCommand=PilotMoneyCommand.extend({preparedBy:Id,reviewRequired:z.boolean()});
export const ConnectedLoanWorkspace=PilotLoanWorkspace.extend({commands:z.array(ConnectedLoanCommand),position:PilotLoanView.extend({commands:z.array(ConnectedLoanCommand)}).nullable()});
export const ConnectedLoanQuery=z.strictObject({asOfDate:CalendarDay});
export const ConnectedFinancialAction=z.strictObject({reason:Text});
export const ConnectedSimulationObservation=ConnectedFinancialAction.extend({outcome:z.enum(['confirmed','failed','unknown'])});
export const ConnectedPostedResult=PilotPostedResult;
export const connectedMoneySchemas={ConnectedFinancialApplication,ConnectedFinancialApplicationQuery,ConnectedFinancialApplicationPage,ConnectedLoanWorkspace,ConnectedLoanQuery,ConnectedFinancialAction,ConnectedSimulationObservation,ConnectedPostedResult};

export const connectedMoneyOperations=[
 {id:'getConnectedFinancialApplications',method:'GET',path:'/financial-applications',response:'ConnectedFinancialApplicationPage',querySchema:'ConnectedFinancialApplicationQuery',queryArgument:true,owner:'Benedict',implemented:true},
 {id:'getConnectedFinancialApplication',method:'GET',path:'/applications/{id}/financial-workspace',response:'ConnectedFinancialApplication',owner:'Benedict',implemented:true},
 {id:'getConnectedLoanWorkspace',method:'GET',path:'/loans/{id}/workspace',response:'ConnectedLoanWorkspace',querySchema:'ConnectedLoanQuery',queryArgument:true,owner:'Benedict',implemented:true},
 {id:'prepareConnectedDisbursement',method:'POST',path:'/loans/{id}/disbursements',request:'FinancialCommandCreate',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true},
 {id:'prepareConnectedRepayment',method:'POST',path:'/loans/{id}/repayments',request:'FinancialCommandCreate',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true},
 {id:'getConnectedFinancialCommand',method:'GET',path:'/financial-commands/{id}',response:'FinancialCommand',owner:'Benedict',implemented:true},
 {id:'authorizeConnectedFinancialCommand',method:'POST',path:'/financial-commands/{id}/authorizations',request:'ConnectedFinancialAction',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true,versioned:true},
 {id:'submitConnectedFinancialCommand',method:'POST',path:'/financial-commands/{id}/submissions',request:'ConnectedFinancialAction',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true,versioned:true},
 {id:'observeConnectedSimulation',method:'POST',path:'/financial-commands/{id}/simulation-observations',request:'ConnectedSimulationObservation',response:'FinancialCommand',owner:'Benedict',implemented:true,idempotent:true,versioned:true},
 {id:'postConnectedFinancialCommand',method:'POST',path:'/financial-commands/{id}/postings',request:'ConnectedFinancialAction',response:'ConnectedPostedResult',owner:'Benedict',implemented:true,idempotent:true,versioned:true},
] as const;
