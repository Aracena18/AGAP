import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceProvider, useWorkspace } from '../../app/WorkspaceContext';
import { createDemoCases } from '../../demo/cases';
import { STORAGE_KEY } from '../../demo/persistence';
import { makeRecommendation, recordDecision } from '../../domain/review';
import type { CaseRecord } from '../../domain/types';
import DecisionPage from './DecisionPage';

function Harness({ id }: { id: string }) {
  const { records, setRole } = useWorkspace();
  const record = records.find(item => item.id === id);
  return <><button onClick={() => setRole('reviewer')}>Use reviewer demo role</button>{record && <DecisionPage record={record} />}</>;
}
function renderCase(record: CaseRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, records: createDemoCases().map(item => item.id === record.id ? record : item) }));
  render(<WorkspaceProvider><Harness id={record.id} /></WorkspaceProvider>);
}
function preparedAna() {
  const record = createDemoCases()[0];
  Object.assign(record.facts[1], { value: 2400000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20' });
  return makeRecommendation(record, 'payday-aligned', 'Discussed the full cost and date.', { name: 'Officer', role: 'officer' }, '2026-10-20T12:00:00Z');
}
beforeEach(() => localStorage.clear());

describe('decision page workflow', () => {
  it('lets the reviewer return Cora despite incomplete evidence and no recommendation', async () => {
    const user = userEvent.setup(); renderCase(createDemoCases()[2]);
    expect(await screen.findByText(/Switch to the demo reviewer role/i)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Use reviewer demo role' }));
    expect(screen.getByRole('radio', { name: 'Return for clarification' })).toBeChecked();
    await user.type(screen.getByLabelText('Clarification needed and next step'), 'Please confirm take-home income with a dated source.');
    await user.click(screen.getByLabelText(/I reviewed the template explanation/i));
    await user.click(screen.getByRole('button', { name: 'Record decision' }));
    const brief = await screen.findByRole('article', { name: 'Saved member brief' });
    expect(within(brief).getByText(/returned for clarification by the demo reviewer/i)).toBeVisible();
    expect(within(brief).getByText(/Please confirm take-home income/)).toBeVisible();
    expect(within(brief).getAllByText(/Member circumstances discussion/).length).toBeGreaterThan(0);
  });
  it('resets the explanation confirmation when the rationale changes and shows field errors', async () => {
    const user = userEvent.setup(); renderCase(preparedAna());
    await screen.findByRole('heading', { name: 'Decision and explanation' });
    await user.click(screen.getByRole('button', { name: 'Use reviewer demo role' }));
    await user.click(screen.getByLabelText(/I reviewed the template explanation/i));
    await user.type(screen.getByLabelText('Decision rationale'), 'Checked the evidence.');
    expect(screen.getByLabelText(/I reviewed the template explanation/i)).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Record decision' }));
    expect(await screen.findByText(/Review the template explanation and confirm it before recording/i)).toBeVisible();
    expect(screen.getByLabelText(/I reviewed the template explanation/i)).toHaveFocus();
    expect(screen.queryByRole('article', { name: 'Saved member brief' })).not.toBeInTheDocument();
  });
  it('prints saved explanation and source titles while later follow-up stays separate', async () => {
    const user = userEvent.setup();
    const record = recordDecision(preparedAna(), { outcome: 'approve', offerId: 'payday-aligned', rationale: 'Member considered the full cost.', departureReason: '', exceptions: [], reviewDate: '2026-12-01', explanationReviewed: true }, { name: 'Reviewer', role: 'reviewer' }, '2026-10-20T12:00:00Z');
    record.version += 1; record.facts[1].value = 100;
    renderCase(record);
    const brief = await screen.findByRole('article', { name: 'Saved member brief' });
    expect(within(brief).getByText(/Historical decision.*renewed review/i)).toBeVisible();
    expect(within(brief).getByText(/monthly remaining money is ₱2,000/)).toBeVisible();
    expect(within(brief).getAllByText(/Current payslip.*Oct 20, 2026/).length).toBeGreaterThan(0);
    const savedText = brief.textContent;
    await user.type(screen.getByLabelText('Follow-up note'), 'Discussed new circumstances.');
    await user.click(screen.getByRole('button', { name: 'Save follow-up' }));
    expect(await screen.findByText('Follow-up saved. The recorded decision and member brief are unchanged.')).toBeVisible();
    expect(brief.textContent).toBe(savedText);
  });
});
