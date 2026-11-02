/** Development-only visual fixture. Not registered in the application router/build. */
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { UnsavedChangesProvider } from '../access/useUnsavedChanges';
import { Notice } from '../../shared/ui';
import { StaffDecisionWorkspace } from './StaffDecisionPage';
import { staffUiFixture } from './staff.test-fixture';
import { unavailableStaffDecisions } from './staff-gateway';
import '../../styles/global.css';
import styles from './StaffDecisionPage.module.css';
if (import.meta.env.PROD) throw new Error('The fictional Phase 3 preview is development-only.');
const scenario = new URLSearchParams(location.search).get('scenario'), fixture = staffUiFixture(scenario === 'timing');
if (scenario === 'uncertain') fixture.gateway.preview = async () => { throw new TypeError('Explicit fictional lost-response simulation'); };
if (scenario === 'stale') { fixture.view.assessment!.state = 'stale'; fixture.view.offers[0].checked = null; fixture.view.offers[0].outcomes = []; }
if (scenario === 'incomplete') { fixture.view.assessment = null; fixture.view.offers[0].checked = null; fixture.view.offers[0].outcomes = []; }
if (scenario === 'restricted') { fixture.view.canReturn = false; fixture.view.offers[0].outcomes = []; fixture.view.blockedReason = 'Fictional conflict restriction. Authorized recusal/review is required; assignment is locked in this state.'; }
const router = createMemoryRouter([{ path: '*', element: <UnsavedChangesProvider><main className={styles.previewShell}>
  <div className="no-print"><Notice tone="warning">Fictional UI simulation. This development preview is not a connected staff decision service or a sign-in flow.</Notice></div>
  <StaffDecisionWorkspace applicationId={fixture.view.application.id} session={fixture.session} gateway={scenario === 'unavailable' ? unavailableStaffDecisions : fixture.gateway}/>
</main></UnsavedChangesProvider> }]);
createRoot(document.getElementById('root')!).render(<RouterProvider router={router}/>);
