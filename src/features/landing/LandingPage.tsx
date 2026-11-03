import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowForward, CalendarToday, Description, ExpandMore, FindInPage, NorthEast } from '../../shared/icons';
import { Button } from '../../shared/ui';
import GabayReveal from './GabayReveal';
import { BrandMark } from './BrandMark';
import { story } from './story';
import { useInstall } from './useInstall';
import styles from './LandingPage.module.css';

const examples = [
  { id: 'evidence', label: 'Evidence', title: 'Start with the source.', text: 'Ana’s older worksheet and current payslip disagree. Staff inspect the source and record a correction before using the figure.', alt: 'Actual fictional Evidence screen with Ana’s conflicting income sources and source details' },
  { id: 'cash-flow', label: 'Cash flow', title: 'A monthly total is only part of it.', text: 'Ana has ₱2,000 remaining for the month, yet the requested schedule leaves a ₱2,000 shortage before payday.', alt: 'Actual fictional comparison showing ₱2,000 monthly remaining and a negative ₱2,000 lowest dated cash balance' },
  { id: 'options', label: 'Options', title: 'See what a different date changes.', text: 'The permitted after-payday option changes the timing. Staff still inspect the term, fees, and full repayment cost.', alt: 'Actual fictional comparison with the after-payday option selected and its full offer costs visible' },
  { id: 'decision', label: 'Decision', title: 'Keep the reasoning with the decision.', text: 'A separate reviewer records their rationale. The saved explanation preserves the evidence and costs used at that point.', alt: 'Actual fictional Decision screen showing the separate reviewer workflow and reviewed explanation' },
];
const base = import.meta.env.BASE_URL;

function Installation({ dialog, close, installation }: { dialog: React.RefObject<HTMLDialogElement | null>; close: () => void; installation: ReturnType<typeof useInstall> }) {
  const { installed, available, state, install } = installation;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="install-heading" aria-describedby="install-description" onClose={close}>
    <h2 id="install-heading">{installed ? 'AGAP is installed' : 'Keep AGAP close.'}</h2>
    <p id="install-description">Add AGAP to your device for direct access. An internet connection and the appropriate sign-in are still required.</p>
    {installed ? <p>You can continue to the fictional demonstration or your account.</p> : available ? <p>Your browser can add AGAP to your device. You choose whether to continue in its installation prompt.</p> : <div className={styles.installInstructions}><h3>{ios ? 'On iPhone or iPad' : 'Use your browser’s install menu'}</h3><p>{ios ? 'Open this page in Safari. Open the Share menu, choose Add to Home Screen, then Add.' : 'In Chrome or Edge, open the browser menu and look for Install AGAP or Install this page as an app. In Safari on Mac, choose File, then Add to Dock.'}</p><p>If your browser does not offer installation, you can keep using AGAP in this tab.</p></div>}
    <p className={styles.installStatus} role="status">{state === 'pending' ? 'Waiting for your choice in the browser…' : state === 'accepted' ? 'Your browser accepted the installation request. Follow any remaining device instructions.' : state === 'dismissed' ? 'Installation was dismissed. You can keep using AGAP in your browser.' : state === 'error' ? 'The installation prompt could not open. Use your browser’s install menu or continue in this tab.' : ''}</p>
    <div className={styles.dialogActions}><Button variant="quiet" onClick={() => dialog.current?.close()} autoFocus>Close</Button>{available && !installed && <Button className={styles.installButton} disabled={state === 'pending'} onClick={() => void install()}>{state === 'pending' ? 'Opening…' : 'Install AGAP'}</Button>}{installed && <Link to="/applications" className={styles.actionLink}>Open review demo<ArrowForward size={18}/></Link>}</div>
  </dialog>;
}
export default function LandingPage() {
  const location = useLocation();
  const [active, setActive] = useState(0);
  const [imageError, setImageError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const triggerId = useRef('');
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const installation = useInstall();
  const example = examples[active];
  useEffect(() => {
    document.title = 'AGAP | Loan reviews with everyday needs in view';
    const theme = document.querySelector('meta[name="theme-color"]');
    const previous = theme?.getAttribute('content');
    theme?.setAttribute('content', getComputedStyle(document.querySelector('[data-agap-landing]')!).getPropertyValue('--canvas').trim());
    return () => { if (previous) theme?.setAttribute('content', previous); };
  }, []);
  useEffect(() => {
    const section = new URLSearchParams(location.search).get('section');
    if (!section) { window.scrollTo({ top: 0 }); return; }
    if (!['gabay', 'workflow', 'demo'].includes(section)) return;
    const heading = document.getElementById(section);
    // Meet Gabay opens the first reading moment after the close-up has settled.
    const target = section === 'gabay' ? document.getElementById('workflow') : heading;
    target?.scrollIntoView({ block: 'start' });
    if (section === 'gabay') {
      const scene = document.querySelector(`.${styles.scene}`);
      if (scene && scene.classList.contains(styles.animated)) window.scrollTo({ top: scene.getBoundingClientRect().top + window.scrollY + (scene.getBoundingClientRect().height - window.innerHeight) * story[0].anchor });
      else heading?.scrollIntoView({ block: 'start' });
    }
    heading?.focus({ preventScroll: true });
  }, [location.search, location.key]);
  function openInstall(event: MouseEvent<HTMLButtonElement>) {
    // The lazy hero animation can replace its opening button while the dialog is open.
    triggerId.current = event.currentTarget.id;
    dialog.current?.showModal();
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % examples.length : event.key === 'ArrowLeft' ? (index + examples.length - 1) % examples.length : event.key === 'Home' ? 0 : event.key === 'End' ? examples.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setActive(next); setImageError(false); tabs.current[next]?.focus();
  }
  return <div data-agap-landing className={styles.page}>
    <a className={styles.skip} href="#landing-main" onClick={event => { event.preventDefault(); document.getElementById('landing-main')?.focus(); }}>Skip to main content</a>
    <header className={styles.header}><div className={styles.navInner}>
      <Link className={styles.brand} to="/" aria-label="AGAP home"><BrandMark/>AGAP</Link>
      <nav aria-label="Landing page"><Link to="/?section=gabay">Meet Gabay</Link><Link to="/?section=workflow">How it works</Link><Link to="/?section=demo">Demo</Link></nav>
      <Link to="/applications" className={styles.navAction}>Open AGAP<NorthEast size={17}/></Link>
    </div></header>
    <main id="landing-main" tabIndex={-1}>
      <GabayReveal onInstall={openInstall}/>
      <section className={styles.workflow} aria-labelledby="workflow">
        <h2 id="workflow" tabIndex={-1}>The member’s everyday life.<br/>Part of every review.</h2>
        <p>AGAP brings the information behind a loan review into one connected journey.</p>
        <p className={styles.workflowDisclosure}>Fictional demonstration · Actual AGAP screens</p>
        <ol className={styles.journey} aria-label="The AGAP review journey">
          {[{ id: 'evidence', title: 'Evidence', text: 'Inspect and clarify the facts.', Icon: FindInPage }, { id: 'cash-flow', title: 'Cash flow', text: 'Check needs, dates, and costs.', Icon: CalendarToday }, { id: 'decision', title: 'Human review', text: 'Record the decision and why.', Icon: Description }].map((step, index) => <li key={step.id}>
            <div className={styles.workflowPreview}><step.Icon className={styles.previewFallback} size={48}/><img src={`${base}landing/${step.id}.webp`} alt="" width="1366" height="850" loading="lazy" onError={event => { event.currentTarget.hidden = true; }}/></div>
            <div className={styles.journeyCaption}><span aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>
            {index < 2 && <ArrowForward className={styles.journeyConnector} size={24}/>}
          </li>)}
        </ol>
      </section>
      <section className={styles.demo} aria-labelledby="demo">
        <div className={styles.sectionHeading}><h2 id="demo" tabIndex={-1}>See AGAP in action.</h2><p>One fictional application. The details that change a review.</p></div>
        <div className={styles.tabList} role="tablist" aria-label="Fictional review journey">{examples.map((item, index) => <button key={item.id} ref={element => { tabs.current[index] = element; }} id={`tab-${item.id}`} role="tab" aria-selected={active === index} aria-controls={`panel-${item.id}`} tabIndex={active === index ? 0 : -1} onKeyDown={event => tabKey(event, index)} onClick={() => { setActive(index); setImageError(false); }}>{item.label}</button>)}</div>
        {examples.map((item, index) => <div key={item.id} className={styles.demoPanel} role="tabpanel" id={`panel-${item.id}`} aria-labelledby={`tab-${item.id}`} hidden={active !== index} tabIndex={0}>
          {active === index && <><div className={styles.demoCaption}><div><h3>{example.title}</h3><p>{example.text}</p></div><span>Fictional demonstration</span></div><div className={styles.screenshotFrame}>{imageError ? <div className={styles.imageFallback} role="status"><p>The screenshot could not load.</p><Link to="/applications">Open review demo</Link></div> : <img src={`${base}landing/${example.id}.webp`} alt={example.alt} width="1366" height="850" loading="lazy" onError={() => setImageError(true)}/>}</div>{!imageError && <a className={styles.imageLink} href={`${base}landing/${example.id}.webp`} target="_blank" rel="noopener noreferrer">View full-size screenshot<span className="sr-only"> (opens in a new tab)</span><NorthEast size={16}/></a>}</>}
        </div>)}
        <div className={styles.demoFooter}><p>Fictional people, offers, and policies. Review-demo access requires staff sign-in.</p><Link className={styles.actionLink} to="/applications">Open review demo<ArrowForward size={18}/></Link></div>
      </section>
      <section className={styles.close} aria-labelledby="close-heading"><div className={styles.closeCopy}><h2 id="close-heading">Clearer information.<br/>Accountable decisions.</h2><p>Sources stay connected. Calculations stay checked. People remain responsible for the decision.</p><Button id="install-footer" className={styles.installButton} onClick={openInstall}>Install AGAP<ArrowForward size={18}/></Button></div><div className={styles.faq}>
        <details><summary>What does installing AGAP do?<ExpandMore/></summary><p>It adds a shortcut and, where supported, a standalone app window. You still need an internet connection and the appropriate account to access a workspace.</p></details>
        <details><summary>Are these real member records?<ExpandMore/></summary><p>No. This landing page shows fictional demonstration cases. It does not establish that AGAP is approved for live lending or that every planned service is available.</p></details>
        <details><summary>Who makes lending decisions?<ExpandMore/></summary><p>Authorized people make lending decisions. AI may assist with reviewable drafts; it does not calculate authoritative financial figures or approve a loan.</p></details>
      </div></section>
    </main>
    <footer className={styles.footer}><Link className={styles.brand} to="/"><BrandMark/>AGAP</Link><p>Everyday needs in view.</p><div><Link to="/member">Member access</Link><Link to="/staff">Staff access</Link></div></footer>
    <Installation dialog={dialog} close={() => document.getElementById(triggerId.current)?.focus()} installation={installation}/>
  </div>;
}
