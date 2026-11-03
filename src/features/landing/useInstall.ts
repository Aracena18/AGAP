import { useEffect, useState } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [state, setState] = useState<'idle' | 'pending' | 'dismissed' | 'accepted' | 'error'>('idle');
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
  return { installed, available: prompt !== null, state, install };
}
