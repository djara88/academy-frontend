import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import './revolution.css';
import './new-era.css';
import './new-era-bridge.css';
import './new-era-type.css';
import './reference-focus.css';
import './workspace-focus.css';
import './wow-system.css';
import './readability-contract.css';
import './setup-polish.css';
import './setup-action-fix.css';
import './setup-schedule-fix.css';
import './setup-optional-fix.css';
import './setup-optional-actions.css';
import './director-reference-system.css';
import './director-uniformity.css';
import './director-brand-normalize.css';
import './director-accent-cleanup.css';
import './director-hero-unified.css';
import './formation-friendlies.css';
import './chat-composer-lestra.css';
import './prematriculas-recientes-lestra.css';
import './prematricula-hide-finalidades.css';
import './alumno-profile-readability.css';
import './visual-readability-final.css';
import './inscripciones-contrast-lock.css';
import './student-report-contrast-lock.css';
import './director-contrast-safety.css';
import './tournament-contrast-safety.css';
import './visual-system-v2.css';
import './operational-workflows-v2.css';
import './sports-dialogs-v2.css';

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