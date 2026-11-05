import { createContext,useContext,useState,type ReactNode } from 'react';
import type { Assumptions } from './analysis';
type Shared={basis:string;assumptions:Assumptions};
export type PreviewFollowUp={basis:string;outcome:'consider'|'clarify'|'escalate';reason:string;officer:string;at:string;offerId:string|null};
const Context=createContext<{get:(id:string,basis:string)=>Assumptions|undefined;share:(id:string,value:Shared|null)=>void;followUp:(id:string,basis:string)=>PreviewFollowUp|undefined;record:(id:string,value:PreviewFollowUp)=>void}|null>(null);
/** Session memory only; callers must first load currently authorized server evidence. */
export function PreviewProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<Record<string,Shared>>({});
 const [notes,setNotes]=useState<Record<string,PreviewFollowUp[]>>({});
 return <Context.Provider value={{get:(id,basis)=>items[id]?.basis===basis?items[id].assumptions:undefined,share:(id,value)=>setItems(old=>{const next={...old};if(value)next[id]=structuredClone(value);else delete next[id];return next;}),followUp:(id,basis)=>[...(notes[id]??[])].reverse().find(note=>note.basis===basis),record:(id,value)=>setNotes(old=>({...old,[id]:[...(old[id]??[]),structuredClone(value)]}))}}>{children}</Context.Provider>;
}
export function usePreview(){const value=useContext(Context);if(!value)throw new Error('PreviewProvider is required');return value;}
