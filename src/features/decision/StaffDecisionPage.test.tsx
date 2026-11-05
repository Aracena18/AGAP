import { useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { UnsavedChangesProvider } from '../access/useUnsavedChanges';
import { StaffDecisionWorkspace } from './StaffDecisionPage';
import { staffUiFixture, testId } from './staff.test-fixture';
import type { StaffDecisionGateway } from './staff-gateway';
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function mount(f: ReturnType<typeof staffUiFixture>, gateway: StaffDecisionGateway = f.gateway) {
  const router = createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><StaffDecisionWorkspace applicationId={f.view.application.id} session={f.session} gateway={gateway}/></UnsavedChangesProvider> }]);
  return render(<RouterProvider router={router}/>);
}
async function prepare(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('heading', { name: 'Current review basis' });
  await user.click(screen.getByRole('radio', { name: 'Approve' }));
  await user.selectOptions(screen.getByLabelText('Offer considered'), testId(5));
  await user.type(screen.getByLabelText('Decision rationale'), 'Reviewed the exact checked cost and source limitations.');
  await user.type(screen.getByLabelText('Next review date'), '2026-12-01');
  await user.click(screen.getByRole('button', { name: 'Prepare exact preview' }));
  await screen.findByText('Preview only. No decision has been recorded.');
}
async function record(user: ReturnType<typeof userEvent.setup>) {
  await prepare(user); await user.click(screen.getByLabelText('I reviewed this exact explanation and terms.'));
  await user.click(screen.getByRole('button', { name: 'Record decision' }));
  return screen.findByRole('article', { name: 'Saved decision brief' });
}
afterEach(() => vi.restoreAllMocks());
describe('Phase 3 staff UI with explicitly fictional proposed gateway', () => {
  it('defaults to honest unavailable integration with no browser save fallback', async () => {
    const f = staffUiFixture(); const router = createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><StaffDecisionWorkspace applicationId={f.view.application.id} session={f.session}/></UnsavedChangesProvider> }]);
    render(<RouterProvider router={router}/>);
    expect(await screen.findByRole('alert')).toHaveTextContent('integration is unavailable');
    expect(screen.queryByRole('article')).not.toBeInTheDocument(); expect(localStorage.length).toBe(0);
  });
  it('displays supplied centavos and no implicit approval; invalidates acknowledgment on edits', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); mount(f);
    await screen.findByRole('heading', { name: 'Current review basis' });
    expect(screen.getByRole('radio', { name: 'Approve' })).not.toBeChecked();
    expect(screen.getByText('₱2,000')).toBeVisible(); expect(screen.getByText('₱1,000')).toBeVisible();
    await prepare(user); const check = screen.getByLabelText('I reviewed this exact explanation and terms.'); await user.click(check);
    await user.type(screen.getByLabelText('Decision rationale'), ' Changed.');
    expect(screen.queryByLabelText('I reviewed this exact explanation and terms.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
  });
  it('records exact preview proof once and renders only saved member-safe content', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), spy = vi.spyOn(f.gateway, 'record'); mount(f);
    const article = await record(user);
    expect(spy).toHaveBeenCalledTimes(1); expect(spy.mock.calls[0][2]).toBe(testId(11)); expect(spy.mock.calls[0][3]).toMatchObject({ version: 2, csrfToken: f.session.csrfToken });
    expect(within(article).getByText('₱36,000')).toBeVisible(); expect(within(article).getByText('₱6,000')).toBeVisible();
    expect(article).not.toHaveTextContent('approvalLimitCentavos');
    expect(screen.getByRole('status')).toHaveTextContent('Decision recorded: approve');
    expect(screen.getByRole('radio', { name: 'Approve' })).toBeDisabled();
  });
  it('recovers an unknown committed recording with identical body/version/proof/key after preview expiry', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), real = f.gateway.record;
    const calls: Parameters<StaffDecisionGateway['record']>[] = [];
    f.gateway.record = vi.fn().mockImplementationOnce(async (...args: Parameters<StaffDecisionGateway['record']>) => { calls.push(structuredClone(args)); await real(...args); throw new TypeError('Lost successful response'); }).mockImplementation(async (...args: Parameters<StaffDecisionGateway['record']>) => {
      calls.push(structuredClone(args)); const d = f.history.items[0]; return { id: d.id, applicationId: d.applicationId, inputVersion: d.inputVersion, outcome: d.outcome, recordedAt: d.recordedAt, reviewerId: d.reviewerId, snapshotHash: d.snapshotHash };
    });
    mount(f); await prepare(user); await user.click(screen.getByLabelText('I reviewed this exact explanation and terms.')); await user.click(screen.getByRole('button', { name: 'Record decision' }));
    const retry = await screen.findByRole('button', { name: 'Retry the same submission' });
    expect(screen.getByLabelText('Decision rationale')).toBeDisabled();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3600_000);
    await waitFor(() => expect(screen.getByText(/Preview expired/)).toBeVisible(), { timeout: 2000 });
    await user.click(retry);
    await screen.findByRole('article', { name: 'Saved decision brief' });
    expect(calls).toHaveLength(2); expect(calls[0]).toEqual(calls[1]); expect(f.history.items).toHaveLength(1);
  });
  it('keeps confirmed recording success when its brief read fails', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), spy = vi.spyOn(f.gateway, 'record'); f.gateway.brief = vi.fn().mockRejectedValue(new Error('Read service down')); mount(f);
    await prepare(user); await user.click(screen.getByLabelText('I reviewed this exact explanation and terms.')); await user.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('selected brief is unavailable'); expect(screen.getByRole('status')).toHaveTextContent('Decision recorded'); expect(spy).toHaveBeenCalledTimes(1);
  });
  it('renders missing checked figures as unavailable and permits only clarification for incomplete data', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); f.view.assessment = null; f.view.offers[0].checked = null; f.view.offers[0].outcomes = []; mount(f);
    await screen.findByRole('heading', { name: 'Current review basis' }); expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(1);
    expect(screen.getByRole('radio', { name: 'Approve' })).toBeDisabled(); await user.click(screen.getByRole('radio', { name: 'Return for clarification' }));
    await user.type(screen.getByLabelText('Clarification needed and next step'), 'Please confirm the source and missing amount.');
    await user.type(screen.getByLabelText('Reason for departing from the recommendation'), 'Incomplete basis.');
    await user.type(screen.getByLabelText('Next review date'), '2026-12-01'); await user.click(screen.getByRole('button', { name: 'Prepare exact preview' }));
    expect(await screen.findByText('Preview only. No decision has been recorded.')).toBeVisible();
  });
  it('preserves unsent text across same-record refresh but hides stale figures and preview', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), pending = deferred<typeof f.view>(); mount(f); await prepare(user);
    f.gateway.workspace = vi.fn().mockReturnValue(pending.promise);
    await user.click(screen.getByRole('button', { name: 'Refresh current basis' }));
    expect(screen.queryByRole('heading', { name: 'Current review basis' })).not.toBeInTheDocument(); expect(screen.queryByText('₱2,000')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Decision rationale')).toHaveValue('Reviewed the exact checked cost and source limitations.');
    expect(screen.queryByLabelText('I reviewed this exact explanation and terms.')).not.toBeInTheDocument();
    await act(async () => pending.resolve(f.view)); await screen.findByRole('heading', { name: 'Current review basis' });
  });
  it('preserves a decision draft but prevents rebinding it to a changed application during refresh',async()=>{
    const user=userEvent.setup(),f=staffUiFixture();mount(f);await prepare(user);
    f.view.application.version+=1;
    await user.click(screen.getByRole('button',{name:'Refresh current basis'}));await screen.findByRole('heading',{name:'Current review basis'});
    expect(await screen.findByText(/decision draft belongs to an older application/)).toBeVisible();
    expect(screen.getByLabelText('Decision rationale')).toHaveValue('Reviewed the exact checked cost and source limitations.');
    expect(screen.getByRole('button',{name:'Prepare exact preview'})).toBeDisabled();
    await user.click(screen.getByRole('button',{name:'Clear decision draft'}));
    expect(screen.getByLabelText('Decision rationale')).toHaveValue('');
  });
  it('does not fall back to latest or print a denied selected historical brief', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); mount(f); await record(user);
    f.history.items.push({ ...f.history.items[0], id: testId(40) });
    await user.click(screen.getByRole('button', { name: 'Refresh current basis' })); await screen.findByRole('heading', { name: 'Current review basis' });
    f.gateway.brief = vi.fn().mockRejectedValue(new ApiClientError(404, 'not_found', 'Selected record unavailable'));
    await user.selectOptions(screen.getByLabelText('Selected saved decision'), testId(40));
    await screen.findByRole('alert'); expect(screen.queryByRole('article', { name: 'Saved decision brief' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Print selected saved brief' })).not.toBeInTheDocument();
  });
  it('removes private content after a scoped read denial', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); mount(f); await screen.findByRole('heading', { name: 'Current review basis' });
    f.gateway.workspace = vi.fn().mockRejectedValue(new ApiClientError(403, 'forbidden', 'Denied'));
    await user.click(screen.getByRole('button', { name: 'Refresh current basis' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unavailable to the current account'); expect(screen.queryByText(f.view.application.memberName)).not.toBeInTheDocument();
  });
  it('blocks role-only administrators before loading decision data', () => {
    const f = staffUiFixture(); f.session.user.roles = ['administrator']; const spy = vi.spyOn(f.gateway, 'workspace'); mount(f);
    expect(screen.getByText('This account has no staff decision role.')).toBeVisible(); expect(spy).not.toHaveBeenCalled();
  });
  it('treats known 501 as nonexecution rather than an uncertain save', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); f.gateway.preview = vi.fn().mockRejectedValue(new ApiClientError(501, 'module_not_available', 'Preview integration unavailable'));
    mount(f); await screen.findByRole('heading', { name: 'Current review basis' }); await user.click(screen.getByRole('radio', { name: 'Approve' })); await user.selectOptions(screen.getByLabelText('Offer considered'), testId(5)); await user.type(screen.getByLabelText('Decision rationale'), 'Human reason.'); await user.type(screen.getByLabelText('Next review date'), '2026-12-01'); await user.click(screen.getByRole('button', { name: 'Prepare exact preview' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Preview integration unavailable'); expect(screen.queryByRole('button', { name: 'Retry the same submission' })).not.toBeInTheDocument(); expect(screen.getByLabelText('Decision rationale')).not.toBeDisabled();
  });
  it('serializes double preview clicks and keeps unknown preview attempts recoverable', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); const call = vi.fn().mockRejectedValue(new TypeError('Network down')); f.gateway.preview = call;
    mount(f); await screen.findByRole('heading', { name: 'Current review basis' }); await user.click(screen.getByRole('radio', { name: 'Approve' })); await user.selectOptions(screen.getByLabelText('Offer considered'), testId(5)); await user.type(screen.getByLabelText('Decision rationale'), 'Human reason.'); await user.type(screen.getByLabelText('Next review date'), '2026-12-01'); await user.dblClick(screen.getByRole('button', { name: 'Prepare exact preview' }));
    await screen.findByRole('button', { name: 'Retry the same submission' }); expect(call).toHaveBeenCalledTimes(1); expect(screen.getByLabelText('Decision rationale')).toBeDisabled();
  });
  it('ignores late loads from a previously selected application', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), slow = deferred<typeof f.view>();
    f.gateway.workspace = vi.fn(async id => id === f.view.application.id ? slow.promise : { ...f.view, application: { ...f.view.application, id, memberName: 'Fictional second application' } });
    function Switcher() { const [id, setId] = useState(f.view.application.id); return <><button onClick={() => setId(testId(99))}>Switch application</button><StaffDecisionWorkspace applicationId={id} session={f.session} gateway={f.gateway}/></>; }
    const router = createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><Switcher/></UnsavedChangesProvider> }]);
    render(<RouterProvider router={router}/>); await user.click(screen.getByRole('button', { name: 'Switch application' }));
    await screen.findByText('Fictional second application'); await act(async () => slow.resolve(f.view));
    expect(screen.queryByText(f.view.application.memberName)).not.toBeInTheDocument(); expect(screen.getByText('Fictional second application')).toBeVisible();
  });
  it('ignores late historical responses and never shows a previous selected brief while loading', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); mount(f); const article = await record(user);
    const original = f.briefs.get(testId(13))!, slow = deferred<typeof original>();
    f.history.items.push({ ...f.history.items[0], id: testId(40) });
    await user.click(screen.getByRole('button', { name: 'Refresh current basis' })); await screen.findByRole('heading', { name: 'Current review basis' });
    f.gateway.brief = vi.fn(async (_app, id) => id === testId(40) ? slow.promise : original);
    await user.selectOptions(screen.getByLabelText('Selected saved decision'), testId(40));
    expect(article).not.toBeInTheDocument(); expect(screen.queryByRole('article')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Selected saved decision'), testId(13)); await screen.findByRole('article');
    await act(async () => slow.resolve({ ...original, id: testId(40), explanation: 'Late historical content must stay hidden.' }));
    expect(screen.queryByText('Late historical content must stay hidden.')).not.toBeInTheDocument();
  });
  it('keeps a malformed successful recording uncertain instead of claiming success', async () => {
    const user = userEvent.setup(), f = staffUiFixture(), real = f.gateway.record;
    f.gateway.record = async (...args) => ({ ...await real(...args), applicationId: testId(99) });
    mount(f); await prepare(user); await user.click(screen.getByLabelText('I reviewed this exact explanation and terms.')); await user.click(screen.getByRole('button', { name: 'Record decision' }));
    await screen.findByRole('button', { name: 'Retry the same submission' }); expect(screen.queryByRole('article')).not.toBeInTheDocument(); expect(screen.queryByText(/Decision recorded: approve/)).not.toBeInTheDocument();
  });
  it('identifies invalid fields and focuses the recoverable error summary', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); mount(f); await screen.findByRole('heading', { name: 'Current review basis' });
    await user.click(screen.getByRole('radio', { name: 'Approve' })); await user.selectOptions(screen.getByLabelText('Offer considered'), testId(5)); await user.type(screen.getByLabelText('Next review date'), '2026-12-01');
    await user.click(screen.getByRole('button', { name: 'Prepare exact preview' }));
    const alert = await screen.findByRole('alert'); expect(alert.closest('[tabindex]')).toHaveFocus(); expect(screen.getByLabelText('Decision rationale')).toHaveAttribute('aria-invalid', 'true');
  });
  it('requires a new reviewed preview after a confirmed recording conflict', async () => {
    const user = userEvent.setup(), f = staffUiFixture(); f.gateway.record = vi.fn().mockRejectedValue(new ApiClientError(409, 'review_preview_changed', 'Prepare a new exact preview.'));
    mount(f); await prepare(user); await user.click(screen.getByLabelText('I reviewed this exact explanation and terms.')); await user.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Prepare a new exact preview.'); expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument(); expect(screen.getByLabelText('Decision rationale')).not.toBeDisabled();
  });
});
