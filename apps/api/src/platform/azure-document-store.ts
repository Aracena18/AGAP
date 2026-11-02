import { createHash, randomUUID } from 'node:crypto';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import type { DocumentStorePort } from '../../../../packages/contracts/src/ports.js';
/** Containers are provisioned private by infrastructure; this adapter never grants public access or SAS URLs. */
export class AzureDocumentStore implements DocumentStorePort {
  private readonly container;
  constructor(accountUrl: string, container: string) {
    const url = new URL(accountUrl);
    if (url.protocol !== 'https:' || !/^[a-z0-9]+\.blob\.core\.windows\.net$/.test(url.hostname) || url.username || url.password || url.search) throw new Error('Use an exact Azure Blob account HTTPS URL.');
    this.container = new BlobServiceClient(url.origin, new DefaultAzureCredential()).getContainerClient(container);
  }
  private blob(key: string) { if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Invalid document key.'); return this.container.getBlockBlobClient(key); }
  async putQuarantined(stream: AsyncIterable<Uint8Array>, maxBytes: number, reservedKey = randomUUID()) {
    const properties = await this.container.getProperties();
    if (properties.blobPublicAccess) throw new Error('Document container must be private.');
    const hash = createHash('sha256'); let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) { size += chunk.byteLength; if (size > maxBytes) throw new Error('Upload exceeds size limit.'); hash.update(chunk); chunks.push(Buffer.from(chunk)); }
    if (!size) throw new Error('Empty document.');
    await this.blob(reservedKey).uploadData(Buffer.concat(chunks), { conditions: { ifNoneMatch: '*' }, blobHTTPHeaders: { blobContentType: 'application/octet-stream', blobCacheControl: 'no-store' } });
    return { key: reservedKey, size, sha256: hash.digest('hex') };
  }
  async read(key: string) { if((await this.container.getProperties()).blobPublicAccess)throw new Error('Document container must be private.'); const result = await this.blob(key).download(); if (!result.readableStreamBody) throw new Error('Document unavailable.'); return result.readableStreamBody as AsyncIterable<Uint8Array>; }
  async remove(key: string) { await this.blob(key).deleteIfExists(); }
}
