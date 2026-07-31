import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';

interface Torneo {
  id: string;
  nombre_torneo: string;
  temporada: string;
  estado: string;
  created_at: string;
}

const Torneos: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newTorneo, setNewTorneo] = useState({ nombre_torneo: '', temporada: '' });

  const cargarTorneos = async () => {
    try {
      const response = await api.get('/api/torneos');
      setTorneos(response.data.data || []);
    } catch (err: any) {
      setError('Error al cargar torneos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTorneos();
  }, []);

  const crearTorneo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/torneos', newTorneo);
      setShowModal(false);
      setNewTorneo({ nombre_torneo: '', temporada: '' });
      cargarTorneos();
    } catch (err: any) {
      setError('Error al crear torneo');
      console.error(err);
    }
  };

  const eliminarTorneo = async (id: string) => {
    if (!confirm('¿Eliminar este torneo?')) return;
    try {
      await api.delete(`/api/torneos/${id}`);
      cargarTorneos();
    } catch (err: any) {
      setError('Error al eliminar torneo');
      console.error(err);
    }
  };

  if (loading) return <div className="text-[#e6edf3]">Cargando torneos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">🏆 Torneos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + Nuevo Torneo
        </button>
      </div>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {torneos.length === 0 ? (
        <div className="card p-6 text-[#8b949e] text-center">
          No hay torneos creados. ¡Comienza uno nuevo!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {torneos.map((torneo) => (
            <div key={torneo.id} className="card p-6 hover:border-[#00e676] transition-all duration-200">
              <h3 className="text-xl font-bold text-[#e6edf3]">{torneo.nombre_torneo}</h3>
              <p className="text-sm text-[#8b949e]">Temporada: {torneo.temporada}</p>
              <p className="text-sm text-[#8b949e]">Estado: {torneo.estado}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate(`/torneos/${torneo.id}`)}
                  className="btn-secondary text-sm"
                >
                  Ver Partidos
                </button>
                <button
                  onClick={() => eliminarTorneo(torneo.id)}
                  className="btn-danger text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear torneo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#161b22] p-6 rounded-xl border border-[#2d3a4f] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#e6edf3] mb-4">Nuevo Torneo</h2>
            <form onSubmit={crearTorneo}>
              <div className="mb-4">
                <label className="label">Nombre del Torneo</label>
                <input
                  type="text"
                  className="w-full"
                  value={newTorneo.nombre_torneo}
                  onChange={(e) => setNewTorneo({ ...newTorneo, nombre_torneo: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="label">Temporada</label>
                <input
                  type="text"
                  className="w-full"
                  value={newTorneo.temporada}
                  onChange={(e) => setNewTorneo({ ...newTorneo, temporada: e.target.value })}
                  placeholder="Ej: 2026"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">Crear</button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Torneos;
