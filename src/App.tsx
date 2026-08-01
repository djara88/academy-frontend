import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Importación de tus pantallas
import Matricula from './pages/Matricula';
import SaaSAdmin from './pages/SaaSAdmin';

// Si tienes un componente Layout (como un menú o sidebar), impórtalo aquí.
// import Layout from './components/Layout'; 

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* 
          LA SOLUCIÓN:
          Si envuelves tus rutas bajo una ruta principal con "/*",
          las rutas hijas deben escribirse SIN el "/" inicial.
          Ejemplo: path="saas-admin" (CORRECTO) vs path="/saas-admin" (INCORRECTO)
        */}
        <Route path="/*">
          
          {/* Redirección inicial */}
          <Route index element={<Navigate to="matricula" replace />} />
          
          {/* Pantallas principales SIN barra diagonal al principio */}
          <Route path="matricula" element={<Matricula />} />
          <Route path="saas-admin" element={<SaaSAdmin />} />
          
          {/* 
            Ruta 404 (Rescate)
            Cualquier cosa que no exista, manda a matrícula
          */}
          <Route path="*" element={<Navigate to="matricula" replace />} />
          
        </Route>

      </Routes>
    </BrowserRouter>
  );
};

export default App;
