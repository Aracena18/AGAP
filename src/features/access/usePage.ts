import { useEffect,useState } from 'react';
import type { RequestOptions } from '../../../packages/api-client/src/transport';

export function usePage<T>(load:(options:RequestOptions)=>Promise<{items:T[];nextCursor:string|null}>){
  const [items,setItems]=useState<T[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const abort=new AbortController();
    load({signal:abort.signal}).then(page=>{setItems(page.items);setCursor(page.nextCursor);}).catch(()=>{if(!abort.signal.aborted)setError('The records could not be loaded. Try again.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[load,revision]);
  async function more(){if(!cursor||loading)return;setLoading(true);setError('');try{const page=await load({cursor});setItems(previous=>[...previous,...page.items]);setCursor(page.nextCursor);}catch{setError('More records could not be loaded. Try again.');}finally{setLoading(false);}}
  return {items,loading,error,hasMore:cursor!==null,more,refresh:()=>{setLoading(true);setError('');setRevision(value=>value+1);}};
}
