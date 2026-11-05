import { randomUUID } from 'node:crypto';
import { WorkflowDraft } from '../../../packages/contracts/src/workflow.js';
import { owner } from './database.js';
/** Simulated source/model output for tests only. No live model or document-authenticity claim. */
export async function guidanceFixture(organizationId:string,applicationId:string){
 const sourceId=randomUUID(),textVersionId=randomUUID(),excerpt='FICTIONAL school cost PHP 500.00. This is one payment. Future payment date is not known.';
 await owner.query("INSERT INTO evidence.sources(id,organization_id,application_id,kind,label,source_date,object_key,sha256,media_type,size) VALUES($1,$2,$3,'document','Fictional school record','2026-11-01',$4,$5,'application/pdf',100)",[sourceId,organizationId,applicationId,randomUUID(),'a'.repeat(64)]);
 await owner.query('INSERT INTO evidence.text_versions(id,organization_id,application_id,source_id,source_version,sha256,object_key,size,page_count) VALUES($1,$2,$3,$4,1,$5,$6,100,1)',[textVersionId,organizationId,applicationId,sourceId,'b'.repeat(64),randomUUID()]);
 await owner.query("INSERT INTO evidence.processing(organization_id,source_id,application_id,state,stage,pages,text_sha256,text_version_id) VALUES($1,$2,$3,'cleared','available',$4,$5,$6)",[organizationId,sourceId,applicationId,JSON.stringify([{page:1,text:excerpt}]),'b'.repeat(64),textVersionId]);
 const draft=WorkflowDraft.parse({id:randomUUID(),textVersionId,origin:'simulated',source:{sourceId,sourceVersion:1,page:1,excerpt},suggestion:{factId:null,relevance:'included',label:'Fictional school cost',category:'expense',value:{availability:'recorded',amountCentavos:50000},sourceId,sourceVersion:1,statement:null,effectiveDate:null,coverageStart:null,coverageEnd:null,cashDates:[],period:'one_time',basis:'unknown',deduction:'unknown',reason:'Simulated source output; the member must confirm relevance and dates.'},provenance:{baseModel:'simulated-test-only',baseRevision:'a'.repeat(40),artifactSha256:null,promptVersion:'test-only',schemaVersion:'test-only',datasetManifestSha256:null,evaluationReference:'simulated-not-model-evaluation'},state:'suggested'});
 await owner.query('INSERT INTO evidence.drafts(id,organization_id,application_id,source_id,body,text_sha256) VALUES($1,$2,$3,$4,$5,$6)',[draft.id,organizationId,applicationId,sourceId,JSON.stringify(draft),'b'.repeat(64)]);
 return draft;
}
