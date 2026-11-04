import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {MemberSupportHistory} from './MemberSupportHistory';

const {client}=vi.hoisted(()=>({client:{listMemberSupportHistory:vi.fn()}}));
vi.mock('./MemberContext',()=>({useMember:()=>({client})}));
const id='00000000-0000-4000-8000-000000000001';
const item=(value=1)=>({id:`00000000-0000-4000-8000-${String(value).padStart(12,'0')}`,submittedAt:'2026-11-04T00:00:00Z',status:'submitted',message:`Fictional member request ${value}`,response:null});
const page=(values=[item()],nextCursor:string|null=id)=>({state:'available',data:{items:values,nextCursor}});
beforeEach(()=>{client.listMemberSupportHistory.mockReset();});
describe('member support-history lifecycle',()=>{
 it('preserves the draft and loaded records after failure, retries the same cursor and restores focus at completion',async()=>{
  const user=userEvent.setup();client.listMemberSupportHistory.mockResolvedValueOnce(page()).mockRejectedValueOnce(new ApiClientError(503,'unavailable','Fictional outage')).mockResolvedValueOnce(page([item(2)],null));
  render(<><label>Unsent message<input defaultValue="Keep my support draft"/></label><MemberSupportHistory blocked={false} onAccessDenied={vi.fn()}/></>);
  await user.click(await screen.findByRole('button',{name:'Load older requests'}));expect(await screen.findByRole('alert')).toHaveTextContent('draft is preserved');expect(screen.getByText('Fictional member request 1')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Retry older requests'}));expect(await screen.findByText('Fictional member request 2')).toBeVisible();expect(screen.getByLabelText('Unsent message')).toHaveValue('Keep my support draft');await waitFor(()=>expect(screen.getByRole('heading',{name:'My requests'})).toHaveFocus());expect(client.listMemberSupportHistory.mock.calls.slice(1).map(call=>call[0].cursor)).toEqual([id,id]);
 });
 it('suppresses duplicate page activation and deduplicates overlapping rows defensively',async()=>{
  let resolve!:(value:unknown)=>void;client.listMemberSupportHistory.mockResolvedValueOnce(page()).mockReturnValueOnce(new Promise(done=>resolve=done));render(<MemberSupportHistory blocked={false} onAccessDenied={vi.fn()}/>);
  const button=await screen.findByRole('button',{name:'Load older requests'});fireEvent.click(button);fireEvent.click(button);expect(client.listMemberSupportHistory).toHaveBeenCalledTimes(2);
  await act(async()=>resolve(page([item(),item(2)],null)));expect(screen.getAllByText('Fictional member request 1')).toHaveLength(1);expect(screen.getByText('Fictional member request 2')).toBeVisible();
 });
 it('distinguishes producer unavailability from a complete empty history',async()=>{
  client.listMemberSupportHistory.mockResolvedValueOnce({state:'unavailable',message:'Fictional producer is unavailable.'});const view=render(<MemberSupportHistory blocked={false} onAccessDenied={vi.fn()}/>);
  expect(await screen.findByText('Fictional producer is unavailable.')).toBeVisible();expect(screen.queryByText('No support requests are recorded.')).not.toBeInTheDocument();
  client.listMemberSupportHistory.mockResolvedValueOnce(page([],null));view.rerender(<MemberSupportHistory key="new" blocked={false} onAccessDenied={vi.fn()}/>);expect(await screen.findByText('No support requests are recorded.')).toBeVisible();
 });
 it('ignores a late older page after session/view disposal even if transport ignores abort',async()=>{
  let resolve!:(value:unknown)=>void;client.listMemberSupportHistory.mockResolvedValueOnce(page()).mockReturnValueOnce(new Promise(done=>resolve=done));const view=render(<MemberSupportHistory key="old" blocked={false} onAccessDenied={vi.fn()}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Load older requests'}));const signal=client.listMemberSupportHistory.mock.calls[1][0].signal;
  client.listMemberSupportHistory.mockResolvedValueOnce(page([item(10)],null));view.rerender(<MemberSupportHistory key="new" blocked={false} onAccessDenied={vi.fn()}/>);expect(signal.aborted).toBe(true);await screen.findByText('Fictional member request 10');
  await act(async()=>resolve(page([item(2)],null)));expect(screen.queryByText('Fictional member request 2')).not.toBeInTheDocument();
 });
 it('does not let a disposed denial dismiss a newly authorized view',async()=>{
  let reject!:(error:Error)=>void;const denied=vi.fn(),pending=new Promise((_,no)=>reject=no);client.listMemberSupportHistory.mockReturnValueOnce(pending);const view=render(<MemberSupportHistory key="old" blocked={false} onAccessDenied={denied}/>);
  const signal=client.listMemberSupportHistory.mock.calls[0][0].signal;client.listMemberSupportHistory.mockResolvedValueOnce(page([],null));view.rerender(<MemberSupportHistory key="new" blocked={false} onAccessDenied={denied}/>);expect(signal.aborted).toBe(true);
  const handled=pending.catch(error=>error);const problem=new ApiClientError(403,'forbidden','Fictional stale denial');reject(problem);expect(await handled).toBe(problem);await screen.findByText('No support requests are recorded.');expect(denied).not.toHaveBeenCalled();
 });
 it('does not page while a submission result is uncertain',async()=>{
  client.listMemberSupportHistory.mockResolvedValueOnce(page());render(<MemberSupportHistory blocked onAccessDenied={vi.fn()}/>);const button=await screen.findByRole('button',{name:'Load older requests'});expect(button).toBeDisabled();fireEvent.click(button);expect(client.listMemberSupportHistory).toHaveBeenCalledTimes(1);
 });
});
