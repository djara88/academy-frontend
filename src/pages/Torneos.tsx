import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

interface Torneo {
  id: string;
  nombre_torneo: string;
  temporada: string;
  estado: string;
}

const Torneos: React.FC = () => {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Torneo | null>(null);
  const [formData, setFormData] = useState({
    nombre_torneo: '',
    temporada: '',
    estado: 'Activo'
  });

  // Cargar torneos
  useEffect(() => {
    cargarTorneos();
  }, []);

  const cargarTorneos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/torneos');
      setTorneos(response.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar torneos:', err);
      setError(err.response?.data?.error || 'Error al cargar torneos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/api/torneos/${editando.id}`, formData);
      } else {
        await api.post('/api/torneos', formData);
      }
      setShowModal(false);
      setEditando(null);
      setFormData({ nombre_torneo: '', temporada: '', estado: 'Activo' });
      cargarTorneos();
    } catch (err: any) {
      console.error('Error al guardar torneo:', err);
      setError(err.response?.data?.error || 'Error al guardar torneo');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este torneo?')) return;
    try {
      await api.delete(`/api/torneos/${id}`);
      cargarTorneos();
    } catch (err: any) {
      console.error('Error al eliminar torneo:', err);
      setError(err.response?.data?.error || 'Error al eliminar torneo');
    }
  };

  const abrirModal = (torneo?: Torneo) => {
    if (torneo) {
      setEditando(torneo);
      setFormData({
        nombre_torneo: torneo.nombre_torneo,
        temporada: torneo.temporada || '',
        estado: torneo.estado || 'Activo'
      });
    } else {
      setEditando(null);
      setFormData({ nombre_torneo: '', temporada: '', estado: 'Activo' });
    }
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">🏆 Torneos</h1>
        <button
          onClick={() => abrirModal()}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuevo Torneo
        </button>
      </div>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-[#8b949e]">Cargando torneos...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {torneos.length === 0 ? (
            <p className="text-[#8b949e] col-span-full">No hay torneos registrados.</p>
          ) : (
            torneos.map((torneo) => (
              <div key={torneo.id} className="card p-6">
                <h3 className="text-lg font-bold text-[#e6edf3]">{torneo.nombre_torneo}</h3>
                <p className="text-sm text-[#8b949e]">Temporada: {torneo.temporada || 'No especificada'}</p>
                <p className="text-sm text-[#8b949e]">
                  Estado: 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                    torneo.estado === 'Activo' 
                      ? 'bg-[#00e676] text-[#0d1117]' 
                      : 'bg-[#e74c3c] text-white'
                  }`}>
                    {torneo.estado}
                  </span>
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => abrirModal(torneo)}
                    className="btn-secondary flex items-center gap-1 text-sm"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(torneo.id)}
                    className="btn-danger flex items-center gap-1 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar
                  </button>
                  <button
                    onClick={() => navigate(`/torneos/${torneo.id}/partidos`)}
                    className="btn-secondary flex items-center gap-1 text-sm"
                  >
                    <EyeIcon className="w-4 h-4" />
                    Ver Partidos
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] rounded-xl border border-[#2d3a4f] p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-[#e6edf3] mb-4">
              {editando ? 'Editar Torneo' : 'Nuevo Torneo'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label">Nombre del Torneo *</label>
                <input
                  type="text"
                  value={formData.nombre_torneo}
                  onChange={(e) => setFormData({ ...formData, nombre_torneo: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Ej: Liga de Verano 2026"
                />
              </div>
              <div className="mb-4">
                <label className="label">Temporada</label>
                <input
                  type="text"
                  value={formData.temporada}
                  onChange={(e) => setFormData({ ...formData, temporada: e.target.value })}
                  className="w-full"
                  placeholder="Ej: 2026"
                />
              </div>
              <div className="mb-4">
                <label className="label">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full"
                >
                  <option value="Activo">Activo</option>
                  <option value="Finalizado">Finalizado</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1">
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Torneos;
