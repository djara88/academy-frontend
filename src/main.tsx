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
import './sports-dialogs-v2.css';
import './product-design-v2-1.css';
import './mobile-dock-v2-1-fix.css';
import VersionUpdateNotice from './components/VersionUpdateNotice';

const App = lazy(() => import('./App'));
const PublicAcademy = lazy(() => import('./pages/PublicAcademy'));

const isDirectPublicAcademyRoute = /^\/a\/[^/]+\/?$/.test(window.location.pathname);

const LoadingScreen = ({ academy = false }: { academy?: boolean }) => (
  <div className="grid min-h-screen place-items-center bg-[#e9ece4] px-6 text-center text-[#0b100c]">
    <div>
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#cdd5ca] border-t-[#93ba00]" />
      <p className="mt-4 text-sm font-black">{academy ? 'Cargando academia…' : 'Cargando Lestra…'}</p>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <VersionUpdateNotice />
    <Suspense fallback={<LoadingScreen academy={isDirectPublicAcademyRoute} />}>
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
  </React.StrictMode>
);
