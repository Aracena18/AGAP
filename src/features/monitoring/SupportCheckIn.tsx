import type {z} from 'zod';
import type {SupportCheckInSchema} from '../../../packages/contracts/src/schemas';
export type CheckIn=z.output<typeof SupportCheckInSchema>;
export const emptyCheckIn=():CheckIn=>({canMeetEssentials:'unavailable',borrowedToRepay:'unavailable',financialStrain:'unavailable'});
const labels:Record<keyof CheckIn,string>={canMeetEssentials:'Can you currently meet essential expenses?',borrowedToRepay:'Have you borrowed to make repayments?',financialStrain:'Would you like to report financial strain?'};
const answer=(value:string)=>({yes:'Yes',no:'No',reported:'Reported',not_reported:'Not reported',declined:'Prefer not to answer',unavailable:'Not provided'}[value]??value);
export function SupportCheckIn({value,onChange,preview=false}:{value:CheckIn;onChange:(value:CheckIn)=>void;preview?:boolean}){
 const Heading=preview?'h3':'h2';
 return <div className="stack"><Heading>{preview?'Shared check-in':'Optional check-in'}</Heading>{!preview&&<p>You can leave these unanswered and still request help.</p>}{(Object.keys(labels) as Array<keyof CheckIn>).map(key=>preview?<p key={key}>{labels[key]} {answer(value[key])}</p>:<div className="field" key={key}><label htmlFor={`help-${key}`}>{labels[key]}</label><select id={`help-${key}`} value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}>{(key==='financialStrain'?['unavailable','reported','not_reported','declined']:['unavailable','yes','no','declined']).map(option=><option key={option} value={option}>{answer(option)}</option>)}</select></div>)}</div>;
}
