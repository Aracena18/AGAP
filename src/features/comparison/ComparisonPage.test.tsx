import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider } from '../../app/WorkspaceContext';
import { createDemoCases } from '../../demo/cases';
import ComparisonPage from './ComparisonPage';

afterEach(cleanup);

function resolvedAna() {
  const record = createDemoCases()[0];
  Object.assign(record.facts[1], {
    value: 2_400_000, status: 'document-supported', sourceId: 'payslip', effectiveDate: '2026-10-20',
  });
  return record;
}

function renderPage(record = resolvedAna()) {
  return render(<MemoryRouter><WorkspaceProvider><ComparisonPage record={record} /></WorkspaceProvider></MemoryRouter>);
}

describe('Repayment comparison', () => {
  it('pairs monthly remaining with dated cash and updates the dated result when the schedule changes', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole('heading', { name: 'Repayment comparison', level: 1 })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Monthly remaining' })).getByText('₱2,000')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Lowest dated cash balance' })).getByText('−₱2,000')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /After-payday schedule/ }));
    expect(within(screen.getByRole('region', { name: 'Monthly remaining' })).getByText('₱2,000')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Lowest dated cash balance' })).getByText('₱1,000')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /After-payday schedule cash balance/ })).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: /Dated cash movements/ })).getByText('Nov 16, 2026')).toBeInTheDocument();
  });

  it('shows full cost and source-linked movements without adding reserved proceeds', () => {
    renderPage();
    const costs = screen.getByRole('table', { name: /Full offer costs/ });
    expect(within(costs).getAllByText('₱36,000')).toHaveLength(2);
    expect(within(costs).getAllByText('₱6,000')).toHaveLength(2);
    expect(within(costs).getByText('Net amount received')).toBeInTheDocument();
    const movements = screen.getByRole('table', { name: /Dated cash movements/ });
    expect(within(movements).getByRole('link', { name: /Current payslip/ }))
      .toHaveAttribute('href', '/applications/AG-001/evidence#source-payslip');
    expect(screen.getByText(/Loan proceeds are reserved/)).toBeInTheDocument();
  });

  it('keeps Ben’s overall shortfall visible when switching the repayment date', async () => {
    const user = userEvent.setup();
    renderPage(createDemoCases()[1]);
    expect(screen.getByText(/Changing the repayment date cannot remove this monthly shortfall/)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /After-payday schedule/ }));
    expect(within(screen.getByRole('region', { name: 'Monthly remaining' })).getByText('−₱4,000')).toBeInTheDocument();
    expect(screen.getByText(/Changing the repayment date cannot remove this monthly shortfall/)).toBeInTheDocument();
  });

  it.each([0, 2])('shows focused evidence guidance instead of calculated figures for incomplete case %s', index => {
    renderPage(createDemoCases()[index]);
    expect(screen.getByRole('heading', { name: 'Evidence needs clarification' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Monthly remaining' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table', { name: /Full offer costs/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review evidence' })).toHaveAttribute('href', `/applications/${createDemoCases()[index].id}/evidence`);
  });
});
