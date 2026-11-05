import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStaff } from '../access/StaffContext';
import { Notice } from '../../shared/ui';
import StaffLoanPage from './StaffLoanPage';
import { connectedLoans } from './loan-gateway';
export default function ConnectedLoanPage() {
  const { id } = useParams(), { client } = useStaff();
  const gateway = useMemo(() => connectedLoans(client), [client]);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  if (!id) return <Notice>Choose a saved loan.</Notice>;
  return <div className="stack"><Link to="/staff/lending">Back to lending and payments</Link><StaffLoanPage loanId={id} day={today} gateway={gateway}/></div>;
}
