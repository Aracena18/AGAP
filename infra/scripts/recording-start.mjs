import {spawn} from 'node:child_process';
const env={...process.env,LOCAL_PRESENTATION_MODE:'false',LOCAL_PREVIEW_PASSWORD_ONLY:process.env.LOCAL_PREVIEW_PASSWORD_ONLY??'true',FICTIONAL_PILOT_ENABLED:'true',CONNECTED_LENDING_ENABLED:'false',EVIDENCE_WORKFLOW_ENABLED:'true',EVIDENCE_RECORD_MODE:'fictional',PUBLIC_ORIGIN:'http://127.0.0.1:5186',API_PORT:'4108',AGAP_API_TARGET:'http://127.0.0.1:4108',DOCUMENT_DIRECTORY:process.env.DOCUMENT_DIRECTORY??`${(await import('node:os')).homedir()}/.cache/agap-pilot-runtime/documents`};
const children=[spawn('npm',['run','api:dev'],{env,stdio:'inherit'}),spawn('npm',['run','dev','--','--port','5186','--strictPort'],{env,stdio:'inherit'})];
let stopping=false;function stop(){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
for(const child of children)child.on('exit',code=>{if(!stopping){process.exitCode=code??1;stop();}});
