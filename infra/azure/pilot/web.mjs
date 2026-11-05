import http from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root=await realpath(process.env.AGAP_WEB_ROOT??'dist');
const port=Number(process.env.AGAP_WEB_PORT??5286),apiPort=Number(process.env.AGAP_API_PORT??4100);
if(![port,apiPort].every(n=>Number.isInteger(n)&&n>1024&&n<65536))throw new Error('Choose explicit unprivileged loopback ports.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ico':'image/x-icon'};
http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);res.end('Open the documented loopback tunnel address.');return;}
  if(req.url?.startsWith('/api/')){
    const limit=10*1024*1024;
    if(Number(req.headers['content-length']??0)>limit){res.writeHead(413);res.end();return;}
    let size=0,exceeded=false;
    const upstream=http.request({hostname:'127.0.0.1',port:apiPort,path:req.url,method:req.method,headers:req.headers,timeout:125000},response=>{
      if(exceeded){response.destroy();return;}
      res.writeHead(response.statusCode??502,response.headers);response.pipe(res);
    });
    req.on('data',chunk=>{size+=chunk.length;if(size>limit){exceeded=true;upstream.destroy();if(!res.headersSent)res.writeHead(413);res.end();}});
    upstream.on('timeout',()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(exceeded?413:503);res.end();});
    req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());
    req.pipe(upstream);return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{
    const path=decodeURIComponent(new URL(req.url??'/',`http://127.0.0.1:${port}`).pathname);
    let file=resolve(root,'.'+path);
    if(file!==root&&!file.startsWith(root+sep))throw new Error('path');
    if((await stat(file).catch(()=>null))?.isDirectory())file=resolve(file,'index.html');
    const actual=await realpath(file);if(!actual.startsWith(root+sep))throw new Error('path');
    const bytes=await readFile(actual);res.setHeader('Content-Type',mime[extname(actual)]??'application/octet-stream');
    res.setHeader('Content-Length',bytes.length);res.writeHead(200);res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Page not found.');}
}).listen(port,'127.0.0.1',()=>process.stdout.write(JSON.stringify({component:'pilot-web',state:'ready',port})+'\n'));
