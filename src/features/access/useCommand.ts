import { useRef,useState } from 'react';
import { ApiClientError } from '../../../packages/api-client/src/transport';

/** Preserve the exact request/key across an ambiguous response; never auto-retry a write. */
export function useCommand<T,R>(){
  const attempt=useRef<{body:T;key:string;send:(body:T,key:string)=>Promise<R>}|null>(null);
  const busy=useRef(false);
  const [saving,setSaving]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState('');
  const [fields,setFields]=useState<{path:string;message:string}[]>([]);
  async function submit(body:T,send:(body:T,key:string)=>Promise<R>):Promise<R|undefined>{
    if(busy.current)return;
    busy.current=true;
    attempt.current??={body:structuredClone(body),key:crypto.randomUUID(),send};
    setSaving(true);setError('');setFields([]);
    try{
      const result=await attempt.current.send(attempt.current.body,attempt.current.key);
      attempt.current=null;setUncertain(false);return result;
    }catch(problem){
      const unavailable=problem instanceof ApiClientError&&problem.status===501&&problem.code==='module_not_available';
      const unknown=!unavailable&&(!(problem instanceof ApiClientError)||problem.status>=500||problem.code==='invalid_response');
      setUncertain(unknown);
      if(problem instanceof ApiClientError)setFields(problem.fields??[]);
      setError(unknown?'The save result is uncertain. Retry the same submission before starting another.':problem.message);
      if(!unknown)attempt.current=null;
      return undefined;
    }finally{busy.current=false;setSaving(false);}
  }
  function reset(){if(busy.current||attempt.current)return false;setError('');setFields([]);setUncertain(false);return true;}
  return {submit,saving,uncertain,error,fields,reset};
}
