import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarToday, Description, Home, Info } from '../../shared/icons';
import { InstallDialog } from '../../shared/installation/InstallDialog';
import { useInstall } from '../../shared/installation/InstallProvider';
import { Button, Notice } from '../../shared/ui';
import styles from './MemberApp.module.css';

export function MemberInstallation() {
  const { installed } = useInstall();
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    {!installed && <Button id="member-install" className={styles.installButton} variant="quiet" onClick={() => dialog.current?.showModal()}>Install AGAP</Button>}
    <InstallDialog dialog={dialog} classes={styles} close={() => (document.getElementById('member-install') ?? document.getElementById('member-main'))?.focus({ preventScroll: true })}/>
  </>;
}

export function MemberNavigation() {
  const { pathname } = useLocation();
  const [keyboard, setKeyboard] = useState(false);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = navigation.current;
    if (!element) return;
    const parent = element.closest<HTMLElement>('[data-member-shell]')!;
    const resize = () => parent.style.setProperty('--member-nav-height', `${element.getBoundingClientRect().height}px`);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => { observer.disconnect(); parent.style.removeProperty('--member-nav-height'); };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    let fullHeight = window.innerHeight;
    const update = () => {
      const editing = document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, select');
      const height = viewport?.height ?? window.innerHeight;
      if (!editing) fullHeight = Math.max(height, window.innerHeight);
      setKeyboard(Boolean(editing && fullHeight - height > 120));
    };
    viewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);
  const application = pathname === '/member/apply' || pathname.startsWith('/member/applications');
  return <nav ref={navigation} className={styles.nav} data-keyboard-hidden={keyboard} aria-label="Member account">
    <Link to="/member" aria-current={pathname === '/member' ? 'page' : undefined}><Home size={24}/><span>Home</span></Link>
    <Link to="/member/applications" aria-current={application ? 'page' : undefined}><Description size={24}/><span>Applications</span></Link>
    <Link to="/member/loans" aria-current={pathname.startsWith('/member/loans') ? 'page' : undefined}><CalendarToday size={24}/><span>My loans</span></Link>
    <Link to="/member/help" aria-label="Payment help" aria-current={pathname.startsWith('/member/help') ? 'page' : undefined}><Info size={24}/><span>Help</span></Link>
  </nav>;
}

/** Connectivity is advisory; command certainty and retries remain owned by useCommand. */
export function MemberConnection() {
  const [connection, setConnection] = useState<'online' | 'offline' | 'restored'>(navigator.onLine ? 'online' : 'offline');
  useEffect(() => {
    const offline = () => setConnection('offline');
    const online = () => setConnection(previous => previous === 'offline' ? 'restored' : previous);
    window.addEventListener('offline', offline);
    window.addEventListener('online', online);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  }, []);
  if (connection === 'online') return null;
  return <div className={styles.connection}><Notice tone={connection === 'offline' ? 'warning' : 'neutral'} role="status">
    {connection === 'offline' ? <><strong>You’re offline.</strong> Keep this page open to retain what you entered. Account information and saving need an internet connection.</> : <><strong>Connection restored.</strong> Retry any unfinished action when you’re ready. Nothing is sent automatically. <Button variant="quiet" onClick={() => setConnection('online')} aria-label="Dismiss connection message">Dismiss</Button></>}
  </Notice></div>;
}
