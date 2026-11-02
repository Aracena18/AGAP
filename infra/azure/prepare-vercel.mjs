// Generates local configuration only; does not deploy, spend or change DNS.
import process from 'node:process';
import { writeFile } from 'node:fs/promises';
const [host]=process.argv.slice(2);
if(!host||!/^[a-z0-9.-]+\.azurecontainerapps\.io$/.test(host))throw new Error('Supply the approved environment API Container Apps hostname.');
await writeFile('vercel.json',JSON.stringify({$schema:'https://openapi.vercel.sh/vercel.json',framework:'vite',buildCommand:'npm run build',outputDirectory:'dist',rewrites:[{source:'/api/:path*',destination:`https://${host}/api/:path*`}],headers:[{source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'CDN-Cache-Control',value:'no-store'},{key:'Vercel-CDN-Cache-Control',value:'no-store'}]}]},null,2)+'\n',{flag:'wx'});
