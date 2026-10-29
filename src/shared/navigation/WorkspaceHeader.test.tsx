import { render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { WorkspaceHeader } from './WorkspaceHeader';
afterEach(()=>vi.unstubAllGlobals());
function open(kind:'member'|'staff'='staff'){
  const signedOut=vi.fn();render(<MemoryRouter><WorkspaceHeader workspace={kind==='member'?'member':'demo'} account={{kind,name:'Fictional Administrator',csrfToken:'fictional-csrf',signedOut}}/></MemoryRouter>);return signedOut;
}
async function chooseSignOut(){const user=userEvent.setup();await user.click(screen.getByRole('button',{name:/Account menu for/}));await user.click(screen.getByRole('menuitem',{name:'Sign out'}));}
describe('real workspace sign-out',()=>{
  it.each(['staff','member'] as const)('ends the correct %s session using its existing CSRF token',async kind=>{
    const request=vi.fn().mockResolvedValue(new Response('',{status:200}));vi.stubGlobal('fetch',request);const signedOut=open(kind);await chooseSignOut();expect(request).toHaveBeenCalledWith(`/api/v1/${kind==='member'?'member/':''}auth/logout`,expect.objectContaining({method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':'fictional-csrf'}}));expect(signedOut).toHaveBeenCalledTimes(1);
  });
  it('keeps the account available after an uncertain logout and allows a deliberate retry',async()=>{
    const request=vi.fn().mockRejectedValueOnce(new TypeError('Connection lost')).mockResolvedValueOnce(new Response('',{status:200}));vi.stubGlobal('fetch',request);const signedOut=open();await chooseSignOut();expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm sign-out');expect(signedOut).not.toHaveBeenCalled();await chooseSignOut();expect(signedOut).toHaveBeenCalledTimes(1);expect(request).toHaveBeenCalledTimes(2);
  });
  it('clears an already expired account rather than trapping it in sign-out',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:401})));const signedOut=open();await chooseSignOut();expect(signedOut).toHaveBeenCalledOnce();
  });
  it('honors cancellation of an unsaved-form warning without sending logout',async()=>{
    const request=vi.fn();vi.stubGlobal('fetch',request);const signedOut=open(),cancel=(event:Event)=>event.preventDefault();window.addEventListener('agap:signout',cancel);
    try{await chooseSignOut();expect(request).not.toHaveBeenCalled();expect(signedOut).not.toHaveBeenCalled();}finally{window.removeEventListener('agap:signout',cancel);}
  });
});
