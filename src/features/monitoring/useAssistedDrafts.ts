import {useCallback,useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {AssistedCheckInSchema,AssistedCheckInPageSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError,type RequestOptions} from '../../../packages/api-client/src/transport';
export type AssistedDraft=z.output<typeof AssistedCheckInSchema>;
type Page=z.output<typeof AssistedCheckInPageSchema>;
/** One abortable read at a time; stale pages/details cannot overwrite a newer selection. */
export function useAssistedDrafts(load:(options:RequestOptions)=>Promise<Page>,get:(id:string,options:RequestOptions)=>Promise<AssistedDraft>,onDenied:()=>void){
 const [items,setItems]=useState<AssistedDraft[]>([]),[detail,setDetail]=useState<AssistedDraft|null>(null),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 const failure=useCallback((e:unknown)=>{if(e instanceof ApiClientError&&[401,403,404].includes(e.status)){onDenied();return;}setError(e instanceof Error?e.message:'Drafts could not be loaded.');},[onDenied]);
 const read=useCallback(async(id?:string,after?:string)=>{
  active.current?.abort();const abort=new AbortController();active.current=abort;setLoading(true);setError('');setDetail(null);
  try{
   if(id){const draft=await get(id,{signal:abort.signal});if(!abort.signal.aborted)setDetail(draft);}
   else{const page=await load({signal:abort.signal,...(after?{cursor:after}:{})});if(!abort.signal.aborted){setItems(previous=>after?[...previous,...page.items]:page.items);setCursor(page.nextCursor);}}
  }catch(e){if(!abort.signal.aborted)failure(e);}finally{if(!abort.signal.aborted)setLoading(false);}
 },[load,get,failure]);
 useEffect(()=>{
  const abort=new AbortController();active.current=abort;
  load({signal:abort.signal}).then(page=>{if(!abort.signal.aborted){setItems(page.items);setCursor(page.nextCursor);}}).catch(e=>{if(!abort.signal.aborted)failure(e);}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
  return()=>{abort.abort();active.current?.abort();};
 },[load,failure]);
 return {items,detail,loading,error,hasMore:cursor!==null,open:(id:string)=>read(id),refresh:()=>read(),more:()=>cursor?read(undefined,cursor):Promise.resolve(),failure};
}
