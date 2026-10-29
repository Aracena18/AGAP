import { createServer } from 'node:http';
import { createHash,generateKeyPairSync,randomUUID,sign } from 'node:crypto';
import type { AddressInfo } from 'node:net';

/** Protocol fixture only: validates PKCE/client credentials and signs actual test ID tokens. */
export async function startIdentityFixture(){
  const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const wrongKey=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey;
  const codes=new Map<string,{nonce:string;challenge:string;redirect:string;clientId:string;acr:string}>();
  const behavior:{subject:string;badNonce:boolean;badSignature:boolean;badIssuer:boolean;missingSubject:boolean;missingAuthTime:boolean;oldAuthTime:boolean;acr?:'1'|'2'|null}={subject:randomUUID(),badNonce:false,badSignature:false,badIssuer:false,missingSubject:false,missingAuthTime:false,oldAuthTime:false};
  let issuer='';
  const server=createServer(async(request,response)=>{
    const url=new URL(request.url!,issuer);
    const json=(status:number,value:unknown)=>{response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(value));};
    if(url.pathname==='/.well-known/openid-configuration')return json(200,{issuer,authorization_endpoint:`${issuer}/authorize`,token_endpoint:`${issuer}/token`,jwks_uri:`${issuer}/jwks`,response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post','client_secret_basic'],code_challenge_methods_supported:['S256']});
    if(url.pathname==='/jwks')return json(200,{keys:[{...publicKey.export({format:'jwk'}),kid:'test-key',use:'sig',alg:'RS256'}]});
    if(url.pathname==='/authorize'){
      if(url.searchParams.get('code_challenge_method')!=='S256')return json(400,{error:'invalid_request'});
      const code=randomUUID();
      codes.set(code,{nonce:url.searchParams.get('nonce')!,challenge:url.searchParams.get('code_challenge')!,redirect:url.searchParams.get('redirect_uri')!,clientId:url.searchParams.get('client_id')!,acr:url.searchParams.get('acr_values')??'2'});
      const callback=new URL(url.searchParams.get('redirect_uri')!);callback.searchParams.set('code',code);callback.searchParams.set('state',url.searchParams.get('state')!);
      response.writeHead(302,{Location:callback.href});response.end();return;
    }
    if(url.pathname==='/token'&&request.method==='POST'){
      const chunks:Buffer[]=[];for await(const chunk of request)chunks.push(Buffer.from(chunk));
      const params=new URLSearchParams(Buffer.concat(chunks).toString());
      const basic=request.headers.authorization?.startsWith('Basic ')?Buffer.from(request.headers.authorization.slice(6),'base64').toString():null;
      const clientId=basic?.split(':')[0]??params.get('client_id'),secret=basic?.split(':').slice(1).join(':')??params.get('client_secret');
      if(!((clientId==='agap-staff'&&secret==='fictional-development-client')||(clientId==='agap-local-preview'&&secret==='fictional-preview-development-client')))return json(401,{error:'invalid_client'});
      const code=params.get('code')!;const saved=codes.get(code);codes.delete(code);
      if(!saved||saved.clientId!==clientId||saved.redirect!==params.get('redirect_uri')||createHash('sha256').update(params.get('code_verifier')??'').digest('base64url')!==saved.challenge)return json(400,{error:'invalid_grant'});
      const now=Math.floor(Date.now()/1000);
      const header=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url');
      const body=Buffer.from(JSON.stringify({iss:behavior.badIssuer?'https://wrong-issuer.invalid':issuer,sub:behavior.missingSubject?undefined:behavior.subject,aud:saved.clientId,iat:now,exp:now+300,auth_time:behavior.missingAuthTime?undefined:behavior.oldAuthTime?now-1200:now,nonce:behavior.badNonce?'wrong-nonce':saved.nonce,acr:behavior.acr===null?undefined:behavior.acr??saved.acr,roles:['administrator'],organizationId:randomUUID()})).toString('base64url');
      const signingInput=`${header}.${body}`;
      const signature=sign('RSA-SHA256',Buffer.from(signingInput),behavior.badSignature?wrongKey:privateKey).toString('base64url');
      return json(200,{token_type:'Bearer',access_token:randomUUID(),expires_in:300,id_token:`${signingInput}.${signature}`});
    }
    json(404,{error:'not_found'});
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  issuer=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {issuer,behavior,close:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
