import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { UnsavedChangesProvider } from '../access/useUnsavedChanges';
import { StaffLoanWorkspace } from './StaffLoanPage';
import { loanUiFixture } from './loan.test-fixture';
import type { LoanGateway } from './loan-gateway';
import { useState } from 'react';
import { testId } from '../decision/staff.test-fixture';
function mount(f = loanUiFixture(), gateway: LoanGateway | undefined = f.gateway) {
  return render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><StaffLoanWorkspace loanId={f.loanId} day="2026-11-02" session={f.session} gateway={gateway}/></UnsavedChangesProvider> }])}/>);
}
describe('Staff loan workspace with explicit simulated gateway', () => {
  it('hides self-authorization and disables posting while recorded evidence needs review',async()=>{
    const f=loanUiFixture();f.view.commands[0].state='prepared';f.view.commands[0].preparedBy=f.session.user.id;
    const mounted=mount(f);await screen.findByText(/No posted balance/);expect(screen.queryByRole('button',{name:'Authorize release'})).not.toBeInTheDocument();
    mounted.unmount();f.view.commands[0].state='confirmed_unposted';f.view.commands[0].reviewRequired=true;mount(f);
    expect(await screen.findByText(/Conflicting movement evidence/)).toBeVisible();expect(screen.getByRole('button',{name:'Post recorded movement'})).toBeDisabled();
  });
  it('defaults unavailable without inventing a financial position', async () => {
    const f = loanUiFixture();
    render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><StaffLoanWorkspace loanId={f.loanId} day="2026-11-02" session={f.session}/></UnsavedChangesProvider> }])}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('integration is unavailable');
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('keeps settlement and posting distinct and requires a reason', async () => {
    const f = loanUiFixture(), send = vi.fn(f.gateway.act), user = userEvent.setup(); mount(f, { ...f.gateway, act: send });
    expect(await screen.findByText(/No posted balance/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Post recorded movement' })); expect(send).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('Action reason'), 'Checked the exact recorded movement.');
    await user.click(screen.getByRole('button', { name: 'Post recorded movement' }));
    expect(await screen.findByText(/Action recorded/)).toBeVisible();
    expect(send.mock.calls[0][1]).toEqual({ action: 'finalize', commandId: f.commandId, version: 4, reason: 'Checked the exact recorded movement.' });
  });
  it('retains the original body and key after uncertain success', async () => {
    const f = loanUiFixture(), user = userEvent.setup();
    const send = vi.fn(f.gateway.act).mockRejectedValueOnce(new Error('Lost response')); mount(f, { ...f.gateway, act: send });
    await screen.findByText(/No posted balance/); await user.type(screen.getByLabelText('Action reason'), 'Original reason.');
    await user.click(screen.getByRole('button', { name: 'Post recorded movement' }));
    expect(await screen.findByRole('button', { name: 'Retry same submission' })).toBeVisible();
    expect(screen.getByLabelText('Action reason')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Retry same submission' }));
    expect(await screen.findByText(/Action recorded/)).toBeVisible(); expect(send.mock.calls[0]).toEqual(send.mock.calls[1]);
  });
  it('treats known unavailable as nonexecution and preserves the draft', async () => {
    const f = loanUiFixture(), user = userEvent.setup(); mount(f, { ...f.gateway, act: async () => { throw new ApiClientError(501, 'module_not_available', 'Posting unavailable'); } });
    await screen.findByText(/No posted balance/); await user.type(screen.getByLabelText('Action reason'), 'Keep this reason.');
    await user.click(screen.getByRole('button', { name: 'Post recorded movement' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Posting unavailable'); expect(screen.queryByText('Retry same submission')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Action reason')).toHaveValue('Keep this reason.');
  });
  it('prints only an explicitly selected saved receipt', async () => {
    const f = loanUiFixture(true), user = userEvent.setup(); mount(f);
    await screen.findByLabelText('Selected saved receipt'); expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Selected saved receipt'), f.receipt.receiptId!);
    const receipt = screen.getByRole('article', { name: 'Saved repayment receipt' });
    expect(within(receipt).getByText('₱10,000')).toBeVisible(); expect(receipt).toHaveTextContent(f.receipt.journalId);
    expect(within(receipt).queryByText('Action reason')).not.toBeInTheDocument();
  });
  it('requests labeled simulated intake without sending a trusted verification or amount', async () => {
    const f = loanUiFixture(), user = userEvent.setup(), send = vi.fn(f.gateway.act); f.view.commands[0].state = 'submitted';
    mount(f, { ...f.gateway, act: send }); await screen.findByRole('button', { name: 'Record simulated settlement' });
    await user.type(screen.getByLabelText('Action reason'), 'Fictional manual evidence review.');
    await user.click(screen.getByRole('button', { name: 'Record simulated settlement' }));
    expect(await screen.findByText(/Action recorded/)).toBeVisible();
    expect(send.mock.calls[0][1]).toEqual({ action: 'record_simulation', commandId: f.commandId, version: 4, reason: 'Fictional manual evidence review.' });
  });
  it('hides private content after scoped denial and never prints a cached receipt', async () => {
    const f = loanUiFixture(true), user = userEvent.setup(), load = vi.fn(f.gateway.workspace).mockResolvedValueOnce(f.view).mockRejectedValue(new ApiClientError(403, 'forbidden', 'Denied'));
    mount(f, { ...f.gateway, workspace: load }); await screen.findByLabelText('Selected saved receipt');
    await user.selectOptions(screen.getByLabelText('Selected saved receipt'), f.receipt.receiptId!); await user.click(screen.getByRole('button', { name: 'Refresh saved position' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable to the current account'); expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('does not load the financial workspace for a role-only administrator', async () => {
    const f = loanUiFixture(), load = vi.fn(f.gateway.workspace); f.session.user.roles = ['administrator']; mount(f, { ...f.gateway, workspace: load });
    expect(screen.getByText(/no loan servicing role/)).toBeVisible(); expect(load).not.toHaveBeenCalled();
  });
  it('treats a malformed successful write as uncertain instead of claiming success', async () => {
    const f = loanUiFixture(), user = userEvent.setup(); mount(f, { ...f.gateway, act: async () => ({ recorded: false } as never) });
    await screen.findByText(/No posted balance/); await user.type(screen.getByLabelText('Action reason'), 'Original reason.'); await user.click(screen.getByRole('button', { name: 'Post recorded movement' }));
    expect(await screen.findByRole('button', { name: 'Retry same submission' })).toBeVisible(); expect(screen.queryByText(/Action recorded/)).not.toBeInTheDocument();
  });
  it('ignores late resource responses after a different gateway is selected', async () => {
    const f = loanUiFixture(true); let resolve!: (v: typeof f.view) => void;
    const pending = new Promise<typeof f.view>(r => { resolve = r; });
    const first: LoanGateway = { ...f.gateway, workspace: async () => pending };
    const router = createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><StaffLoanWorkspace loanId={f.loanId} day="2026-11-02" session={f.session} gateway={first}/></UnsavedChangesProvider> }]);
    const rendered = render(<RouterProvider router={router}/>); rendered.unmount();
    mount(f, { ...f.gateway, workspace: async () => { throw new ApiClientError(501, 'module_not_available', 'Unavailable current source'); } });
    await screen.findByRole('alert'); await act(async () => resolve(f.view));
    expect(screen.queryByText('Original accepted schedule')).not.toBeInTheDocument(); expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('clears the selected receipt when the actual session branch scope changes', async () => {
    const f = loanUiFixture(true), user = userEvent.setup();
    const gateway = { ...f.gateway, workspace: vi.fn(f.gateway.workspace).mockResolvedValueOnce(f.view).mockRejectedValue(new ApiClientError(403, 'forbidden', 'Changed scope')) };
    function Harness() {
      const [session, setSession] = useState(f.session);
      return <><button onClick={() => setSession({ ...session, user: { ...session.user, branchIds: [testId(900)] } })}>Change test session scope</button><StaffLoanWorkspace loanId={f.loanId} day="2026-11-02" session={session} gateway={gateway}/></>;
    }
    render(<RouterProvider router={createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><Harness/></UnsavedChangesProvider> }])}/>);
    await screen.findByLabelText('Selected saved receipt'); await user.selectOptions(screen.getByLabelText('Selected saved receipt'), f.receipt.receiptId!);
    await user.click(screen.getByRole('button', { name: 'Change test session scope' }));
    expect(screen.queryByRole('article')).not.toBeInTheDocument(); expect(await screen.findByRole('alert')).toHaveTextContent('unavailable to the current account');
  });
});
