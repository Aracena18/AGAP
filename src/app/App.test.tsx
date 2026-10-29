import { describe, beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkspaceProvider } from './WorkspaceContext';
import App from './App';
vi.mock('../features/access/StaffContext',()=>({useStaff:()=>({session:null,signedOut:()=>{}})}));

describe('application workspace', () => {
  beforeEach(() => localStorage.clear());
  function open() { render(<MemoryRouter initialEntries={['/applications']}><WorkspaceProvider><App /></WorkspaceProvider></MemoryRouter>); }
  it('shows fictional cases and filters by member without losing the other cases', async () => {
    open();
    expect(await screen.findByRole('heading', { name: 'Loan applications' })).toBeInTheDocument();
    const search = screen.getByRole('searchbox', { name: 'Search' });
    await userEvent.type(search, 'Cora');
    expect(screen.getByText('Cora Reyes')).toBeInTheDocument();
    expect(screen.queryByText('Ana Dela Cruz')).not.toBeInTheDocument();
    await userEvent.clear(search);
    expect(screen.getByText('Ana Dela Cruz')).toBeInTheDocument();
  });
  it('names the demo role and preserves a keyboard-accessible review link', async () => {
    open();
    await screen.findByText('Ana Dela Cruz');
    await userEvent.click(screen.getByText('Demo tools',{exact:true}));
    await userEvent.selectOptions(screen.getByLabelText('Demo role'), 'reviewer');
    expect(screen.getByLabelText('Demo role')).toHaveValue('reviewer');
    expect(screen.getByRole('link', { name: 'Review Ana Dela Cruz' })).toHaveAttribute('href', '/applications/AG-001/evidence');
  });
});
