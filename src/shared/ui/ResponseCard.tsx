import { useId,type ReactNode } from 'react';
import { Badge,Button } from './index';
import styles from './response.module.css';

/** Content is escaped React text. Domains supply data; never model-generated markup/actions. */
export function ResponseCard({title,origin,status,children}:{title:string;origin:string;status?:string;children:ReactNode}){
 const heading=useId();
 return <article className={styles.response} aria-labelledby={heading}><div className={styles.heading}><h4 id={heading}>{title}</h4><div className="actions"><Badge>{origin}</Badge>{status&&<Badge>{status}</Badge>}</div></div>{children}</article>;
}
export function ResponseSource({label,page,excerpt,href}:{label:string;page?:number;excerpt:string;href?:string}){
 return <div className={styles.evidence}><p className="small subtle">{label}{page?` · Page ${page}`:''}</p><blockquote>{excerpt}</blockquote>{href&&<Button variant="quiet" onClick={()=>{const source=document.getElementById(href.slice(1));source?.scrollIntoView({block:'center'});source?.focus();}}>Inspect this source</Button>}<p className="small subtle">Source text is not independent verification.</p></div>;
}
