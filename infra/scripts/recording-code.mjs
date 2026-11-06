/** Print only a short-lived code from the private local recording authenticator. */
import {readFile,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {createHmac} from 'node:crypto';
const path=process.env.AGAP_RECORDING_MANIFEST??`${homedir()}/.cache/agap-recording/credentials.json`,selector=process.argv[2];
if(!['maya','leo','officer'].includes(selector)||((await lstat(path)).mode&0o077)!==0)throw new Error('Use recording:code -- maya, leo or officer with the private 0600 manifest.');
const manifest=JSON.parse(await readFile(path,'utf8'));if(manifest.format!=='agap-recording-private-v1'||manifest.origin!=='http://127.0.0.1:5186')throw new Error('Unexpected recording manifest.');
const account=manifest.accounts.find(a=>selector==='officer'?a.roles?.includes('officer'):a.email.startsWith(selector+'.'));if(!account?.otpSecret)throw new Error('Enroll the recording authenticator before obtaining a code.');
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',bits=account.otpSecret.toUpperCase().replace(/[\s=]/g,'').split('').map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join(''),bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;console.log(String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0'));
