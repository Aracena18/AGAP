import { useEffect,useId,useRef,useState,type ReactNode } from 'react';
import { ExpandMore } from '../icons';
import styles from './navigation.module.css';

export function Dropdown({label,trigger,children}:{label:string;trigger:ReactNode;children:ReactNode}){
  const [open,setOpen]=useState(false),root=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),last=useRef(false),id=useId();
  useEffect(()=>{
    if(!open)return;
    const items=menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[last.current?items.length-1:0]?.focus();
    const dismiss=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);
  },[open]);
  return <div ref={root} className={styles.anchor}>
    <button ref={button} className={styles.trigger} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>{last.current=false;setOpen(value=>!value);}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();last.current=event.key==='ArrowUp';setOpen(true);}}}>{trigger}<ExpandMore size={18}/></button>
    {open&&<div ref={menu} id={id} role="menu" aria-label={label} className={styles.popup} onClick={event=>{if(event.target instanceof Element&&event.target.closest('[role="menuitem"]')){setOpen(false);button.current?.focus();}}} onKeyDown={event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);button.current?.focus();return;}
      if(event.key==='Tab'){setOpen(false);button.current?.focus();return;}
      const items=[...menu.current!.querySelectorAll<HTMLElement>('[role="menuitem"]')],index=items.indexOf(document.activeElement as HTMLElement);
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:event.key==='ArrowUp'?(index-1+items.length)%items.length:-1;
      if(next>=0){event.preventDefault();items[next]?.focus();}
    }}>{children}</div>}
  </div>;
}
