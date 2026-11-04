import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {z} from 'zod';
import type {SupportFollowUpSchema,SupportFollowUpDetailSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {StaffFollowUps,followUpLabel} from './StaffFollowUps';
import {FollowUpHistory} from './FollowUpHistory';

const {client}=vi.hoisted(()=>({client:{listSupportFollowUps:vi.fn(),getSupportFollowUp:vi.fn(),completeSupportFollowUp:vi.fn(),rescheduleSupportFollowUp:vi.fn(),listSupportFollowUpEvents:vi.fn()}}));
vi.mock('../access/StaffContext',()=>({useStaff:()=>({client,session:{csrfToken:'fictional-csrf'}})}));
vi.mock('../access/useUnsavedChanges',()=>({useUnsavedChanges:vi.fn()}));
const id='00000000-0000-4000-8000-000000000001';
const task:z.output<typeof SupportFollowUpSchema>={id,requestId:id,memberId:id,branchId:id,assignedOfficerId:id,sourceActionId:id,sourceActionVersion:3,sourceRecordedAt:'2026-11-04T00:00:00Z',originalDate:'2026-11-04',dueDate:'2026-11-04',status:'open',version:1,recordedAt:'2026-11-04T00:00:00Z',recordedBy:id,completedAt:null};
const detail:z.output<typeof SupportFollowUpDetailSchema>={task,source:{id,version:3,response:'Fictional source response.',internalNote:'Private source note.',recordedBy:id,recordedAt:task.recordedAt,followUpDate:task.dueDate},events:[{id,version:1,kind:'scheduled',status:'open',dueDate:task.dueDate,note:null,recordedAt:task.recordedAt,recordedBy:id}],eventsNextCursor:null};
beforeEach(()=>{Object.values(client).forEach(mock=>mock.mockReset());client.listSupportFollowUps.mockResolvedValue({asOfDate:'2026-11-04',items:[task],nextCursor:null});client.getSupportFollowUp.mockResolvedValue(detail);});

describe('staff follow-up lifecycle',()=>{
 it('uses the server date to distinguish scheduled, due, overdue and completed',()=>{
  expect(followUpLabel(task,'2026-11-03')).toBe('Scheduled');expect(followUpLabel(task,'2026-11-04')).toBe('Due today');expect(followUpLabel(task,'2026-11-05')).toBe('Overdue');expect(followUpLabel({...task,status:'completed'},'2026-11-05')).toBe('Completed');
 });
 it('locks a draft and retries the identical uncertain command with its original key and version',async()=>{
  const user=userEvent.setup(),blocked=vi.fn();client.completeSupportFollowUp.mockRejectedValueOnce(new ApiClientError(503,'unavailable','Fictional lost response')).mockResolvedValueOnce({...task,status:'completed',version:2});
  render(<StaffFollowUps onAccessDenied={vi.fn()} onBlockedChange={blocked}/>);
  await user.click(await screen.findByRole('button',{name:`Open follow-up ${id}`}));await user.type(await screen.findByLabelText('Action taken'),'Private completed action.');
  expect(screen.getByLabelText('Follow-up status')).toBeDisabled();await user.click(screen.getByRole('button',{name:'Complete follow-up'}));expect(await screen.findByRole('alert')).toHaveTextContent('uncertain');expect(screen.getByLabelText('Action taken')).toBeDisabled();
  await user.click(screen.getByRole('button',{name:'Retry same follow-up action'}));expect(await screen.findByText('Follow-up action saved. The queue has been refreshed.')).toBeVisible();
  const [first,second]=client.completeSupportFollowUp.mock.calls;expect(first[1]).toEqual({note:'Private completed action.'});expect(second).toEqual(first);expect(first[2].version).toBe(1);expect(blocked).toHaveBeenCalledWith(true);
 });
 it('preserves a draft when history fails and retries its original cursor without duplicate reads',async()=>{
  const user=userEvent.setup();let resolve!:(value:unknown)=>void;const pending=new Promise(done=>resolve=done);
  client.listSupportFollowUpEvents.mockRejectedValueOnce(new ApiClientError(503,'unavailable','Fictional history outage')).mockReturnValueOnce(pending);
  render(<><label>Unsent action<input defaultValue="Keep my private draft"/></label><FollowUpHistory detail={{...detail,eventsNextCursor:id}} blocked={false} onAccessDenied={vi.fn()}/></>);
  await user.click(screen.getByRole('button',{name:'Load older follow-up history'}));expect(await screen.findByRole('alert')).toHaveTextContent('draft is preserved');
  const retry=screen.getByRole('button',{name:'Retry follow-up history'});fireEvent.click(retry);fireEvent.click(retry);expect(client.listSupportFollowUpEvents).toHaveBeenCalledTimes(2);
  await act(async()=>resolve({items:[],nextCursor:null}));await waitFor(()=>expect(screen.getByRole('heading',{name:'Follow-up history'})).toHaveFocus());expect(screen.getByLabelText('Unsent action')).toHaveValue('Keep my private draft');expect(client.listSupportFollowUpEvents.mock.calls.map(call=>call[1].cursor)).toEqual([id,id]);
 });
 it('ignores a late denial from an older history view after disposal even when transport ignores abort',async()=>{
  let reject!:(error:Error)=>void;const pending=new Promise((_,no)=>reject=no),denied=vi.fn();client.listSupportFollowUpEvents.mockReturnValue(pending);
  const view=render(<FollowUpHistory key="old" detail={{...detail,eventsNextCursor:id}} blocked={false} onAccessDenied={denied}/>);fireEvent.click(screen.getByRole('button',{name:'Load older follow-up history'}));
  const signal=client.listSupportFollowUpEvents.mock.calls[0][1].signal;view.rerender(<FollowUpHistory key="new" detail={detail} blocked={false} onAccessDenied={denied}/>);expect(signal.aborted).toBe(true);
  const error=new ApiClientError(403,'forbidden','Fictional obsolete denial'),handled=pending.catch(value=>value);reject(error);expect(await handled).toBe(error);expect(denied).not.toHaveBeenCalled();
 });
 it('cancels an in-flight detail when the private workspace is disposed',async()=>{
  let resolve!:(value:unknown)=>void;client.getSupportFollowUp.mockReturnValue(new Promise(done=>resolve=done));const denied=vi.fn();
  const view=render(<StaffFollowUps onAccessDenied={denied} onBlockedChange={vi.fn()}/>);await userEvent.click(await screen.findByRole('button',{name:`Open follow-up ${id}`}));
  const signal=client.getSupportFollowUp.mock.calls[0][1].signal;view.unmount();expect(signal.aborted).toBe(true);await act(async()=>resolve(detail));expect(denied).not.toHaveBeenCalled();
 });
});
