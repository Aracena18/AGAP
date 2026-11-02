import { createConnection } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const exec = promisify(execFile);
export interface Scanner { scan(bytes: Uint8Array): Promise<'clean'|'blocked'> }
export interface TextExtractor { extract(bytes: Uint8Array, mediaType: string): Promise<{ page: number; text: string }[]> }
export class ClamScanner implements Scanner {
  constructor(private readonly host: string, private readonly port = 3310) {}
  private request(parts: Uint8Array[]) {
    return new Promise<string>((resolve, reject) => {
      const socket = createConnection({host:this.host,port:this.port}); let result = '';
      socket.setTimeout(30000,()=>socket.destroy(new Error('Scanner timed out.')));
      socket.on('error',reject); socket.on('data',chunk=>{result += chunk.toString();if(result.length>4096)socket.destroy(new Error('Invalid scanner response.'));if(result.includes('\0')){socket.end();resolve(result);}});
      socket.on('end',()=>{if(!result.includes('\0'))reject(new Error('Incomplete scanner response.'));});
      socket.on('connect',()=>{for(const part of parts)socket.write(part);});
    });
  }
  async scan(bytes: Uint8Array) {
    const version = await this.request([Buffer.from('zVERSION\0')]);
    const timestamp = Date.parse(version.split('/').slice(2).join('/').replaceAll('\0','').trim());
    if (!Number.isFinite(timestamp) || Date.now()-timestamp > 48*3600000 || timestamp > Date.now()+3600000) throw new Error('Scanner signatures require an update.');
    const parts = [Buffer.from('zINSTREAM\0')];
    for(let offset=0;offset<bytes.length;offset+=65536){const chunk=bytes.subarray(offset,offset+65536),size=Buffer.alloc(4);size.writeUInt32BE(chunk.length);parts.push(size,Buffer.from(chunk));}
    parts.push(Buffer.alloc(4)); const response = await this.request(parts);
    if (/ FOUND\0$/.test(response)) return 'blocked';
    if (!/^stream: OK\0$/.test(response)) throw new Error('File inspection was not completed.');
    return 'clean';
  }
}
export class NativeTextExtractor implements TextExtractor {
  async extract(bytes: Uint8Array, mediaType: string) {
    const directory = await mkdtemp(join(tmpdir(),'agap-evidence-')), path=join(directory,'source');
    const options = {timeout:30000,maxBuffer:1024*1024,env:{PATH:process.env.PATH,LANG:'C.UTF-8'},cwd:directory};
    try {
      await writeFile(path,bytes,{mode:0o600});
      if(mediaType==='application/pdf'){
        const {stdout:info}=await exec('pdfinfo',[path],options);
        if(/Encrypted:\s+yes/i.test(info))throw new Error('Encrypted documents require a supported alternative.');
        const count=Number(/Pages:\s+(\d+)/.exec(info)?.[1]);if(!count||count>20)throw new Error('Choose a PDF of at most 20 pages.');
        const {stdout}=await exec('pdftotext',['-layout','-enc','UTF-8',path,'-'],options),texts=stdout.split('\f');
        const pages=[];
        for(let i=0;i<count;i++){
          let text=texts[i]?.trim()??'';
          if(!text){const prefix=join(directory,`page-${i+1}`);await exec('pdftoppm',['-f',String(i+1),'-l',String(i+1),'-singlefile','-scale-to','2400','-png',path,prefix],options);text=(await exec('tesseract',[prefix+'.png','stdout','-l','eng'],options)).stdout.trim();}
          if(text.length>100000)throw new Error('Unreadable or over-budget page. Use manual entry.');pages.push({page:i+1,text});
        }
        return pages;
      }
      await exec('python3',['-c',"from PIL import Image; import sys; im=Image.open(sys.argv[1]); assert im.width*im.height<=40000000; im.verify()",path],options);
      const text=(await exec('tesseract',[path,'stdout','-l','eng'],options)).stdout.trim();
      if(text.length>100000)throw new Error('The image needs a clearer copy or manual entry.');
      return [{page:1,text}];
    } finally {await rm(directory,{recursive:true,force:true});}
  }
}
