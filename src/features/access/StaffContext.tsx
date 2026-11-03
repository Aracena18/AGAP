import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import type { z } from 'zod';
import { SessionSchema } from '../../../packages/contracts/src/schemas';
import { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';

export type StaffSession=z.output<typeof SessionSchema>;
interface StaffValue { session:StaffSession|null; loading:boolean; error:string; presentation:boolean; client:AgapClient; retrySession:()=>void; signedOut:()=>void }
const Context=createContext<StaffValue|null>(null);
export function StaffProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<StaffSession|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [attempt,setAttempt]=useState(0),[presentation,setPresentation]=useState(false);
  const client=useMemo(()=>{
    return new AgapClient('/api/v1',async(input,init)=>{
      const response=await fetch(input,init);
      const sessionRead=String(input)==='/api/v1/session';
      if(sessionRead)setPresentation(response.headers.get('X-AGAP-Presentation')==='true');
      if(response.status===401){
        setSession(null);
        if(presentation&&!sessionRead){setLoading(true);setAttempt(value=>value+1);}
      }
      return response;
    });
  },[presentation]);
  useEffect(()=>{
    const abort=new AbortController();
    let active=true;
    const timer=window.setTimeout(()=>abort.abort(),10_000);
    client.getSession({signal:abort.signal}).then(value=>{if(active){setSession(value);setError('');}}).catch((problem:unknown)=>{
      if(!active)return;
      setSession(null);
      setError(problem instanceof ApiClientError&&problem.status===401?'':'Check your connection and try again. If this continues, contact your administrator.');
    }).finally(()=>{window.clearTimeout(timer);if(active)setLoading(false);});
    return()=>{active=false;window.clearTimeout(timer);abort.abort();};
  },[client,attempt]);
  useEffect(()=>{if(!session)return;const timer=window.setTimeout(()=>{setSession(null);if(presentation){setLoading(true);setAttempt(value=>value+1);}},Math.max(0,new Date(session.expiresAt).getTime()-Date.now()));return()=>window.clearTimeout(timer);},[session,presentation]);
  return <Context.Provider value={{session,loading,error,presentation,client,retrySession:()=>{setLoading(true);setAttempt(value=>value+1);},signedOut:()=>setSession(null)}}>{children}</Context.Provider>;
}
export function useStaff(){const value=useContext(Context);if(!value)throw new Error('StaffProvider is required');return value;}
