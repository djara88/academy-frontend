import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';
import './revolution.css';
import './new-era.css';
import './new-era-bridge.css';
import './new-era-type.css';
import './reference-focus.css';

const App = lazy(() => import('./App'));
const PublicAcademy = lazy(() => import('./pages/PublicAcademy'));

const isDirectPublicAcademyRoute = /^\/a\/[^/]+\/?$/.test(window.location.pathname);

const LoadingScreen = ({ academy = false }: { academy?: boolean }) => (
  <div className="grid min-h-screen place-items-center bg-[#f7f8f5] px-6 text-center text-[#111511]">
    <div>
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#e2e5de] border-t-[#b8ef00]" />
      <p className="mt-4 text-sm font-black">{academy ? 'Cargando academia...' : 'Cargando Lestra...'}</p>
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
