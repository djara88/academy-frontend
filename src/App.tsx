import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de tus pantallas
import Matricula from './pages/Matricula';
import SaaSAdmin from './pages/SaaSAdmin';

// Importa aquí tus otras pantallas si las tienes (ej: Dashboard, Login)
// import Dashboard from './pages/Dashboard';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Ruta base que redirige a la matrícula (o a tu login) */}
        <Route path="/" element={<Navigate to="/matricula" replace />} />
        
        {/* Rutas principales al MISMO NIVEL (Sin anidaciones conflictivas) */}
        <Route path="/matricula" element={<Matricula />} />
        <Route path="/saas-admin" element={<SaaSAdmin />} />
        
        {/* Si tuvieras un dashboard, iría aquí: */}
        {/* <Route path="/dashboard" element={<Dashboard />} /> */}

        {/* 
          RUTA DE RESCATE (404)
          Si el usuario escribe una URL que no existe, lo manda a la raíz.
          Nota: El asterisco (*) siempre debe ir al final, solo y sin anidar otras rutas dentro de él.
        */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
