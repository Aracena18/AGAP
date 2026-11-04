import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {z} from 'zod';
import type {SupportHistorySchema,SupportActionPageSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {StaffResponseHistory} from './StaffResponseHistory';

const {client}=vi.hoisted(()=>({client:{listSupportActions:vi.fn()}}));
vi.mock('../access/StaffContext',()=>({useStaff:()=>({client})}));
type History=z.output<typeof SupportHistorySchema>;type Page=z.output<typeof SupportActionPageSchema>;
const id='00000000-0000-4000-8000-000000000001';
function history(version=30):History{return {id,memberId:id,branchId:id,submittedAt:'2026-11-01T00:00:00Z',status:'reviewed',version,assignedOfficerId:id,message:'Fictional concern',contactPreference:'portal',noticeVersion:'fictional-v1',checkIn:{canMeetEssentials:'unavailable',borrowedToRepay:'unavailable',financialStrain:'unavailable'},position:null,positionMessage:'Unavailable',actions:[{id:`00000000-0000-4000-8000-${String(version).padStart(12,'0')}`,recordedAt:'2026-11-01T00:00:00Z',recordedBy:id,response:`Response ${version}`,internalNote:`Private note ${version}`,followUpDate:null,version}],actionsNextCursor:id};}
function deferred(){let resolve!:(value:Page)=>void,reject!:(error:Error)=>void;const promise=new Promise<Page>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
beforeEach(()=>{client.listSupportActions.mockReset();});
describe('staff response-history lifecycle',()=>{
 it('preserves history and an unsent draft through failure and retry, then restores focus when paging ends',async()=>{
  const user=userEvent.setup(),detail=history();client.listSupportActions.mockRejectedValueOnce(new ApiClientError(503,'unavailable','Fictional outage')).mockResolvedValueOnce({items:history(29).actions,nextCursor:null});
  render(<><label>Unsent response<input/></label><StaffResponseHistory detail={detail} blocked={false} onAccessDenied={vi.fn()}/></>);
  await user.type(screen.getByLabelText('Unsent response'),'Keep my unsent response');await user.click(screen.getByRole('button',{name:'Load older responses'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your draft is preserved');expect(screen.getByText('Private note 30',{exact:false})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Retry older responses'}));expect(await screen.findByText('Response 29')).toBeVisible();
  expect(screen.getByLabelText('Unsent response')).toHaveValue('Keep my unsent response');expect(screen.getByText('All responses loaded.')).toBeVisible();
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Response history'})).toHaveFocus());
  expect(client.listSupportActions.mock.calls.map(call=>call[1].cursor)).toEqual([detail.actionsNextCursor,detail.actionsNextCursor]);
 });
 it('suppresses duplicate page requests while the first one is pending',async()=>{
  const pending=deferred();client.listSupportActions.mockReturnValue(pending.promise);render(<StaffResponseHistory detail={history()} blocked={false} onAccessDenied={vi.fn()}/>);
  const button=screen.getByRole('button',{name:'Load older responses'});fireEvent.click(button);fireEvent.click(button);expect(client.listSupportActions).toHaveBeenCalledTimes(1);
  await act(async()=>pending.resolve({items:history(29).actions,nextCursor:null}));expect(screen.getByText('Response 29')).toBeVisible();
 });
 it('ignores a late page from the previous history version even if a transport ignores abort',async()=>{
  const pending=deferred();client.listSupportActions.mockReturnValue(pending.promise);const view=render(<StaffResponseHistory key="old" detail={history()} blocked={false} onAccessDenied={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load older responses'}));const signal=client.listSupportActions.mock.calls[0][1].signal;
  view.rerender(<StaffResponseHistory key="new" detail={history(40)} blocked={false} onAccessDenied={vi.fn()}/>);expect(signal.aborted).toBe(true);
  await act(async()=>pending.resolve({items:history(29).actions,nextCursor:null}));expect(screen.queryByText('Private note 29',{exact:false})).not.toBeInTheDocument();expect(screen.getByText('Response 40')).toBeVisible();
 });
 it('does not let an obsolete access denial dismiss the newly selected private view',async()=>{
  const pending=deferred(),deny=vi.fn();client.listSupportActions.mockReturnValue(pending.promise);const view=render(<StaffResponseHistory key="old" detail={history()} blocked={false} onAccessDenied={deny}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load older responses'}));expect(client.listSupportActions).toHaveBeenCalledTimes(1);view.rerender(<StaffResponseHistory key="new" detail={history(40)} blocked={false} onAccessDenied={deny}/>);
  const staleError=new ApiClientError(403,'forbidden','Fictional old denial');
  // An aborted request performs no React update; flush the transport rejection directly.
  const rejected=pending.promise.catch(error=>error);pending.reject(staleError);expect(await rejected).toBe(staleError);
  expect(deny).not.toHaveBeenCalled();expect(screen.getByText('Response 40')).toBeVisible();
 });
});
