import { useEffect,useRef } from 'react';
import { Button,Notice } from '../../shared/ui';
export function ReadState({loading,error,refresh}:{loading:boolean;error:string;refresh:()=>void}){return loading?<p role="status">Loading your information…</p>:error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={refresh}>Try again</Button></Notice>:null;}
export function CommandError({error,fields=[]}:{error:string;fields?:{path:string;message:string}[]}){
  const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(error)ref.current?.focus();},[error]);
  return error?<div ref={ref} tabIndex={-1}><Notice tone="danger" role="alert">{error}{fields.length>0&&<ul>{fields.map(field=><li key={field.path}>{field.message}</li>)}</ul>}</Notice></div>:null;
}
