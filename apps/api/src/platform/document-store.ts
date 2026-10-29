import { constants } from 'node:fs';
import { link,lstat,mkdir,open,unlink } from 'node:fs/promises';
import { createHash,randomUUID } from 'node:crypto';
import { resolve,join } from 'node:path';
import type { DocumentStorePort } from '../../../../packages/contracts/src/ports.js';

/** Private bytes only. Evidence owns authorization, scanning, metadata and retention.
 * A successful put remains quarantined; it never means a document is verified.
 * The configured directory and its ancestors must be operator-owned/trusted.
 */
export class PrivateDocumentStore implements DocumentStorePort {
  private readonly root:string;
  constructor(directory:string){this.root=resolve(directory);}
  private path(key:string){
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(key))throw new Error('Invalid private document key.');
    return join(this.root,key);
  }
  async initialize(){
    await mkdir(this.root,{recursive:true,mode:0o700});
    const info=await lstat(this.root);
    if(!info.isDirectory()||info.isSymbolicLink()||(info.mode&0o077)!==0)throw new Error('Private document directory must be a real directory with mode 0700.');
  }
  async putQuarantined(stream:AsyncIterable<Uint8Array>,maxBytes:number){
    if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>100*1024*1024)throw new Error('Invalid upload size limit.');
    await this.initialize();
    const key=randomUUID(),destination=this.path(key),temporary=join(this.root,`.upload-${key}`);
    const file=await open(temporary,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
    let size=0;const hash=createHash('sha256');
    try{
      for await(const chunk of stream){
        if(!(chunk instanceof Uint8Array)||chunk.byteLength>maxBytes-size)throw new Error('Upload exceeds the size limit or contains invalid bytes.');
        size+=chunk.byteLength;hash.update(chunk);
        // write() may write only part of a buffer.
        let offset=0;while(offset<chunk.byteLength){const result=await file.write(chunk,offset,chunk.byteLength-offset);if(result.bytesWritten===0)throw new Error('Private document write failed.');offset+=result.bytesWritten;}
      }
      if(size===0)throw new Error('Empty documents are unavailable.');
      await file.sync();await file.close();
      // Atomic publication without replacing an existing immutable version.
      await link(temporary,destination);
      const directory=await open(this.root,constants.O_RDONLY);try{await directory.sync();}finally{await directory.close();}
      return {key,size,sha256:hash.digest('hex')};
    }finally{await file.close().catch(()=>undefined);await unlink(temporary).catch(()=>undefined);}
  }
  async read(key:string){
    await this.initialize();
    const file=await open(this.path(key),constants.O_RDONLY|constants.O_NOFOLLOW);
    try{if(!(await file.stat()).isFile())throw new Error('Document is unavailable.');return file.createReadStream({autoClose:true}) as AsyncIterable<Uint8Array>;}
    catch(error){await file.close();throw error;}
  }
  /** Caller must first enforce an approved retention/hold decision and audit it. */
  async remove(key:string){await this.initialize();await unlink(this.path(key));}
}
