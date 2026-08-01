import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importación de tus pantallas
import Matricula from './pages/Matricula';
import SaaSAdmin from './pages/SaaSAdmin';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Ruta Raíz: Redirige directamente a la matrícula */}
        <Route path="/" element={<Navigate to="/matricula" replace />} />
        
        {/* Rutas Principales: Absolutas y al mismo nivel */}
        <Route path="/matricula" element={<Matricula />} />
        <Route path="/saas-admin" element={<SaaSAdmin />} />
        
        {/* Ruta de Rescate (404) */}
        <Route path="*" element={<Navigate to="/matricula" replace />} />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
