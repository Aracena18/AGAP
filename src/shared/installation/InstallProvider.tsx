import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
type InstallState = 'idle' | 'pending' | 'dismissed' | 'accepted' | 'error';
interface Installation {
  installed: boolean;
  available: boolean;
  state: InstallState;
  install(): Promise<void>;
}
const Context = createContext<Installation | null>(null);

/** Own the one-shot browser prompt across lazy loading and route changes. */
export function InstallProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [state, setState] = useState<InstallState>('idle');
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const available = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); setState('idle'); };
    const complete = () => { setInstalled(true); setPrompt(null); setState('idle'); };
    update();
    standalone.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    return () => {
      standalone.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);
  async function install() {
    if (!prompt || state === 'pending') return;
    setState('pending');
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setState(choice.outcome);
    } catch { setState('error'); }
    finally { setPrompt(null); }
  }
  return <Context.Provider value={{ installed, available: prompt !== null, state, install }}>{children}</Context.Provider>;
}

export function useInstall() {
  const installation = useContext(Context);
  if (!installation) throw new Error('InstallProvider is required');
  return installation;
}
