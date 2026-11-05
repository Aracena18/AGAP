import type { z } from 'zod';
import type { ScenarioSchema } from '../../../packages/contracts/src/schemas';
import { Money } from './index';

/** A checked horizon is not a monthly average. Preserve the supplied segments. */
export function CheckedRemaining({ scenario,legacyLabel='Monthly remaining' }: {scenario:z.output<typeof ScenarioSchema>;legacyLabel?:string}) {
  if (!('workflow' in scenario)) return <div><dt>{legacyLabel}</dt><dd><Money value={scenario.monthlyRemainingCentavos}/></dd></div>;
  return <>
    <div><dt>Full-horizon remaining</dt><dd><Money value={scenario.workflow.horizonNetCentavos}/></dd></div>
    {scenario.workflow.months.map(m => <div key={m.month}><dt>{m.month} reviewed segment remaining</dt><dd><Money value={m.remainingCentavos}/></dd></div>)}
  </>;
}
