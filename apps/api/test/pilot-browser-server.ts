/** Real API/DB browser harness. Session fixtures stand in for OIDC, not for lending services. */
import { mkdtemp,mkdir,writeFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createApp } from '../src/app.js';
import { config,prepareDatabase,closePools } from './database.js';
import { createPilotFixture } from './pilot-fixture.js';

if(process.env.AGAP_TEST_DATABASE_URL?.includes(':55433/'))throw new Error('Use the separate fictional pilot browser database.');
await prepareDatabase();
const fixture=await createPilotFixture(),directory=await mkdtemp(join(tmpdir(),'agap-pilot-browser-'));
process.env.DOCUMENT_DIRECTORY=directory;
const webPort=Number(process.env.AGAP_E2E_WEB_PORT??5174),apiPort=Number(process.env.AGAP_PILOT_TEST_API_PORT??4114);
const app=await createApp({...config,PUBLIC_ORIGIN:`http://127.0.0.1:${webPort}`,API_PORT:apiPort,FICTIONAL_PILOT_ENABLED:true,EVIDENCE_WORKFLOW_ENABLED:true});
await mkdir('.platform-test',{recursive:true});
await writeFile('.platform-test/pilot-browser.json',JSON.stringify({applicationId:fixture.application.id,officer:fixture.f.officer.token,reviewer:fixture.reviewer.token,cashier:fixture.cashier.token,authorizer:fixture.authorizer.token,member:fixture.member.token}),{mode:0o600});
await app.listen(apiPort,'127.0.0.1');
process.stdout.write('Fictional pilot browser API ready; no real model or OIDC execution asserted.\n');
let stopping=false;
const stop=async()=>{if(stopping)return;stopping=true;await app.close();await closePools();await rm(directory,{recursive:true,force:true});process.exit(0);};
process.once('SIGTERM',()=>void stop());process.once('SIGINT',()=>void stop());
