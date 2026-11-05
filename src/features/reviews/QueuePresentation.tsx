import type { ReactNode,Ref } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward } from '../../shared/icons';
import styles from './queue.module.css';

export function QueueHeading({title,description,children,titleRef}:{title:string;description:string;children:ReactNode;titleRef?:Ref<HTMLHeadingElement>}) {
 return <header className={styles.heading}><div className={styles.title}><img src={`${import.meta.env.BASE_URL}workspace/gabay-guiding.webp`} alt="" width={64} height={64}/><div><h1 ref={titleRef} tabIndex={titleRef?-1:undefined}>{title}</h1><p>{description}</p></div></div>{children}</header>;
}
export function QueueGuide({children}:{children:ReactNode}) {
 return <details className={styles.guide}><summary>How this queue is ordered</summary><div>{children}</div></details>;
}
export function QueueStatus({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'attention'|'urgent'|'ready'}) {
 return <span className={styles.status} data-tone={tone}>{children}</span>;
}
export function QueueLink({to,children}:{to:string;children:ReactNode}) {
 return <Link className={styles.open} to={to}>{children}<ArrowForward size={18}/></Link>;
}
export function queueReference(id:string,ids:readonly string[]):string {
 const others=ids.filter(value=>value!==id);
 for(let length=4;length<id.length-8;length+=4){
  const label=`${id.slice(0,8)}…${id.slice(-length)}`;
  if(!others.some(other=>`${other.slice(0,8)}…${other.slice(-length)}`===label))return label;
 }
 return id;
}
export const queueTimestamp=(value:string)=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'});
export function QueueDate({value}:{value:string}) {
 return <time dateTime={value} title={`${queueTimestamp(value)} (Manila)`}>{new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(value))}</time>;
}
