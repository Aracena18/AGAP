import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { main, parseArgs } from '../src/cli.js';
import { ReleaseReviewSchema } from '../src/bundle.js';
import { serialize } from '../src/model.js';
import { developmentPilot } from '../src/pilot.js';
import { buildReviewPack, verifyReviewPack, writeReviewPack } from '../src/review.js';
import { assessReviewReadiness, reviewReadiness, type ReviewWorksheet } from '../src/readiness.js';
const corpus=developmentPilot();
function pending():ReviewWorksheet{return JSON.parse(buildReviewPack(corpus).files['review-worksheet.json']);}
function completed(){const w=pending();w.status='reviewed';w.labelReviewer='Fictional independent test reviewer';w.interfaceReviewer='Fictional interface test reviewer';w.reviewedOn='2026-11-05';for(const c of w.cases){c.rationaleDecision='accepted';for(const f of c.fields)f.decision='accepted';}for(const q of w.questions){q.decision='accepted';q.comment='Fictional test-only evidence reference; no genuine approval.';}return w;}
function alter<T>(items:T[],duplicate:boolean){items.splice(0,1,...(duplicate?[items[1]]:[]));}
const temporary:string[]=[];
afterAll(async()=>{const root=await realpath(tmpdir());for(const folder of temporary){const child=relative(root,await realpath(folder));if(!child.startsWith('agap-readiness-')||isAbsolute(child)||child.startsWith('..'))throw new Error('Unsafe cleanup');await rm(folder,{recursive:true});}});
describe('review declaration readiness',()=>{
 it('retains all pending answers and never claims a release',()=>{const result=assessReviewReadiness(corpus,pending());expect(result).toMatchObject({status:'pending',releaseReady:false,trainingRelease:false,counts:{accepted:0,pending:36,changesRequested:0}});expect(result.issues).toContainEqual({path:'labelReviewer',code:'missing_review_metadata'});});
 it('recognizes complete declarations without creating freeze approval',()=>{const w=completed(),before=serialize(w),result=assessReviewReadiness(corpus,w);expect(result).toMatchObject({status:'declarations_complete',releaseReady:false,promotion:'not_assessed',issues:[]});expect(serialize(w)).toBe(before);expect(ReleaseReviewSchema.safeParse(w).success).toBe(false);});
 it('reports rejected fields and missing evidence even when completion is asserted',()=>{const w=completed();w.cases[0].fields[0].decision='changes_requested';w.questions[0].comment=null;const result=assessReviewReadiness(corpus,w);expect(result.status).toBe('changes_requested');expect(result.issues).toContainEqual({path:'cases/ev-01/gross_income',code:'review_evidence_required'});expect(result.issues).toContainEqual({path:'questions/label_truth',code:'review_evidence_required'});});
 it.each(['cases','fields','questions'] as const)('rejects missing or duplicated %s rather than treating them as reviewed',kind=>{for(const duplicate of [false,true]){const w=completed();if(kind==='cases')alter(w.cases,duplicate);else if(kind==='fields')alter(w.cases[0].fields,duplicate);else alter(w.questions,duplicate);expect(()=>assessReviewReadiness(corpus,w)).toThrow('inventory differs');}});
 it('rejects changed corpus hashes, undeclared approvals and invalid dates',()=>{const w=completed();expect(()=>assessReviewReadiness(corpus,{...w,inputCorpusSha256:'0'.repeat(64)})).toThrow('different corpus');expect(()=>assessReviewReadiness(corpus,{...w,releaseApproval:{approved:true}})).toThrow();expect(()=>assessReviewReadiness(corpus,{...w,reviewedOn:'2026-02-30'})).toThrow();});
 it('verifies immutable source packs and writes a new report through the actual CLI',async()=>{const root=await mkdtemp(join(tmpdir(),'agap-readiness-'));temporary.push(root);const pack=join(root,'pack'),worksheet=join(root,'decisions.json'),out=join(root,'readiness.json');await writeReviewPack(pack,corpus);await writeFile(worksheet,serialize(completed()));await expect(reviewReadiness(pack,join(pack,'review-worksheet.json'))).rejects.toThrow('separate worksheet');const logging=vi.spyOn(console,'log').mockImplementation(()=>{});try{await main(['review-readiness','--pack',pack,'--worksheet',worksheet,'--out',out]);await expect(main(['review-readiness','--pack',pack,'--worksheet',worksheet,'--out',out])).rejects.toMatchObject({code:'EEXIST'});}finally{logging.mockRestore();}expect(JSON.parse(await readFile(out,'utf8')).status).toBe('declarations_complete');await verifyReviewPack(pack);await writeFile(join(pack,'review.md'),'Tampered');await expect(reviewReadiness(pack,worksheet)).rejects.toThrow('differs');});
 it('requires all CLI arguments and rejects unknown options',()=>{expect(()=>parseArgs(['review-readiness','--pack','x'])).toThrow('Missing');expect(()=>parseArgs(['review-readiness','--pack','x','--worksheet','y','--out','z','--approve','yes'])).toThrow('Unknown');});
});
