/** Posting instants are distinct from contractual calendar dates. */
export function postingTimeLabel(instant:string):string{
  return `${new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(instant))} (Asia/Manila)`;
}
