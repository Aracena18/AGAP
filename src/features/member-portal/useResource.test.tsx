import { ApiClientError } from '../../../packages/api-client/src/transport';
import { act,render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe,expect,it,vi } from 'vitest';
import { useResource } from './useResource';
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
function View({load,version,retain=false}:{retain?:boolean;load:(signal:AbortSignal)=>Promise<string>;version:number}){
  const resource=useResource(load,version,retain);
  return <>{resource.loading&&<p role="status">Loading</p>}{resource.data&&<section><p>{resource.data}</p><label>Unsaved note<input defaultValue=""/></label></section>}<button onClick={resource.refreshKeepingData}>Refresh details</button></>;
}
describe('private record resource lifecycle',()=>{
  it('hides an older version immediately while a revised financial view loads',async()=>{
    const first=deferred<string>(),second=deferred<string>(),load=vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const view=render(<View load={load} version={1}/>);await act(async()=>first.resolve('Original checked terms'));expect(screen.getByText('Original checked terms')).toBeVisible();
    view.rerender(<View load={load} version={2}/>);expect(screen.queryByText('Original checked terms')).not.toBeInTheDocument();expect(screen.getByRole('status')).toHaveTextContent('Loading');await act(async()=>second.resolve('Revised checked terms'));expect(screen.getByText('Revised checked terms')).toBeVisible();
  });
  it('ignores a late response from a previously selected record even when a loader ignores cancellation',async()=>{
    const slow=deferred<string>(),first=()=>slow.promise,second=async()=>'Current request';const view=render(<View load={first} version={1}/>);
    view.rerender(<View load={second} version={1}/>);expect(await screen.findByText('Current request')).toBeVisible();await act(async()=>slow.resolve('Previous request'));expect(screen.queryByText('Previous request')).not.toBeInTheDocument();expect(screen.getByText('Current request')).toBeVisible();
  });
  it('preserves unsent form input during a same-record detail refresh',async()=>{
    const user=userEvent.setup(),reload=deferred<string>(),load=vi.fn().mockResolvedValueOnce('Saved document details').mockReturnValueOnce(reload.promise);
    render(<View load={load} version={1}/>);await screen.findByText('Saved document details');await user.type(screen.getByLabelText('Unsaved note'),'Keep this unsent note');await user.click(screen.getByRole('button',{name:'Refresh details'}));expect(screen.getByLabelText('Unsaved note')).toHaveValue('Keep this unsent note');await act(async()=>reload.resolve('Updated document details'));expect(screen.getByLabelText('Unsaved note')).toHaveValue('Keep this unsent note');
  });
});

it('retains an unfinished answer after a transient same-record refresh failure but clears it on access denial',async()=>{
 const user=userEvent.setup(),load=vi.fn().mockResolvedValueOnce('Saved guidance').mockRejectedValueOnce(new Error('Network unavailable')).mockRejectedValueOnce(new ApiClientError(403,'denied','Access denied'));
 render(<View load={load} version={1} retain/>);await screen.findByText('Saved guidance');await user.type(screen.getByLabelText('Unsaved note'),'Keep this typed answer');await user.click(screen.getByRole('button',{name:'Refresh details'}));await act(async()=>{});expect(screen.getByLabelText('Unsaved note')).toHaveValue('Keep this typed answer');await user.click(screen.getByRole('button',{name:'Refresh details'}));await act(async()=>{});expect(screen.queryByText('Saved guidance')).not.toBeInTheDocument();expect(screen.queryByLabelText('Unsaved note')).not.toBeInTheDocument();
});
