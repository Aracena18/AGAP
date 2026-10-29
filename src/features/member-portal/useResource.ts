import { useEffect,useState } from 'react';
import { ApiClientError } from '../../../packages/api-client/src/transport';
/** A different request key never displays the previous record while loading/failing. */
export function useResource<T>(load:(signal:AbortSignal)=>Promise<T>,key:string|number|null=null){
  const [revision,setRevision]=useState(0),[preserve,setPreserve]=useState(false);
  const [result,setResult]=useState<{load:typeof load;key:typeof key;revision:number;data?:T;error:string}>();
  useEffect(()=>{
    const abort=new AbortController();
    load(abort.signal).then(data=>{if(!abort.signal.aborted)setResult({load,key,revision,data,error:''});}).catch((problem:unknown)=>{
      if(!abort.signal.aborted)setResult({load,key,revision,error:problem instanceof ApiClientError&&problem.status<500?problem.message:'This information could not be loaded. Try again shortly.'});
    });
    return()=>abort.abort();
  },[load,key,revision]);
  const current=result?.load===load&&result.key===key&&result.revision===revision;
  return {data:current||preserve&&result?.load===load&&result.key===key?result?.data:undefined,loading:!current,error:current?result.error:'',
    refresh:()=>{setPreserve(false);setRevision(value=>value+1);},refreshKeepingData:()=>{setPreserve(true);setRevision(value=>value+1);}};
}
