import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const NuevoTorneo: React.FC = () => {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [temporada, setTemporada] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/api/torneos', { nombre_torneo: nombre, temporada });
      navigate('/torneos');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear torneo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">🏆 Nuevo Torneo</h1>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Nombre del Torneo *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full"
            placeholder="Ej: Copa de Verano 2025"
          />
        </div>

        <div>
          <label className="label">Temporada / Año</label>
          <input
            type="text"
            value={temporada}
            onChange={(e) => setTemporada(e.target.value)}
            className="w-full"
            placeholder="2025"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creando...' : 'Crear Torneo'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/torneos')}
            className="btn-secondary"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NuevoTorneo;
