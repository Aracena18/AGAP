import { createContext,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import type { z } from 'zod';
import { MemberSessionSchema } from '../../../packages/contracts/src/schemas';
import { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
type Session=z.output<typeof MemberSessionSchema>;
interface Value {session:Session|null;loading:boolean;error:string;presentation:boolean;client:AgapClient;retrySession:()=>void;signedOut:()=>void}
const Context=createContext<Value|null>(null);
export function MemberProvider({children}:{children:ReactNode}){
  const [session,setSession]=useState<Session|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [attempt,setAttempt]=useState(0),[presentation,setPresentation]=useState(false);
  const client=useMemo(()=>{
    return new AgapClient('/api/v1',async(input,init)=>{
      const response=await fetch(input,init);
      const sessionRead=String(input)==='/api/v1/member/session';
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
    const timeout=window.setTimeout(()=>abort.abort(),10_000);
    client.getMemberSession({signal:abort.signal}).then(value=>{if(active){setSession(value);setError('');}}).catch((problem:unknown)=>{
      if(!active)return;
      setSession(null);
      setError(problem instanceof ApiClientError&&problem.status===401?'':'Your account could not be opened. Try again shortly.');
    }).finally(()=>{window.clearTimeout(timeout);if(active)setLoading(false);});
    return()=>{active=false;window.clearTimeout(timeout);abort.abort();};
  },[client,attempt]);
  useEffect(()=>{
    if(!session)return;
    const timer=window.setTimeout(()=>{setSession(null);if(presentation){setLoading(true);setAttempt(value=>value+1);}},Math.max(0,new Date(session.expiresAt).getTime()-Date.now()));
    return()=>window.clearTimeout(timer);
  },[session,presentation]);
  return <Context.Provider value={{session,loading,error,presentation,client,retrySession:()=>{setLoading(true);setAttempt(value=>value+1);},signedOut:()=>setSession(null)}}>{children}</Context.Provider>;
}
export function useMember(){const value=useContext(Context);if(!value)throw new Error('MemberProvider is required');return value;}
