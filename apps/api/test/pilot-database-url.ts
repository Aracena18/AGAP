/** Both harnesses truncate fictional fixtures. Never let them share a database. */
export function assertIndependentTestDatabases(primary:string,pilot:string){
  const endpoint=(value:string)=>{
    const url=new URL(value);
    if(!['postgresql:','postgres:'].includes(url.protocol)||!['127.0.0.1','localhost'].includes(url.hostname)||url.pathname!=='/agap_test')throw new Error('Browser fixtures require localhost fictional agap_test databases.');
    return `${url.port||'5432'}${url.pathname}`;
  };
  if(endpoint(primary)===endpoint(pilot))throw new Error('The pilot browser database must be separate from the primary browser database.');
}
