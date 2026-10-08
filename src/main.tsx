import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import './portal-visibility.css';
import './training-session-v2.css';
import './readability-contract.css';
import './setup-v2.css';
import './subscription-v2.css';
import './director-brand-normalize.css';
import './director-accent-cleanup.css';
import './formation-friendlies.css';
import './prematricula-hide-finalidades.css';
import './student-profile-v2.css';
import './visual-readability-final.css';
import './visual-system-v2.css';
import './operational-workflows-v2.css';
import './performance-canvas-v2.css';
import './match-command-v2.css';
import './finance-desk-v2.css';
import './family-touchpoint-v2.css';
import './enrollment-handoff-v2.css';
import './competition-record-v2.css';
import './evolution-board-v2.css';
import './availability-board-v2.css';
import './attendance-command-v2.css';
import './staff-board-v2.css';
import './family-access-v2.css';
import './kit-room-v2.css';
import './sport-enrollment-v2.css';
import './admission-queue-v2.css';
import './guardian-home-v2.css';
import './public-academy-v2.css';
import './sports-dialogs-v2.css';
import './product-design-v2-1.css';
import './mobile-dock-v2-1-fix.css';
import VersionUpdateNotice from './components/VersionUpdateNotice';
import ClientErrorBoundary from './components/ClientErrorBoundary';
import RoleLoadingShell from './components/RoleLoadingShell';
import { initBrowserObservability } from './observability/browserTelemetry';

const App = lazy(() => import('./App'));
const PublicAcademy = lazy(() => import('./pages/PublicAcademy'));

initBrowserObservability();

const isDirectPublicAcademyRoute = /^\/a\/[^/]+\/?$/.test(window.location.pathname);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ClientErrorBoundary>
      <VersionUpdateNotice />
      <Suspense fallback={<RoleLoadingShell role={isDirectPublicAcademyRoute ? 'public' : undefined} label={isDirectPublicAcademyRoute ? 'Cargando academia…' : 'Cargando Lestra…'} />}>
      {isDirectPublicAcademyRoute ? (
        <BrowserRouter>
          <Routes>
            <Route path="/a/:slug" element={<PublicAcademy />} />
          </Routes>
        </BrowserRouter>
      ) : (
        <App />
      )}
      </Suspense>
    </ClientErrorBoundary>
  </React.StrictMode>
);
