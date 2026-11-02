import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { WorkflowFinding } from '../../../../../packages/contracts/src/workflow.js';
import { ModelArtifactSchema } from '../../../../../packages/contracts/src/schemas.js';
export const Finding = WorkflowFinding;
export interface ExtractionAdapter {
  readonly provenance: z.output<typeof ModelArtifactSchema>;
  readonly origin: 'model'|'simulated';
  extract(pages: { page: number; text: string }[], signal?: AbortSignal): Promise<z.output<typeof Finding>[]>;
}
export class QwenAdapter implements ExtractionAdapter {
  readonly origin = 'model' as const;
  private constructor(private readonly endpoint: string, private readonly token: string, readonly provenance: z.output<typeof ModelArtifactSchema>) {}
  static async configured(env: NodeJS.ProcessEnv, production: boolean, realRecords = production) {
    if (!env.QWEN_ENDPOINT || !env.QWEN_SERVICE_TOKEN || !env.QWEN_RELEASE_FILE || !env.QWEN_RELEASE_SHA256) return null;
    const endpoint = new URL(env.QWEN_ENDPOINT);
    if (endpoint.protocol !== 'https:' && !( !production && endpoint.protocol === 'http:' && ['127.0.0.1','localhost'].includes(endpoint.hostname))) throw new Error('Qwen requires HTTPS or an explicit loopback development endpoint.');
    if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash || env.QWEN_SERVICE_TOKEN.length < 32) throw new Error('Invalid private inference configuration.');
    const bytes = await readFile(env.QWEN_RELEASE_FILE);
    if (createHash('sha256').update(bytes).digest('hex') !== env.QWEN_RELEASE_SHA256) throw new Error('Model release checksum mismatch.');
    const release = z.strictObject({ approved: z.literal(true), independentReviewReference: z.string().min(1), realRecordsApproved: z.boolean(), artifact: ModelArtifactSchema }).parse(JSON.parse(bytes.toString()));
    if (realRecords && !release.realRecordsApproved) throw new Error('Model is not approved for real records.');
    if (/simulat|not-independent|not-promoted|public-development/i.test(release.artifact.evaluationReference)) throw new Error('A development preview is not an accepted model release.');
    const baseline=JSON.parse(await readFile('models/qwen/model_manifest.json','utf8')) as {base_repository:string;base_revision:string};
    if(release.artifact.artifactSha256!==null||release.artifact.baseModel!==baseline.base_repository||release.artifact.baseRevision!==baseline.base_revision)throw new Error('Only the pinned pretrained baseline is eligible; tuned artifacts need a separate reviewed release.');
    return new QwenAdapter(endpoint.href, env.QWEN_SERVICE_TOKEN, release.artifact);
  }
  async extract(pages: { page: number; text: string }[], signal?: AbortSignal) {
    const results: z.output<typeof Finding>[] = [];
    // Each exact page chunk has its own token budget. Nothing is silently dropped.
    if(pages.reduce((n,p)=>n+Math.ceil(p.text.length/2000),0)>32)throw new Error('Document exceeds reviewed model processing budget.');
    let chunks = 0;
    for (const page of pages) for (let offset = 0; offset < page.text.length; offset += 2000) {
      if (++chunks > 32) throw new Error('Document exceeds reviewed model processing budget.');
      const text = page.text.slice(offset, offset + 2000);
      const response = await fetch(new URL('extract', this.endpoint.endsWith('/') ? this.endpoint : this.endpoint + '/'), {
        method: 'POST', redirect: 'error', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${this.token}` },
        body: JSON.stringify({ page: page.page, text, provenance: this.provenance }), signal: AbortSignal.any([AbortSignal.timeout(120000), ...(signal ? [signal] : [])]),
      });
      if (!response.ok) throw new Error('Private inference unavailable.');
      const reader=response.body?.getReader();if(!reader)throw new Error('Empty model response.');let size=0;const parts:Uint8Array[]=[];try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>100000)throw new Error('Model response exceeds budget.');parts.push(part.value);}}finally{await reader.cancel();}const raw=Buffer.concat(parts).toString('utf8');
      const findings = z.array(Finding).max(30).parse(JSON.parse(raw));
      for (const finding of findings) {
        if (finding.page !== page.page || !text.includes(finding.excerpt) || finding.fact.factId || finding.fact.sourceId || finding.fact.sourceVersion || finding.fact.statement) throw new Error('Unsupported model source reference.');
        // Money and dates must occur literally in cited text. Model arithmetic is not accepted.
        if(finding.fact.basis==='net'&&!/\bnet\b|\btake[ -]home\b/i.test(finding.excerpt))throw new Error('Net basis lacks explicit support.');
        if(finding.fact.basis==='gross'&&!/\bgross\b/i.test(finding.excerpt))throw new Error('Gross basis lacks explicit support.');
        const value = finding.fact.value;
        if (value.availability === 'recorded') {
          const amount = `${Math.trunc(value.amountCentavos / 100)}.${String(value.amountCentavos % 100).padStart(2,'0')}`;
          const normalized = finding.excerpt.replaceAll(',','');
          if (!new RegExp(`(?:^|[^0-9.])${amount.replace('.', '\\.')}([^.0-9]|$)`).test(normalized) && !(value.amountCentavos % 100 === 0 && new RegExp(`(?:^|[^0-9.])${Math.trunc(value.amountCentavos / 100)}(?:[^0-9.]|$)`).test(normalized))) throw new Error('Model amount is absent from its citation.');
        }
        if ([finding.fact.effectiveDate,finding.fact.coverageStart,finding.fact.coverageEnd].some(date=>date!==null&&!finding.excerpt.includes(date))) throw new Error('Model date lacks exact support.');
        if (finding.fact.cashDates.some(date => !finding.excerpt.includes(date))) throw new Error('Model cash date lacks exact support.');
        results.push(finding);
      }
    }
    return results;
  }
}
