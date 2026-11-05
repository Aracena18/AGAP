import {act,fireEvent,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {SupportFreshPosition} from './SupportFreshPosition';
const {client}=vi.hoisted(()=>({client:{getSupportLoanPosition:vi.fn()}}));
vi.mock('../access/StaffContext',()=>({useStaff:()=>({client})}));
const id='00000000-0000-4000-8000-000000000001';
const available={state:'available',data:{loanId:id,asOfDate:'2026-11-05',principalCentavos:50000,interestDueCentavos:0,feesDueCentavos:0,overdueCentavos:0,postedThrough:'2026-11-04T00:00:00Z',pendingMovementCount:1}};
beforeEach(()=>client.getSupportLoanPosition.mockReset());
describe('fresh support-position read lifecycle',()=>{
 it('keeps captured history and an unsent response intact on a failed read and retry',async()=>{
  const user=userEvent.setup();client.getSupportLoanPosition.mockRejectedValueOnce(new Error('outage')).mockResolvedValueOnce(available);
  render(<><p>Captured principal: 100000</p><label>Draft<input/></label><SupportFreshPosition requestId={id} blocked={false} onAccessDenied={vi.fn()}/></>);
  await user.type(screen.getByLabelText('Draft'),'Keep response');await user.click(screen.getByRole('button',{name:'Load fresh position'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('draft and captured snapshot are preserved');
  await user.click(screen.getByRole('button',{name:'Retry fresh position'}));expect(await screen.findByText('Fresh principal')).toBeVisible();
  expect(screen.getByText('Captured principal: 100000')).toBeVisible();expect(screen.getByLabelText('Draft')).toHaveValue('Keep response');
 });
 it('suppresses duplicate reads and discards an obsolete result when a different request is selected',async()=>{
  let resolve!:(value:unknown)=>void;client.getSupportLoanPosition.mockReturnValue(new Promise(yes=>{resolve=yes;}));
  const view=render(<SupportFreshPosition key="old" requestId={id} blocked={false} onAccessDenied={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Load fresh position'}));fireEvent.click(screen.getByRole('button',{name:'Loading fresh position…'}));expect(client.getSupportLoanPosition).toHaveBeenCalledTimes(1);
  const signal=client.getSupportLoanPosition.mock.calls[0][1].signal;
  view.rerender(<SupportFreshPosition key="new" requestId="00000000-0000-4000-8000-000000000002" blocked={false} onAccessDenied={vi.fn()}/>);
  expect(signal.aborted).toBe(true);await act(async()=>resolve(available));expect(screen.queryByText('Fresh principal')).not.toBeInTheDocument();
 });
 it('clears the private projection and notifies the parent on current access denial',async()=>{
  const deny=vi.fn();client.getSupportLoanPosition.mockResolvedValueOnce(available).mockRejectedValueOnce(new ApiClientError(403,'forbidden','Denied'));
  render(<SupportFreshPosition requestId={id} blocked={false} onAccessDenied={deny}/>);fireEvent.click(screen.getByRole('button',{name:'Load fresh position'}));expect(await screen.findByText('Fresh principal')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Refresh fresh position'}));await screen.findByRole('button',{name:'Load fresh position'});expect(deny).toHaveBeenCalledOnce();expect(screen.queryByText('Fresh principal')).not.toBeInTheDocument();
 });
 it('labels unavailable separately from an actual zero and blocks reading during uncertain writes',async()=>{
  client.getSupportLoanPosition.mockResolvedValue({state:'unavailable',message:'No linked loan; debt is not inferred.'});
  const view=render(<SupportFreshPosition requestId={id} blocked onAccessDenied={vi.fn()}/>);expect(screen.getByRole('button',{name:'Load fresh position'})).toBeDisabled();
  view.rerender(<SupportFreshPosition requestId={id} blocked={false} onAccessDenied={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Load fresh position'}));expect(await screen.findByText('No linked loan; debt is not inferred.')).toBeVisible();expect(screen.queryByText('Fresh principal')).not.toBeInTheDocument();
 });
});
