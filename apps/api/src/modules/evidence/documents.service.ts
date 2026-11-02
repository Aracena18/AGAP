import { createHash, randomUUID } from 'node:crypto';
import type { DocumentStorePort } from '../../../../../packages/contracts/src/ports.js';
import { MemberUploadSchema } from '../../../../../packages/contracts/src/schemas.js';
import { canonical } from '../../platform/commands.js';
import { recordEvent } from '../../platform/commands.js';
import { memberEvent } from '../../platform/member-commands.js';
import type { TransactionContext,MemberTransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { memberKey } from '../../platform/member-commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { WorkflowService, type WorkflowActor } from './workflow.service.js';

export function detectedType(bytes: Uint8Array): string | null {
  const b = Buffer.from(bytes);
  if (b.subarray(0,5).toString() === '%PDF-') return 'application/pdf';
  if (b.length >= 8 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return 'image/jpeg';
  return null;
}
export class DocumentsService {
  constructor(private readonly workflow: WorkflowService, private readonly store: DocumentStorePort) {}
  async upload(actor: WorkflowActor, id: string, metadata: unknown, stream: AsyncIterable<Uint8Array>, rawKey: unknown) {
    const data = MemberUploadSchema.parse(metadata), key = memberKey(rawKey);
    if (/[/\\]/.test(data.fileName)||[...data.fileName].some(c=>c.charCodeAt(0)<32)) throw new ApiError(422, 'invalid_file_name', 'Choose a file name without folder paths or control characters.');
    // Resource authorization precedes body consumption and is rechecked through each transaction.
    await this.workflow.run(actor, async tx => {
      const a = await this.workflow.access(tx, id);
      if (!('kind' in actor) && (!actor.roles.includes('officer') || a.assigned_officer_id !== actor.userId)) throw new ApiError(403, 'assignment_required', 'Only the assigned officer may upload assisted evidence.');
    });
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of stream) { size += chunk.byteLength; if (size > data.size || size > 10*1024*1024) throw new ApiError(413,'request_too_large','Choose a document no larger than 10 MB.'); chunks.push(Buffer.from(chunk)); }
    if (size !== data.size) throw new ApiError(422,'upload_size_mismatch','The complete document was not received.');
    const bytes = Buffer.concat(chunks), digest = createHash('sha256').update(bytes).digest('hex');
    if (detectedType(bytes) !== data.mediaType) throw new ApiError(422,'document_type_mismatch','The document content does not match its supported file type.');
    const scope = `${'kind' in actor ? actor.linkId : actor.userId}:upload:${id}:${key}`, requestHash = createHash('sha256').update(canonical({ data, digest })).digest('hex');
    const intent = await this.workflow.run(actor, async tx => {
      await this.workflow.access(tx, id);
      await tx.query('INSERT INTO evidence.upload_intents(id,organization_id,application_id,scope,request_hash,object_key,source_id,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(organization_id,scope) DO NOTHING', [randomUUID(), actor.organizationId, id, scope, requestHash, randomUUID(), randomUUID(), JSON.stringify(data)]);
      const row = (await tx.query('SELECT * FROM evidence.upload_intents WHERE organization_id=$1 AND scope=$2',[actor.organizationId, scope])).rows[0];
      if (row.request_hash !== requestHash) throw new ApiError(409,'idempotency_conflict','This upload key was used for different bytes or metadata.');
      return row;
    });
    if (!intent.completed_at) {
      let present = false;
      try {
        const hash = createHash('sha256'); let count = 0;
        for await (const chunk of await this.store.read(String(intent.object_key))) { count += chunk.byteLength; if (count > size) throw new Error('Stored size mismatch'); hash.update(chunk); }
        present = count === size && hash.digest('hex') === digest;
        if (!present) throw new ApiError(503,'document_integrity','Stored upload bytes do not match their reserved identity.');
      } catch (error) { if (error instanceof ApiError) throw error; /* Missing immutable object is written below. */ }
      if (!present) {
        async function* content() { yield bytes; }
        try { const written = await this.store.putQuarantined(content(), data.size, String(intent.object_key)); if (written.sha256 !== digest || written.size !== size) throw new Error('Storage integrity failure'); }
        catch {
          // A concurrent same-key upload may have completed the immutable object.
          const hash = createHash('sha256'); let count = 0;
          for await (const chunk of await this.store.read(String(intent.object_key))) { count += chunk.byteLength; if (count > size) throw new ApiError(503,'document_integrity','Stored upload is unavailable.'); hash.update(chunk); }
          if (count !== size || hash.digest('hex') !== digest) throw new ApiError(503,'document_integrity','Stored upload is unavailable.');
        }
      }
      await this.workflow.run(actor, async tx => {
        await this.workflow.access(tx,id);
        const current = (await tx.query('SELECT completed_at FROM evidence.upload_intents WHERE id=$1 FOR UPDATE', [intent.id])).rows[0];
        if (current.completed_at) return;
        await this.workflow.advance(tx,id,null,'upload');
        await tx.query("INSERT INTO evidence.sources(id,organization_id,application_id,kind,label,source_date,object_key,sha256,media_type,size) VALUES($1,$2,$3,'document',$4,$5,$6,$7,$8,$9)", [intent.source_id,actor.organizationId,id,data.fileName,new Date().toISOString().slice(0,10),intent.object_key,digest,data.mediaType,size]);
        await tx.query("INSERT INTO evidence.processing(organization_id,source_id,application_id,state,stage) VALUES($1,$2,$3,'quarantined','queued')",[actor.organizationId,intent.source_id,id]);
        await tx.query('SELECT evidence.enqueue($1)',[intent.source_id]);
        await tx.query('UPDATE evidence.upload_intents SET completed_at=now() WHERE id=$1',[intent.id]);
      });
    }
    const view = await this.workflow.view(actor,id), source = view.sources.find(s => s.id === intent.source_id);
    if (!source) throw notFound();
    return { id: source.id, version: source.version, fileName: source.label, state: source.state, verification: source.verification };
  }
  async download(actor: WorkflowActor, id: string, sourceId: string) {
    const source = await this.workflow.run(actor, async tx => {
      await this.workflow.access(tx,id);
      const row = (await tx.query("SELECT s.* FROM evidence.sources s JOIN evidence.processing p ON p.source_id=s.id WHERE s.id=$1 AND s.application_id=$2 AND s.kind='document' AND p.state='cleared' AND NOT EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=s.id)",[sourceId,id])).rows[0];
      if (!row) throw notFound(); return row;
    });
    const chunks: Buffer[] = [], hash = createHash('sha256'); let size = 0;
    for await (const chunk of await this.store.read(String(source.object_key))) { size += chunk.byteLength; if (size > Number(source.size)) throw new ApiError(503,'document_integrity','Document integrity could not be checked.'); chunks.push(Buffer.from(chunk)); hash.update(chunk); }
    if (size !== Number(source.size) || hash.digest('hex') !== source.sha256) throw new ApiError(503,'document_integrity','Document integrity could not be checked.');
    // Revocation/linkage is rechecked after storage I/O, before releasing bytes.
    await this.workflow.run(actor, async tx => { const a=await this.workflow.access(tx,id);const permitted=await tx.query("SELECT 1 FROM evidence.processing p WHERE source_id=$1 AND state='cleared' AND NOT EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=p.source_id)",[sourceId]);if(!permitted.rowCount)throw notFound();if('kind' in actor)await memberEvent(tx as MemberTransactionContext,'member.document.download',id,Number(a.version));else await recordEvent(tx as TransactionContext,'evidence.document.download',id,Number(a.version)); });
    return { bytes: Buffer.concat(chunks), mediaType: String(source.media_type), fileName: String(source.label) };
  }
}
