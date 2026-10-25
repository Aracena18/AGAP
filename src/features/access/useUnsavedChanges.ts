import { useEffect } from 'react';
export function useUnsavedChanges(dirty:boolean,uncertain=false){
  useEffect(()=>{
    if(!dirty)return;
    const leave=(event:BeforeUnloadEvent)=>event.preventDefault();
    const confirm=(event:Event)=>{
      if(event.type==='click'){
        const target=event.target instanceof Element?event.target.closest('a'):null;
        if(!target||target.getAttribute('href')?.startsWith('#staff-main'))return;
      }
      if(!window.confirm(uncertain?'The save may already have completed. Leaving loses the original retry details. Leave anyway?':'Leave this form? Unsaved changes will be lost.')){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener('beforeunload',leave);document.addEventListener('click',confirm,true);window.addEventListener('agap:signout',confirm);
    return()=>{window.removeEventListener('beforeunload',leave);document.removeEventListener('click',confirm,true);window.removeEventListener('agap:signout',confirm);};
  },[dirty,uncertain]);
}
