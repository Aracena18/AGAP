import { describe, expect, it, vi } from 'vitest';
import { AgapClient } from '../../../packages/api-client/src';
import { connectedLoans } from './loan-gateway';
import { testId } from '../decision/staff.test-fixture';
describe('connected loan gateway', () => {
  it('submits the captured release without rereading financial values or sending private verification', async () => {
    const loanId=testId(301), client=new AgapClient(), prepare=vi.spyOn(client,'prepareLoanRelease').mockResolvedValue({id:testId(302),version:1}), load=vi.spyOn(client,'getStaffLoanWorkspace');
    const payload={loanId,amountCentavos:1000000,currency:'PHP' as const,effectiveDate:'2026-11-05',method:'cash' as const,instrumentReference:'FIC-CAPTURED',reason:'Checked original terms.'};
    const input={action:'prepare_release' as const,commandId:null,version:null,reason:payload.reason,payload};
    const options={idempotencyKey:'original-key',csrfToken:'original-csrf'};
    await connectedLoans(client).act(loanId,input,options);
    await connectedLoans(client).act(loanId,input,options);
    expect(prepare.mock.calls).toEqual([[loanId,payload,options],[loanId,payload,options]]);expect(load).not.toHaveBeenCalled();
  });
  it('targets the captured existing unknown command with its original version', async () => {
    const client=new AgapClient(), check=vi.spyOn(client,'checkFictionalSettlement').mockResolvedValue({id:testId(302),version:5});
    await connectedLoans(client).act(testId(301),{action:'check_simulation',commandId:testId(302),version:4,reason:'Inspect existing movement.'},{idempotencyKey:'same-key',csrfToken:'csrf'});
    expect(check).toHaveBeenCalledWith(testId(301),testId(302),{reason:'Inspect existing movement.'},{idempotencyKey:'same-key',csrfToken:'csrf',version:4});
  });
  it('rejects a financial payload captured for a different loan before HTTP', async () => {
    const client=new AgapClient(), prepare=vi.spyOn(client,'prepareLoanRelease');
    await expect(connectedLoans(client).act(testId(301),{action:'prepare_release',commandId:null,version:null,reason:'Checked terms.',payload:{loanId:testId(999),amountCentavos:1000000,currency:'PHP',effectiveDate:'2026-11-05',method:'cash',instrumentReference:'FIC-1',reason:'Checked terms.'}},{idempotencyKey:'key',csrfToken:'csrf'})).rejects.toThrow('another loan');
    expect(prepare).not.toHaveBeenCalled();
  });
});
