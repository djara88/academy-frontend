import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './index.css';

const App = lazy(() => import('./App'));
const PublicAcademy = lazy(() => import('./pages/PublicAcademy'));

const isDirectPublicAcademyRoute = /^\/a\/[^/]+\/?$/.test(window.location.pathname);

const LoadingScreen = ({ academy = false }: { academy?: boolean }) => (
  <div className="grid min-h-screen place-items-center bg-[#0d1117] px-6 text-center text-[#70e4df]">
    <div>
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#289E9D]/25 border-t-[#70E4DF]" />
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
