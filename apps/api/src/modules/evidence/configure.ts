import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { UnitOfWork,MemberUnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import type { Config } from '../../platform/config.js';
import { PrivateDocumentStore } from '../../platform/document-store.js';
import { AzureDocumentStore } from '../../platform/azure-document-store.js';
import { QwenAdapter } from '../ai/qwen-adapter.js';
import { WorkflowService } from './workflow.service.js';
import { DocumentsService } from './documents.service.js';
/** No default retention, release attestation or institutional financial rules. */
export async function documentStore(env:NodeJS.ProcessEnv,production:boolean){
 if(production&&!env.AZURE_BLOB_ACCOUNT_URL)throw new Error('Production evidence requires private Azure Blob storage.');
 if(env.AZURE_BLOB_ACCOUNT_URL){if(!env.AZURE_BLOB_CONTAINER)throw new Error('Choose a separate private environment container.');return new AzureDocumentStore(env.AZURE_BLOB_ACCOUNT_URL,env.AZURE_BLOB_CONTAINER);}
 if(!env.DOCUMENT_DIRECTORY)throw new Error('Set an explicit private fictional document directory.');
 const store=new PrivateDocumentStore(env.DOCUMENT_DIRECTORY);await store.initialize();return store;
}
export async function requireRelease(env:NodeJS.ProcessEnv){
 if(!env.AGAP_RELEASE_FILE||!env.AGAP_RELEASE_SHA256)throw new Error('Production evidence is disabled until the institutional release record is supplied.');
 const bytes=await readFile(env.AGAP_RELEASE_FILE);
 if(createHash('sha256').update(bytes).digest('hex')!==env.AGAP_RELEASE_SHA256)throw new Error('Release record checksum mismatch.');
 z.strictObject({environment:z.literal('production'),realRecordsApproved:z.literal(true),hostingEligibility:z.string().min(1),budgetApproval:z.string().min(1),policyApproval:z.string().min(1),privacyRetentionApproval:z.string().min(1),accessReview:z.string().min(1),backupRestoreEvidence:z.string().min(1),rollbackEvidence:z.string().min(1),responsibleUserAcceptance:z.string().min(1),approvedBy:z.string().min(1),approvedAt:z.iso.datetime()}).parse(JSON.parse(bytes.toString()));
}
export async function configureWorkflow(config:Config,uow:UnitOfWork,memberUow:MemberUnitOfWork){
 const production=config.NODE_ENV==='production',real=config.EVIDENCE_RECORD_MODE==='real';if(real){if(!production)throw new Error('Real records require a production server and institutional release.');await requireRelease(process.env);}
 const store=await documentStore(process.env,production),ai=await QwenAdapter.configured(process.env,production,real);
 const workflow=new WorkflowService(uow,memberUow,!!ai,!real);
 return {workflow,ai,documents:new DocumentsService(workflow,store)};
}
