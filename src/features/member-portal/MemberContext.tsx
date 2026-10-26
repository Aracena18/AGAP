import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import type { z } from 'zod';
import { MemberSessionSchema } from '../../../packages/contracts/src/schemas';
import { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
type Session=z.output<typeof MemberSessionSchema>;
interface Value {session:Session|null;loading:boolean;error:string;client:AgapClient;signedOut:()=>void}
const Context=createContext<Value|null>(null);
export function MemberProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const client=useMemo(()=>new AgapClient('/api/v1',async(input,init)=>{
    const response=await fetch(input,init);if(response.status===401)setSession(null);return response;
  }),[]);
  useEffect(()=>{
    const abort=new AbortController();
    client.getMemberSession({signal:abort.signal}).then(value=>{if(!abort.signal.aborted)setSession(value);}).catch((problem:unknown)=>{
      if(!abort.signal.aborted&&!(problem instanceof ApiClientError&&problem.status===401))setError('Your account could not be opened. Try again shortly.');
    }).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return()=>abort.abort();
  },[client]);
  useEffect(()=>{
    if(!session)return;
    const timer=window.setTimeout(()=>setSession(null),Math.max(0,new Date(session.expiresAt).getTime()-Date.now()));
    return()=>window.clearTimeout(timer);
  },[session]);
  return <Context.Provider value={{session,loading,error,client,signedOut:()=>setSession(null)}}>{children}</Context.Provider>;
}
export function useMember(){const value=useContext(Context);if(!value)throw new Error('MemberProvider is required');return value;}
