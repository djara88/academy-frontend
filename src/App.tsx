import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Matricula from './pages/Matricula';
import Jugadores from './pages/Jugadores';
import Torneos from './pages/Torneos';
import Partidos from './pages/Partidos';
import Layout from './layouts/Layout';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <div className="text-[#e6edf3]">Cargando...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="*" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="matricula" element={<Matricula />} />
        <Route path="jugadores" element={<Jugadores />} />
        <Route path="torneos" element={<Torneos />} />
        <Route path="torneos/:torneoId/partidos" element={<Partidos />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Route>
    </Routes>
  );
}

export default App;
