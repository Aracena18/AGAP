import type { ReactNode, RefObject } from 'react';
import { Button } from '../ui';
import { useInstall } from './InstallProvider';

interface Props {
  dialog: RefObject<HTMLDialogElement | null>;
  close(): void;
  classes: Record<string, string>;
  installedAction?: ReactNode;
}

/** The landing and member portal share browser behavior, with their own visual scopes. */
export function InstallDialog({ dialog, close, classes, installedAction }: Props) {
  const { installed, available, state, install } = useInstall();
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <dialog ref={dialog} className={classes.dialog} aria-labelledby="install-heading" aria-describedby="install-description" onClose={close}>
    <h2 id="install-heading">{installed ? 'AGAP is installed' : 'Keep AGAP close.'}</h2>
    <p id="install-description">Add AGAP to your device for direct access. An internet connection and the appropriate sign-in are still required.</p>
    {installed ? <p>You can continue to the fictional demonstration or your account.</p> : available ? <p>Your browser can add AGAP to your device. You choose whether to continue in its installation prompt.</p> : <div className={classes.installInstructions}><h3>{ios ? 'On iPhone or iPad' : 'Use your browser’s install menu'}</h3><p>{ios ? 'Open this page in Safari. Open the More or Share menu, choose Add to Home Screen, leave Open as Web App on if shown, then tap Add.' : 'In Chrome or Edge, open the browser menu and look for Install AGAP or Install this page as an app. In Safari on Mac, choose File, then Add to Dock.'}</p><p>If your browser does not offer installation, you can keep using AGAP in this tab.</p></div>}
    <p className={classes.installStatus} role="status">{state === 'pending' ? 'Waiting for your choice in the browser…' : state === 'accepted' ? 'Your browser accepted the installation request. Follow any remaining device instructions.' : state === 'dismissed' ? 'Installation was dismissed. You can keep using AGAP in your browser.' : state === 'error' ? 'The installation prompt could not open. Use your browser’s install menu or continue in this tab.' : ''}</p>
    <div className={classes.dialogActions}><Button variant="quiet" onClick={() => dialog.current?.close()} autoFocus>Close</Button>{available && !installed && <Button className={classes.installButton} disabled={state === 'pending'} onClick={() => void install()}>{state === 'pending' ? 'Opening…' : 'Install AGAP'}</Button>}{installed && installedAction}</div>
  </dialog>;
}
