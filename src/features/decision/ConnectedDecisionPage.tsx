import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStaff } from '../access/StaffContext';
import { Notice } from '../../shared/ui';
import StaffDecisionPage from './StaffDecisionPage';
import { connectedStaffDecisions } from './staff-gateway';

export default function ConnectedDecisionPage(){
  const {id}=useParams(),{client,session}=useStaff();
  const gateway=useMemo(()=>connectedStaffDecisions(client),[client]);
  if(!id||!session)return <Notice>Sign in and choose an application.</Notice>;
  return <div className="stack"><Link to="/staff/applications">Back to applications</Link><StaffDecisionPage applicationId={id} gateway={gateway} reviewClient={client}/></div>;
}
