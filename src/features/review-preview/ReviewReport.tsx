import { useEffect,useRef,useState,type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button,Money,Notice,Badge } from '../../shared/ui';
import { dateLabel,isCalendarDate,money } from '../../domain/format';
import { parsePesoInput } from '../../domain/evidence';
import { buildReview,materialBasis,priorityLabel,type View,type Assumptions } from './analysis';
import styles from './preview.module.css';
import { OfficerFollowUp } from './OfficerFollowUp';

export function ReviewReport({view,assumptions,member,purpose,revise,officer}:{view:View;assumptions:Assumptions;member:boolean;purpose:string;revise:()=>void;officer?:string}){
 const result=buildReview(view,assumptions,purpose),[selected,setSelected]=useState(result.recommended?.offerId??'');
 const option=result.options.find(o=>o.offerId===selected)??result.recommended;
 const base=member?`/member/applications/${view.applicationId}`:`/staff/applications/${view.applicationId}`;
 const [downloadError,setDownloadError]=useState('');
 const sources=view.sources.filter(s=>s.state==='cleared');

 const sections=[
  result.fiveC.Character,
  result.fiveC.Capacity,
  result.fiveC.Capital,
  result.fiveC.Collateral,
  result.fiveC.Conditions,
 ];

 const netMonthlyCash=result.totalIncomeCentavos-result.totalExpenseCentavos-result.totalObligationCentavos;
 const dtiPercent=result.totalIncomeCentavos>0?Math.round((result.totalObligationCentavos/result.totalIncomeCentavos)*100):0;

 async function download(){
  setDownloadError('');
  try {
   const binding=JSON.stringify({material:materialBasis(view),assumptions,selectedOfferId:option?.offerId??null});
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(binding));
   const sha=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
   const monthly=option?.baseline.months.map(m=>`${m.month}: baseline ${money(m.remainingCentavos)}; what-if ${option.stressed?money(option.stressed.months.find(sm=>sm.month===m.month)!.remainingCentavos):'not modeled'}`)??[];
   const checks=option?[...option.baseline.checks.map(c=>`Baseline ${c.id}: ${c.passed?'passes':'fails'}; actual ${money(c.actualCentavos)}; minimum ${money(c.minimumCentavos)}`),...(option.stressChecks??[]).map(c=>`What-if ${c.id}: ${c.passed?'passes':'fails'}; actual ${money(c.actualCentavos)}; minimum ${money(c.minimumCentavos)}`)]:[];
   const text=['AGAP — 5C review draft','Demonstration analysis · rule/template preview, not live model output',`Exported: ${new Date().toISOString()}`,`Application: ${view.applicationId}\nApplication version: ${view.version}\nFinancial input version: ${view.inputVersion}\nSnapshot SHA-256: ${sha}`,`Purpose: ${purpose}\nReview horizon: ${assumptions.start} through ${assumptions.end}`,`Attention based on suggested option: ${priorityLabel[result.priority]}\n${result.reason}`,`Overall Readiness Score: ${result.overallScore}% (${result.overallConfidence})`,`Selected offer: ${option?.label??'Unavailable'} (${option?.offerId??'none'})`,option?`Baseline minimum ${money(option.baseline.lowestBalanceCentavos)}; closing ${money(option.baseline.closingBalanceCentavos)}; full repayments ${money(option.baseline.totalRepaymentCentavos)}; financing cost ${money(option.baseline.financingCostCentavos)}`:'Financial results unavailable',assumptions.expense?`Hypothetical expense: ${assumptions.expense.label}; ${money(assumptions.expense.amount)} on ${assumptions.expense.date}. Not a predicted event.`:`Automated modeled risk: ${result.autoRisk.label}; ${money(result.autoRisk.modeledAmountCentavos)} on ${result.autoRisk.modeledDate}.`,`Illustrative reserve: ${assumptions.reserve===null?'not supplied':money(assumptions.reserve)}`,option?.stressed?`What-if minimum ${money(option.stressed.lowest)}; closing ${money(option.stressed.closing)}; horizon remaining ${money(option.stressed.remaining)}`:'No what-if financial result',...monthly,...checks,...sections.map(section=>`${section.name}\n${section.statusBadge}\n${section.text}`),'Red flags and solver recommendations',...result.redFlags.map(f=>`[${f.severity.toUpperCase()}] ${f.title}: ${f.description}\nSolution: ${f.suggestedSolution.title} — ${f.suggestedSolution.description} (${f.suggestedSolution.impact})`),'Source references',...view.sources.map(source=>`${source.id} version ${source.version}; text version ${source.textVersionId??'none'}; ${source.label}; dated ${source.date}; state ${source.state}; verification ${source.verification}`),'Confirmed financial fact references',...view.facts.map(fact=>`${fact.id} revision ${fact.revision}; ${fact.input.label}; source ${fact.sourceId} version ${fact.sourceVersion}; ${fact.input.value.availability==='recorded'?money(fact.input.value.amountCentavos):fact.input.value.reason}; cash dates ${fact.input.cashDates.join(', ')}`),'Final approval remains a separate authorized officer decision. This draft does not amend or approve a loan.'].join('\n\n');
   const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='AGAP-5C-review-draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch{setDownloadError('The draft could not be prepared. Please try the download again.');}
 }

 return <div className="stack" aria-label="AGAP review results">
  {/* 1. Executive Scorecard Hero */}
  <section className={`panel panel-body stack ${styles.result}`}>
   <div className={styles.heroHeader}>
    <img src={`${import.meta.env.BASE_URL}workspace/gabay-guiding.webp`} alt="" width={64} height={64} className={styles.heroMascot} decoding="async"/>
    <div className={styles.heroText}>
     <div className={styles.heroTopLine}>
      <h2>Review prepared</h2>
      <Badge tone={result.priority==='urgent'?'danger':result.priority==='routine'?'brand':'warning'}>{priorityLabel[result.priority]}</Badge>
     </div>
     <p className={styles.heroSubtitle}>Automated predictive risk modeling, multi-scenario stress analysis, and 5C readiness assessment.</p>
    </div>
   </div>

   <div className={styles.scorecardGrid}>
    <div className={styles.overallScoreCard}>
     <div className={styles.gaugeContainer}>
      <div className={styles.circularGauge} style={{'--score-pct':`${result.overallScore}%`} as React.CSSProperties}>
       <div className={styles.gaugeInner}>
        <span className={styles.gaugeNumber}>{result.overallScore}%</span>
        <span className={styles.gaugeLabel}>Readiness</span>
       </div>
      </div>
     </div>
     <div className={styles.overallDetails}>
      <div className={styles.overallBadgeRow}>
       <Badge tone={result.overallScore>=80?'brand':result.overallScore>=65?'warning':'danger'}>{result.overallConfidence}</Badge>
       <span className={styles.confidenceText}>Weighted Predictive Model</span>
      </div>
      <p className={styles.lead}>{result.reason}</p>
      <p className="small subtle">{result.priority==='urgent'?'Actionable restructuring recommendations flagged below before final officer approval.':result.priority==='clarification'?'Request the missing information before preparing an approval recommendation.':'Favorable readiness score across baseline and modeled contingency scenarios.'}</p>
     </div>
    </div>

    <div className={styles.vitalsGrid}>
     <div className={styles.vitalCard}>
      <span className={styles.vitalLabel}>Net Monthly Cash</span>
      <strong className={styles.vitalValue}><Money value={netMonthlyCash}/></strong>
      <span className={styles.vitalHint}>Household disposable margin</span>
     </div>
     <div className={styles.vitalCard}>
      <span className={styles.vitalLabel}>Lowest Cash Buffer</span>
      <strong className={`${styles.vitalValue} ${result.lowest!==null&&result.lowest<0?styles.vitalNegative:''}`}>{result.lowest!==null?<Money value={result.lowest}/>:<>Unavailable</>}</strong>
      <span className={styles.vitalHint}>{option?.stressed?'Under modeled emergency':'In baseline review'}</span>
     </div>
     <div className={styles.vitalCard}>
      <span className={styles.vitalLabel}>Debt-to-Income</span>
      <strong className={styles.vitalValue}>{dtiPercent}%</strong>
      <span className={styles.vitalHint}>{dtiPercent<=35?'Healthy debt ratio':'Elevated debt pressure'}</span>
     </div>
     <div className={styles.vitalCard}>
      <span className={styles.vitalLabel}>Risk Flags Flagged</span>
      <strong className={`${styles.vitalValue} ${result.redFlags.some(f=>f.severity==='danger')?styles.vitalDanger:''}`}>{result.redFlags.filter(f=>f.severity!=='info').length}</strong>
      <span className={styles.vitalHint}>Active alerts with solvers</span>
     </div>
    </div>
   </div>

   {result.issues.length>0&&<Notice tone="warning"><ul>{result.issues.map(i=><li key={i}>{i}</li>)}</ul></Notice>}
   <p className="small subtle">{result.authoritative?'Uses the current saved server assessment.':'Demonstration analysis based on confirmed household cash flows and automated contingency risk modeling.'} Rubric-based model evaluation produced across the 5C framework.</p>
   {downloadError&&<Notice tone="warning" role="alert">{downloadError}</Notice>}
   <div className="actions">
    <Button variant="secondary" onClick={revise}>Change scenario</Button>
    <Button variant="quiet" onClick={()=>void download()}>Download 5C draft</Button>
    {!member&&<Link to={`${base}/decision`}>Continue to officer decision</Link>}
   </div>
  </section>

  {/* 2. Red Flags & Actionable Solvers */}
  <section className="panel panel-body stack" aria-label="Risk assessment and model recommendations">
   <div className={styles.heading}>
    <div>
     <h2>Risk assessment & model recommendations</h2>
     <p>The predictive engine identifies repayment vulnerabilities and suggests concrete corrective solutions.</p>
    </div>
    <Badge tone={result.redFlags.some(f=>f.severity==='danger')?'danger':result.redFlags.some(f=>f.severity==='warning')?'warning':'brand'}>
     {result.redFlags.filter(f=>f.severity!=='info').length} {result.redFlags.filter(f=>f.severity!=='info').length===1?'alert':'alerts'} flagged
    </Badge>
   </div>

   <div className={styles.flagGrid}>
    {result.redFlags.map(flag=><article key={flag.id} className={`${styles.flagCard} ${styles[`flag_${flag.severity}`]}`}>
     <div className={styles.flagHeader}>
      <div className={styles.flagTitleRow}>
       <span className={styles.flagIcon}>{flag.severity==='danger'?'⚠️':flag.severity==='warning'?'⚡':'ℹ️'}</span>
       <div>
        <h3>{flag.title}</h3>
        <span className={styles.flagCategory}>{flag.category} risk</span>
       </div>
      </div>
      <Badge tone={flag.severity==='danger'?'danger':flag.severity==='warning'?'warning':'brand'}>{flag.severity.toUpperCase()}</Badge>
     </div>
     <p className={styles.flagDescription}>{flag.description}</p>
     <div className={styles.solverCard}>
      <div className={styles.solverHeader}>
       <span className={styles.solverIcon}>💡</span>
       <strong>Recommended Solution: {flag.suggestedSolution.title}</strong>
      </div>
      <p>{flag.suggestedSolution.description}</p>
      <div className={styles.solverImpact}>
       <strong>Expected outcome:</strong> {flag.suggestedSolution.impact}
      </div>
     </div>
    </article>)}
   </div>
  </section>

  {/* 3. Automated Risk Scenarios & Stress Test Comparison */}
  {option&&<section className="panel panel-body stack">
   <div className={styles.heading}>
    <div>
     <h2>Automated risk scenarios & stress test</h2>
     <p>Unexpected events are modeled automatically so the applicant is not required to anticipate emergencies alone.</p>
    </div>
    <Badge tone="neutral">Predictive Stress Modeling</Badge>
   </div>

   <div className={styles.scenarioComparisonGrid}>
    <div className={styles.scenarioCard}>
     <div className={styles.scenarioCardHeader}>
      <span className={styles.scenarioTag}>Standard Plan</span>
      <h3>Baseline Scenario</h3>
      <p className="small subtle">Contractual repayment under recorded household budget.</p>
     </div>
     <dl className={styles.scenarioMetrics}>
      <div>
       <dt>Lowest Balance</dt>
       <dd><Money value={option.baseline.lowestBalanceCentavos}/></dd>
      </div>
      <div>
       <dt>Monthly Remaining</dt>
       <dd><Money value={option.baseline.months[0]?.remainingCentavos??0}/></dd>
      </div>
      <div>
       <dt>Financing Cost</dt>
       <dd><Money value={option.baseline.financingCostCentavos}/></dd>
      </div>
     </dl>
     <div className={styles.scenarioStatus}>
      <span className={styles.checkIcon}>✓</span>
      <span>{option.baseline.checks.every(c=>c.passed)?'All financial checks satisfied':'Checks need attention'}</span>
     </div>
    </div>

    <div className={`${styles.scenarioCard} ${option.stressed&&option.stressed.lowest<0?styles.stressedNegative:styles.stressedPositive}`}>
     <div className={styles.scenarioCardHeader}>
      <span className={styles.scenarioTagEmergency}>Emergency Event Modeled</span>
      <h3>{assumptions.expense?.label??result.autoRisk.label}</h3>
      <p className="small subtle">Simulated impact: <Money value={assumptions.expense?.amount??result.autoRisk.modeledAmountCentavos}/>{isCalendarDate(assumptions.expense?.date??result.autoRisk.modeledDate)?` on ${dateLabel(assumptions.expense?.date??result.autoRisk.modeledDate)}.`:'.'}</p>
     </div>
     <dl className={styles.scenarioMetrics}>
      <div>
       <dt>Lowest Stressed Balance</dt>
       <dd className={option.stressed&&option.stressed.lowest<0?styles.metricShortfall:''}>{option.stressed?<Money value={option.stressed.lowest}/>:<>Not modeled</>}</dd>
      </div>
      <div>
       <dt>Horizon Remaining</dt>
       <dd className={option.stressed&&option.stressed.remaining<0?styles.metricShortfall:''}>{option.stressed?<Money value={option.stressed.remaining}/>:<>Not modeled</>}</dd>
      </div>
      <div>
       <dt>Contingency Buffer</dt>
       <dd>{option.stressed&&option.stressed.lowest>=0?'Protected':'Depleted'}</dd>
      </div>
     </dl>
     <div className={styles.scenarioStatus}>
      <span className={option.stressed&&option.stressed.lowest<0?styles.alertIcon:styles.checkIcon}>{option.stressed&&option.stressed.lowest<0?'⚠️':'✓'}</span>
      <span>{option.stressed&&option.stressed.lowest<0?'Stressed deficit triggered solver recommendations above.':'Household absorbs emergency shock without deficit.'}</span>
     </div>
    </div>
   </div>

   <div className={styles.heading}>
    <div>
     <h2>Repayment options</h2>
     <p>Only options returned by the configured product are compared.</p>
    </div>
   </div>
   <fieldset className={styles.options}><legend className="sr-only">Compare permitted options</legend>{result.options.map(o=><label key={o.offerId} className={`${styles.option} ${o.offerId===option.offerId?styles.selected:''}`}><input type="radio" name="preview-offer" value={o.offerId} checked={o.offerId===option.offerId} onChange={()=>setSelected(o.offerId)}/><span><strong>{o.label}</strong><span className="small">{view.offers.find(offer=>offer.id===o.offerId)?.termMonths} {view.offers.find(offer=>offer.id===o.offerId)?.termMonths===1?'month':'months'} · First payment {view.offers.find(offer=>offer.id===o.offerId)?.payments[0]?dateLabel(view.offers.find(offer=>offer.id===o.offerId)!.payments[0].date):'Unavailable'}</span><span className="small">{o.offerId===result.recommended?.offerId?'Suggested for officer consideration':'Available comparison'} · Full cost {money(o.baseline.financingCostCentavos)}</span></span></label>)}</fieldset>
   {(option.baseline.checks.some(c=>!c.passed)||option.stressChecks?.some(c=>!c.passed)||option.stressed&&option.stressed.lowest<0)&&<Notice tone="warning">This selected option has a financial check or hypothetical cash shortage requiring officer review.</Notice>}
   <dl className={styles.metrics}><div><dt>Lowest dated balance</dt><dd><Money value={option.baseline.lowestBalanceCentavos}/></dd></div><div><dt>With hypothetical expense</dt><dd>{option.stressed?<Money value={option.stressed.lowest}/>:<>Not modeled</>}</dd></div><div><dt>Full repayments</dt><dd><Money value={option.baseline.totalRepaymentCentavos}/></dd></div><div><dt>Full financing cost</dt><dd><Money value={option.baseline.financingCostCentavos}/></dd></div></dl>
   <div className="table-scroll" tabIndex={0} role="region" aria-label="Baseline and hypothetical monthly remaining"><table><caption>Monthly remaining within the review</caption><thead><tr><th scope="col">Month</th><th scope="col">Baseline</th><th scope="col">With hypothetical expense</th></tr></thead><tbody>{option.baseline.months.map(m=><tr key={m.month}><th scope="row">{m.month}</th><td><Money value={m.remainingCentavos}/></td><td>{option.stressed?<Money value={option.stressed.months.find(sm=>sm.month===m.month)!.remainingCentavos}/>:<>Not modeled</>}</td></tr>)}</tbody></table></div>
   <details><summary>Financial checks and configured minimums</summary>{option.baseline.checks.map(c=><p key={c.id}>Baseline · {c.detail} Actual <Money value={c.actualCentavos}/>; minimum <Money value={c.minimumCentavos}/> · {c.passed?'Passes':'Needs attention'}</p>)}{option.stressChecks?.map(c=><p key={c.id}>What-if · {c.detail} Actual <Money value={c.actualCentavos}/>; minimum <Money value={c.minimumCentavos}/> · {c.passed?'Passes':'Needs attention'}</p>)}</details>
   {assumptions.reserve!==null&&<Notice tone={((option.stressed?.lowest??option.baseline.lowestBalanceCentavos)<assumptions.reserve)?'warning':'neutral'}>Entered illustrative reserve: <Money value={assumptions.reserve}/>. {((option.stressed?.lowest??option.baseline.lowestBalanceCentavos)<assumptions.reserve)?'This scenario falls below it.':'This scenario stays at or above it within the supplied dates.'}</Notice>}
   {option.stressed&&<p>The hypothetical expense is added once on its specified date. It is separate from saved financial facts and does not change an approved loan.</p>}
   <details><summary>Inspect cash dates and balances</summary><div className="table-scroll" role="region" tabIndex={0} aria-label="Preview dated balances"><table><thead><tr><th scope="col">Date</th><th scope="col">Recorded scenario</th><th scope="col">What-if scenario</th></tr></thead><tbody>{option.baseline.daily.map((day,i)=><tr key={day.date}><th scope="row">{dateLabel(day.date)}</th><td><Money value={day.balanceCentavos}/></td><td>{option.stressed?<Money value={option.stressed.daily[i].balance}/>:<>Not modeled</>}</td></tr>)}</tbody></table></div></details>
  </section>}

  {/* 4. 5C Review Cards with Percentages and Meters */}
  <section className="panel panel-body stack">
   <div className={styles.heading}>
    <div>
     <h2>5C review</h2>
     <p>A source-linked draft for the officer’s judgment with percentage ratings and confidence levels.</p>
    </div>
    <Badge>Demonstration draft</Badge>
   </div>

   {sections.map(section=><article key={section.name} className={styles.cSection}>
    <div className={styles.heading}>
     <div>
      <h3>{section.name}</h3>
      <div className={styles.scoreRow}>
       <div className={styles.meterTrack} role="progressbar" aria-valuenow={section.scorePercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${section.name} readiness score`}>
        <div className={`${styles.meterFill} ${styles[`meter_${section.meterTone}`]}`} style={{width:`${section.scorePercent}%`}}/>
       </div>
       <span className={styles.scoreText}>{section.scorePercent}%</span>
      </div>
     </div>
     <Badge tone={section.meterTone}>{section.statusBadge}</Badge>
    </div>

    <div className={styles.factorChips}>
     {section.breakdown.map(b=><span key={b.factor} className={`${styles.factorChip} ${styles[`factor_${b.status}`]}`}>
      {b.status==='passed'?'✓':b.status==='warning'?'⚠️':'ℹ️'} {b.factor}
     </span>)}
    </div>

    <p className={styles.sectionNarrative}>{section.text}</p>

    {section.items.length>0&&<details><summary>Supporting statements and sources</summary>{section.items.map(f=><div key={f.id} className={styles.citation}><strong>{f.input.label}</strong><p>{view.sources.find(s=>s.id===f.sourceId)?.label??'Source unavailable'} · {dateLabel(f.input.effectiveDate)}</p><blockquote>{f.input.statement??view.sources.find(s=>s.id===f.sourceId)?.pages[0]?.text??'Inspect the original source in Evidence.'}</blockquote></div>)}</details>}
   </article>)}
  </section>

  <OfficerFollowUp key={option?.offerId} view={view} assumptions={assumptions} option={option} member={member} officer={officer}/>
  <section className="panel panel-body stack">
   <h2>Evidence and questions</h2>
   {result.pendingDocuments.length>0&&<Notice tone="warning">{result.pendingDocuments.length} uploaded document(s) await successful file checks. Their contents have not been used as verified evidence.</Notice>}
   {result.unreviewed.length>0&&<Notice tone="warning">{result.unreviewed.length} source suggestion(s) still need human checking.</Notice>}
   <ul>
    <li>Are there upcoming school costs, repairs, health expenses or income changes missing from the recorded period?</li>
    <li>Does the entered reserve cover the member’s needs under the cooperative’s agreed rules?</li>
    <li>Which repayment option is actually permitted and appropriate after officer verification?</li>
   </ul>
   <details><summary>Inspect available source excerpts ({sources.length})</summary>{sources.map(s=><article className={styles.citation} key={s.id}><h3>{s.label}</h3><p>{s.kind==='statement'?'Recorded statement':'File checks passed'} · independent verification: {s.verification.replaceAll('_',' ')}</p>{s.pages.map(p=><blockquote key={p.page}>{p.text}</blockquote>)}</article>)}</details>
   <Link to={member?base:`${base}/evidence`}>Open saved application and evidence</Link>
  </section>
 </div>;
}

export function ScenarioForm({initial,run,disabled=false}:{initial:Assumptions;run:(a:Assumptions,share:boolean)=>void;disabled?:boolean}){
 const [start,setStart]=useState(initial.start),[end,setEnd]=useState(initial.end),[reserve,setReserve]=useState(initial.reserve===null?'':String(initial.reserve/100)),[expense,setExpense]=useState(!!initial.expense),[label,setLabel]=useState(initial.expense?.label??''),[amount,setAmount]=useState(initial.expense?String(initial.expense.amount/100):''),[date,setDate]=useState(initial.expense?.date??''),[share,setShare]=useState(false),[error,setError]=useState('');
 const errors=useRef<HTMLDivElement>(null);useEffect(()=>{if(error)errors.current?.focus();},[error]);
 function submit(event:FormEvent){event.preventDefault();try{const a={start,end,reserve:reserve.trim()?parsePesoInput(reserve):null,expense:expense?{label,amount:parsePesoInput(amount),date}:null};const probe=buildReview({applicationId:'',version:1,inputVersion:1,sources:[],facts:[],drafts:[],offers:[],latestAssessment:null,aiAvailable:false},a);if(probe.issues.some(i=>i.startsWith('Choose a valid')||i.startsWith('Give the hypothetical')))throw new Error();setError('');run(a,share);}catch{setError('Check the review dates, reserve and hypothetical expense. Use a positive expense and a date within the review.');}}
 return <form className="stack" onSubmit={submit}>
  <div className={styles.heroHeader}>
   <img src={`${import.meta.env.BASE_URL}workspace/gabay-guiding.webp`} alt="" width={56} height={56} className={styles.heroMascot} decoding="async"/>
   <div className={styles.heroText}>
    <h2>Review everyday repayment impact</h2>
    <p className={styles.heroSubtitle}>AGAP automatically models typical emergency contingencies in your assessment. You can also explore an additional specific life event below.</p>
   </div>
  </div>
  {error&&<div ref={errors} tabIndex={-1}><Notice tone="warning" role="alert">{error}</Notice></div>}
  <div className={styles.two}><div className="field"><label htmlFor="preview-start">Review starts</label><input id="preview-start" type="date" required value={start} onChange={e=>setStart(e.target.value)}/></div><div className="field"><label htmlFor="preview-end">Review ends</label><input id="preview-end" type="date" required value={end} onChange={e=>setEnd(e.target.value)}/></div></div>
  <div className="field"><label htmlFor="preview-reserve">Illustrative household reserve (PHP, optional)</label><input id="preview-reserve" inputMode="decimal" value={reserve} onChange={e=>setReserve(e.target.value)}/></div>
  <label className={styles.check}><input type="checkbox" checked={expense} onChange={e=>setExpense(e.target.checked)}/> Explore an unexpected or irregular expense</label>
  {expense&&<div className={styles.shock}>
   <div className="field"><label htmlFor="preview-expense">What expense would you like to explore?</label><input id="preview-expense" required maxLength={200} value={label} onChange={e=>setLabel(e.target.value)}/></div>
   <div className={styles.two}><div className="field"><label htmlFor="preview-expense-amount">Hypothetical amount (PHP)</label><input id="preview-expense-amount" inputMode="decimal" required value={amount} onChange={e=>setAmount(e.target.value)}/></div><div className="field"><label htmlFor="preview-expense-date">Hypothetical expense date</label><input id="preview-expense-date" type="date" required value={date} onChange={e=>setDate(e.target.value)}/></div></div>
   <p className="small subtle">A what-if assumption, not an event predicted by AGAP.</p>
  </div>}
  <label className={styles.check}><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/> Share these scenario assumptions with authorized staff during this browser session.</label>
  <div><Button type="submit" disabled={disabled}>Prepare review preview</Button></div>
 </form>;
}
