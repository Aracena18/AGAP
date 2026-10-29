import { createContext,createElement,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
type Entry={dirty:boolean;uncertain:boolean};
interface Registry {set:(id:symbol,entry:Entry)=>void;remove:(id:symbol)=>void;allowOnce:(id:symbol)=>void}
const Context=createContext<Registry|null>(null);
const message=(uncertain:boolean)=>uncertain?'The save may already have completed. Leaving loses the original retry details. Leave anyway?':'Leave this form? Unsaved changes will be lost.';
/** One router blocker aggregates all active forms, including browser Back/Forward. */
export function UnsavedChangesProvider({children}:{children:ReactNode}){
  const state=useMemo(()=>({entries:new Map<symbol,Entry>(),allowed:new Set<symbol>()}),[]),prompted=useRef<string|null>(null);
  const shouldBlock=useCallback(()=>{const blocked=[...state.entries].some(([id,entry])=>entry.dirty&&!state.allowed.has(id));state.allowed.clear();return blocked;},[state]);
  const blocker=useBlocker(shouldBlock);
  useEffect(()=>{
    if(blocker.state!=='blocked'){prompted.current=null;return;}
    if(prompted.current===blocker.location.key)return;prompted.current=blocker.location.key;
    const uncertain=[...state.entries.values()].some(entry=>entry.dirty&&entry.uncertain);
    if(window.confirm(message(uncertain)))blocker.proceed();else blocker.reset();
  },[blocker,state]);
  useEffect(()=>{
    const leave=(event:BeforeUnloadEvent)=>{if([...state.entries.values()].some(entry=>entry.dirty)){event.preventDefault();event.returnValue='';}};
    const signOut=(event:Event)=>{const entries=[...state.entries.values()].filter(entry=>entry.dirty);if(entries.length&&!window.confirm(message(entries.some(entry=>entry.uncertain))))event.preventDefault();};
    window.addEventListener('beforeunload',leave);window.addEventListener('agap:signout',signOut);
    return()=>{window.removeEventListener('beforeunload',leave);window.removeEventListener('agap:signout',signOut);};
  },[state]);
  const value=useMemo<Registry>(()=>({set:(id,entry)=>{state.entries.set(id,entry);},remove:id=>{state.entries.delete(id);state.allowed.delete(id);},allowOnce:id=>{state.allowed.add(id);}}),[state]);
  return createElement(Context.Provider,{value},children);
}
export function useUnsavedChanges(dirty:boolean,uncertain=false){
  const registry=useContext(Context),id=useRef(Symbol('form'));
  if(!registry)throw new Error('UnsavedChangesProvider is required for editable workspaces.');
  useLayoutEffect(()=>{const key=id.current;registry.set(key,{dirty,uncertain});return()=>registry.remove(key);},[registry,dirty,uncertain]);
  return ()=>registry.allowOnce(id.current);
}
