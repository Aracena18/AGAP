import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createDemoCases } from '../../demo/cases';
import type { CaseRecord, DemoRole } from '../../domain/types';
import { useWorkspace } from '../../app/WorkspaceContext';
import EvidencePage from './EvidencePage';

vi.mock('../../app/WorkspaceContext', () => ({ useWorkspace: vi.fn() }));

function renderPage(index = 0, role: DemoRole = 'officer', failure = false) {
  function Harness() {
    const [record, setRecord] = useState(createDemoCases()[index]);
    vi.mocked(useWorkspace).mockReturnValue({
      records: [record], ready: true, role, actor: { name: role === 'officer' ? 'Mara Santos' : 'Luis Reyes', role },
      setRole: () => {}, storageWarning: '', resetDemo: async () => {},
      saveCase: async (next: CaseRecord) => {
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
    expect(screen.getByText(/demo officer updates evidence/i)).toBeVisible();
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
    expect(screen.getByText(/No corrections recorded/i)).toBeVisible();
  });
});
