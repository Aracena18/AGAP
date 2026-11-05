import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { DatedScenarioSchema } from '../../../packages/contracts/src/schemas';
import { CheckedRemaining } from './CheckedRemaining';

it('shows each supplied month segment and the horizon total without manufacturing a monthly average',()=>{
  const offerId='30000000-0000-4000-8000-000000000001';
  const scenario=DatedScenarioSchema.parse({format:'dated-scenario/v1',offerVersionId:offerId,monthlyRemainingCentavos:null,
    lowestBalanceCentavos:200000,closingBalanceCentavos:1177000,totalRepaymentCentavos:100000,financingCostCentavos:3000,shortageDates:[],policyChecks:[],
    workflow:{offerId,label:'Fictional presentation result',horizonNetCentavos:977000,lowestBalanceCentavos:200000,closingBalanceCentavos:1177000,
      totalRepaymentCentavos:100000,financingCostCentavos:3000,shortageDates:[],checks:[],daily:[],
      months:[{month:'2026-11',remainingCentavos:430000},{month:'2026-12',remainingCentavos:547000}]}});
  render(<dl><CheckedRemaining scenario={scenario}/></dl>);
  expect(screen.getByText('Full-horizon remaining')).toBeVisible();
  expect(screen.getByText('2026-11 reviewed segment remaining')).toBeVisible();
  expect(screen.getByText('2026-12 reviewed segment remaining')).toBeVisible();
  expect(screen.getByText('₱9,770')).toBeVisible();expect(screen.getByText('₱4,300')).toBeVisible();expect(screen.getByText('₱5,470')).toBeVisible();
  expect(screen.queryByText(/monthly remaining/i)).not.toBeInTheDocument();expect(screen.queryByText('₱4,885')).not.toBeInTheDocument();
});
