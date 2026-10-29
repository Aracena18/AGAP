import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createDemoCases } from '../../demo/cases';
import type { CaseRecord, DemoRole } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import EvidencePage from './EvidencePage';
import { assessCase } from '../../domain/assessment';

vi.mock('../../app/WorkspaceContext', () => ({ useWorkspace: vi.fn() }));

function renderPage(index = 0, role: DemoRole = 'officer', failure = false, initialRecord = createDemoCases()[index], saveAttempt: (record: CaseRecord) => void = () => {}) {
  function Harness() {
    const [record, setRecord] = useState(initialRecord);
    vi.mocked(useWorkspace).mockReturnValue({
      records: [record], ready: true, role, actor: { name: role === 'officer' ? 'Mara Santos' : 'Luis Reyes', role },
      setRole: () => {}, storageWarning: '', resetDemo: async () => {},
      saveCase: async (next: CaseRecord) => {
        saveAttempt(next);
        if (failure) throw new Error('Storage is unavailable. Try saving again.');
        setRecord(next);
      },
    });
    return <EvidencePage record={record} />;
  }
  render(<MemoryRouter initialEntries={['/applications/AG-001/evidence']}><Routes><Route path="/applications/:id/evidence" element={<Harness />} /></Routes></MemoryRouter>);
  return userEvent.setup();
}

describe('EvidencePage', () => {
  it('requires a deliberate status and reason before saving the current payslip candidate', async () => {
    const user = renderPage();
    expect(screen.queryByRole('link', { name: /compare repayments/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /resolve conflict for monthly take-home pay/i }));
    const form = screen.getByRole('form', { name: /correct monthly take-home pay/i });
    expect(within(form).getByText('₱28,000')).toBeVisible();
    expect(within(form).getByText('₱24,000')).toBeVisible();
    await user.selectOptions(within(form).getByLabelText('Supporting source'), 'payslip');
    expect(within(form).getByLabelText('Amount (PHP)')).toHaveValue('24000');
    expect(within(form).getByLabelText('Effective date')).toHaveValue('2026-10-20');
    expect(within(form).getByLabelText('Evidence status')).toHaveValue('');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    expect(within(form).getByLabelText('Evidence status')).toHaveAttribute('aria-invalid', 'true');
    expect(within(form).getByLabelText('Reason for correction')).toHaveAttribute('aria-invalid', 'true');
    await user.selectOptions(within(form).getByLabelText('Evidence status'), 'document-supported');
    await user.type(within(form).getByLabelText('Reason for correction'), 'Current payslip confirmed with the member.');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    expect(await screen.findByRole('link', { name: /compare repayments/i })).toHaveAttribute('href', '/applications/AG-001/comparison');
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    await user.click(screen.getByText(/correction history/i));
    expect(screen.getByText('Current payslip confirmed with the member.')).toBeVisible();
    expect(screen.getAllByText('₱28,000').length).toBeGreaterThan(0);
  });

  it('associates excessive decimal precision with the PHP amount field', async () => {
    const user = renderPage();
    await user.click(screen.getByRole('button', { name: /resolve conflict for monthly take-home pay/i }));
    const form = screen.getByRole('form');
    const amount = within(form).getByLabelText('Amount (PHP)');
    await user.clear(amount);
    await user.type(amount, '24000.001');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(amount).toHaveAccessibleDescription(/at most two decimal places/i);
    expect(screen.queryByRole('link', { name: /compare repayments/i })).not.toBeInTheDocument();
  });

  it('offers Cora a member statement and records clarified income without treating unavailable as zero', async () => {
    const user = renderPage(2);
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /clarify monthly take-home pay/i }));
    const form = screen.getByRole('form');
    await user.type(within(form).getByLabelText('Amount (PHP)'), '21000.75');
    await user.selectOptions(within(form).getByLabelText('Supporting source'), 'statement');
    await user.selectOptions(within(form).getByLabelText('Evidence status'), 'member-reported');
    await user.type(within(form).getByLabelText('Reason for correction'), 'Member clarified monthly income.');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    expect(await within(screen.getByRole('region', { name: 'Income' })).findByText('₱21,000.75')).toBeVisible();
    expect(screen.getByRole('link', { name: /compare repayments/i })).toBeVisible();
  });

  it('keeps reviewer evidence read-only while allowing source inspection', async () => {
    const user = renderPage(0, 'reviewer');
    expect(screen.getByText(/read-only review/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /resolve conflict|correct|clarify/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /view source for rent/i }));
    expect(within(screen.getByRole('complementary', { name: /source details/i })).getByText(/Opening spendable cash PHP 9,000/)).toBeVisible();
  });

  it('keeps the correction draft visible when saving fails', async () => {
    const user = renderPage(1, 'officer', true);
    await user.click(screen.getByRole('button', { name: /correct monthly take-home pay/i }));
    const form = screen.getByRole('form');
    await user.type(within(form).getByLabelText('Reason for correction'), 'Confirmed the existing amount.');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Storage is unavailable. Try saving again.');
    expect(screen.getByRole('form')).toBeVisible();
    expect(within(form).getByLabelText('Reason for correction')).toHaveValue('Confirmed the existing amount.');
    expect(screen.getByText(/No corrections yet/i)).toBeVisible();
  });
});


describe('evidence readiness and correction integrity', () => {
  it.each(['missing', 'duplicate', 'date', 'title', 'excerpt', 'kind mismatch'] as const)('shows specific issues for a %s referenced source', kind => {
    const record = createDemoCases()[1];
    if (kind === 'missing') record.sources = record.sources.filter(source => source.id !== 'payslip');
    else if (kind === 'duplicate') record.sources.push({ ...record.sources[0], title: 'Duplicate payslip' });
    else if (kind === 'date') record.sources[0].date = '2026-02-30';
    else if (kind === 'title') record.sources[0].title = '   ';
    else if (kind === 'excerpt') record.sources[0].excerpt = '';
    else record.facts[1].sourceId = 'statement';
    renderPage(1, 'officer', false, record);
    expect(screen.getByText('Evidence needs attention')).toBeVisible();
    expect(screen.queryByText('Evidence ready', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Evidence issues' })).toHaveTextContent(/Monthly take-home pay/);
    expect(assessCase(record).status).toBe('incomplete');
    if (kind === 'duplicate') {
      const panel = screen.getByRole('complementary', { name: 'Source details' });
      expect(within(panel).getByRole('heading', { name: 'Ambiguous source reference' })).toBeVisible();
      expect(within(panel).queryByText('Duplicate payslip')).not.toBeInTheDocument();
      expect(within(panel).queryByText('Current payslip')).not.toBeInTheDocument();
    }
  });

  it('reports a missing category without assuming a fact row exists', () => {
    const record = createDemoCases()[1];
    record.facts = record.facts.filter(fact => fact.category !== 'expense');
    renderPage(1, 'officer', false, record);
    expect(screen.getByText('Evidence needs attention')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Evidence issues' })).toHaveTextContent('Record expense information explicitly');
    expect(screen.getByText(/Resolve the listed evidence issues/)).toBeVisible();
  });

  it('blocks readiness for an incomplete optional expense included in the calculation', () => {
    const record = createDemoCases()[1];
    Object.assign(record.facts[2], { critical: false, value: null, status: 'missing', sourceId: null });
    renderPage(1, 'officer', false, record);
    expect(screen.getByText('Evidence needs attention')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Evidence issues' })).toHaveTextContent('Rent needs a confirmed value');
  });

  it.each(['absent offers', 'invalid offer', 'unused sources'] as const)('keeps evidence ready despite %s', kind => {
    const record = createDemoCases()[1];
    if (kind === 'absent offers') record.offers = [];
    else if (kind === 'invalid offer') record.offers[0].payments = [];
    else record.sources.push(
      { id: 'unused', title: '', kind: 'document', date: 'invalid', excerpt: '' },
      { id: 'unused', title: '', kind: 'document', date: 'invalid', excerpt: '' },
    );
    renderPage(1, 'officer', false, record);
    expect(screen.getByText('Evidence ready', { exact: true })).toBeVisible();
    expect(screen.getByRole('link', { name: /Compare repayments/ })).toBeVisible();
    expect(assessCase(record).status).toBe(kind === 'unused sources' ? 'complete' : 'incomplete');
  });

  it('preserves the correction draft and avoids persistence for an ambiguous source', async () => {
    const record = createDemoCases()[0];
    record.sources.push({ ...record.sources[0], title: 'Duplicate payslip' });
    const before = structuredClone(record);
    const saveAttempt = vi.fn();
    const user = renderPage(0, 'officer', false, record, saveAttempt);
    await user.click(screen.getByRole('button', { name: /Resolve conflict for Monthly take-home pay/i }));
    const form = screen.getByRole('form');
    await user.clear(within(form).getByLabelText('Amount (PHP)'));
    await user.type(within(form).getByLabelText('Amount (PHP)'), '24500.25');
    await user.selectOptions(within(form).getByLabelText('Evidence status'), 'document-supported');
    await user.type(within(form).getByLabelText('Reason for correction'), 'Keep this draft while resolving sources.');
    await user.selectOptions(within(form).getByLabelText('Supporting source'), 'payslip');
    expect(within(form).getByLabelText('Amount (PHP)')).toHaveValue('24500.25');
    expect(within(form).getByLabelText('Effective date')).toHaveValue('2026-09-20');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    const source = within(form).getByLabelText('Supporting source');
    expect(source).toHaveAttribute('aria-invalid', 'true');
    expect(within(source).getByRole('option', { name: 'Ambiguous source reference (payslip)' })).toHaveProperty('selected', true);
    expect(source).toHaveAccessibleDescription(/unambiguous supporting source/);
    expect(source).toHaveFocus();
    expect(within(form).getByLabelText('Amount (PHP)')).toHaveValue('24500.25');
    expect(within(form).getByLabelText('Reason for correction')).toHaveValue('Keep this draft while resolving sources.');
    expect(saveAttempt).not.toHaveBeenCalled();
    expect(record).toEqual(before);
  });

  it('preserves a single editor and focuses a form error for an ambiguous target fact', async () => {
    const record = createDemoCases()[1];
    record.facts.push({ ...record.facts[1] });
    const before = structuredClone(record);
    const saveAttempt = vi.fn();
    const user = renderPage(1, 'officer', false, record, saveAttempt);
    await user.click(screen.getAllByRole('button', { name: /Correct Monthly take-home pay/i })[0]);
    const form = screen.getByRole('form');
    await user.type(within(form).getByLabelText('Reason for correction'), 'Keep this correction draft.');
    await user.click(within(form).getByRole('button', { name: 'Save correction' }));
    const error = within(form).getByRole('alert');
    expect(error).toHaveTextContent(/fact reference is ambiguous/i);
    expect(error).toHaveFocus();
    expect(screen.getAllByRole('form')).toHaveLength(1);
    expect(within(form).getByLabelText('Reason for correction')).toHaveValue('Keep this correction draft.');
    expect(saveAttempt).not.toHaveBeenCalled();
    expect(record).toEqual(before);
  });
});
