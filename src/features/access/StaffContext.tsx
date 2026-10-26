import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import type { z } from 'zod';
import { SessionSchema } from '../../../packages/contracts/src/schemas';
import { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';

export type StaffSession=z.output<typeof SessionSchema>;
interface StaffValue { session:StaffSession|null; loading:boolean; error:string; client:AgapClient; signedOut:()=>void }
const Context=createContext<StaffValue|null>(null);
export function StaffProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<StaffSession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const client=useMemo(()=>new AgapClient('/api/v1',async(input,init)=>{const response=await fetch(input,init);if(response.status===401)setSession(null);return response;}),[]);
  useEffect(()=>{
    const abort=new AbortController();
    client.getSession({signal:abort.signal}).then(setSession).catch((problem:unknown)=>{
      if(abort.signal.aborted)return;
      if(!(problem instanceof ApiClientError&&problem.status===401))setError('The staff service is unavailable. Try again shortly or contact your administrator.');
    }).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[client]);
  useEffect(()=>{if(!session)return;const timer=window.setTimeout(()=>setSession(null),Math.max(0,new Date(session.expiresAt).getTime()-Date.now()));return()=>window.clearTimeout(timer);},[session]);
  return <Context.Provider value={{session,loading,error,client,signedOut:()=>setSession(null)}}>{children}</Context.Provider>;
}
export function useStaff(){const value=useContext(Context);if(!value)throw new Error('StaffProvider is required');return value;}
