import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { expect,it,vi } from 'vitest';
import type { AgapClient } from '../../../packages/api-client/src';
import { HouseholdForm } from './HouseholdForm';
import type { View } from './analysis';

vi.mock('../access/useUnsavedChanges',()=>({useUnsavedChanges:vi.fn()}));
const view:View={applicationId:'00000000-0000-4000-8000-000000000001',version:1,inputVersion:1,sources:[],facts:[],drafts:[],offers:[],latestAssessment:null,aiAvailable:false};
function fill(){
 fireEvent.change(screen.getByLabelText('Review starts',{exact:true}),{target:{value:'2026-01-01'}});
 fireEvent.change(screen.getByLabelText('Review ends',{exact:true}),{target:{value:'2026-01-31'}});
 for(const label of ['Opening spendable cash','Take-home income','Housing or rent','Other essential expenses','Existing repayments']){
  fireEvent.change(screen.getByLabelText(`${label} (PHP)`,{exact:true}),{target:{value:'100.25'}});
  if(label!=='Opening spendable cash')fireEvent.change(screen.getByLabelText(`${label} cash dates`,{exact:true}),{target:{value:'2026-01-15'}});
 }
 fireEvent.click(screen.getByLabelText('I confirm these amounts, exact cash dates and coverage of the review period.'));
}
it('stops a partially completed batch on concurrent change without overwriting later facts',async()=>{
 const saved=vi.fn(),getMemberWorkflow=vi.fn().mockResolvedValueOnce(view).mockResolvedValueOnce({...view,version:3}),saveMemberFact=vi.fn().mockResolvedValue({id:view.applicationId,version:2});
 render(<HouseholdForm view={view} client={{getMemberWorkflow,saveMemberFact} as unknown as AgapClient} csrf="csrf" member saved={saved}/>);
 fill();fireEvent.click(screen.getByRole('button',{name:'Save household information',exact:true}));
 await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Saved information changed during this save'));
 expect(saveMemberFact).toHaveBeenCalledTimes(1);expect(saved).not.toHaveBeenCalled();
 expect(screen.queryByRole('button',{name:'Retry original save',exact:true})).not.toBeInTheDocument();
 expect(screen.getByLabelText('Take-home income (PHP)',{exact:true})).toHaveValue('100.25');
});
it('replays the original uncertain step and then resumes the remaining saved statements',async()=>{
 let version=1,failed=false;
 const getMemberWorkflow=vi.fn(async()=>({...view,version}));
 const saveMemberFact=vi.fn(async()=>{if(!failed){failed=true;version=2;throw new Error('Response lost after commit');}if(saveMemberFact.mock.calls.length===2)return {id:view.applicationId,version:2};return {id:view.applicationId,version:++version};});
 const saved=vi.fn();render(<HouseholdForm view={view} client={{getMemberWorkflow,saveMemberFact} as unknown as AgapClient} csrf="csrf" member saved={saved}/>);
 fill();fireEvent.click(screen.getByRole('button',{name:'Save household information',exact:true}));
 await screen.findByRole('button',{name:'Retry original save',exact:true});
 fireEvent.click(screen.getByRole('button',{name:'Retry original save',exact:true}));
 await waitFor(()=>expect(saved).toHaveBeenCalledOnce());
 expect(saveMemberFact).toHaveBeenCalledTimes(6);expect(saveMemberFact.mock.calls[0]).toEqual(saveMemberFact.mock.calls[1]);
 const bodies=saveMemberFact.mock.calls as unknown as [string,{value:{amountCentavos:number};category:string},{version:number;idempotencyKey:string}][];
 expect(bodies.map(row=>row[1].value.amountCentavos)).toEqual([10025,10025,10025,10025,10025,10025]);
 expect(bodies.map(row=>row[2].version)).toEqual([1,1,2,3,4,5]);
});
it('requires renewed confirmation when a cash amount changes',()=>{
 render(<HouseholdForm view={view} client={{} as AgapClient} csrf="csrf" member saved={vi.fn()}/>);
 fill();const acknowledgment=screen.getByLabelText('I confirm these amounts, exact cash dates and coverage of the review period.');
 expect(acknowledgment).toBeChecked();fireEvent.change(screen.getByLabelText('Take-home income (PHP)',{exact:true}),{target:{value:'200'}});expect(acknowledgment).not.toBeChecked();
});
