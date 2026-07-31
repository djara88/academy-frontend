import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { PlusIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Partido {
  id: string;
  rival: string;
  fecha_partido: string;
  categoria_jugando: string;
  direccion: string;
  estado: string;
  goles_axf: number;
  goles_rival: number;
}

const Partidos: React.FC = () => {
  const { torneoId } = useParams();
  const navigate = useNavigate();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Partido | null>(null);
  const [formData, setFormData] = useState({
    rival: '',
    fecha_partido: '',
    categoria_jugando: '',
    direccion: '',
    estado: 'Programado'
  });

  useEffect(() => {
    cargarPartidos();
  }, [torneoId]);

  const cargarPartidos = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/partidos/torneo/${torneoId}`);
      setPartidos(response.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar partidos:', err);
      setError(err.response?.data?.error || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/api/partidos/${editando.id}`, formData);
      } else {
        await api.post('/api/partidos', { ...formData, torneo_id: torneoId });
      }
      setShowModal(false);
      setEditando(null);
      setFormData({ rival: '', fecha_partido: '', categoria_jugando: '', direccion: '', estado: 'Programado' });
      cargarPartidos();
    } catch (err: any) {
      console.error('Error al guardar partido:', err);
      setError(err.response?.data?.error || 'Error al guardar partido');
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este partido?')) return;
    try {
      await api.delete(`/api/partidos/${id}`);
      cargarPartidos();
    } catch (err: any) {
      console.error('Error al eliminar partido:', err);
      setError(err.response?.data?.error || 'Error al eliminar partido');
    }
  };

  const abrirModal = (partido?: Partido) => {
    if (partido) {
      setEditando(partido);
      setFormData({
        rival: partido.rival,
        fecha_partido: partido.fecha_partido,
        categoria_jugando: partido.categoria_jugando,
        direccion: partido.direccion || '',
        estado: partido.estado || 'Programado'
      });
    } else {
      setEditando(null);
      setFormData({ rival: '', fecha_partido: '', categoria_jugando: '', direccion: '', estado: 'Programado' });
    }
    setShowModal(true);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/torneos')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Volver
        </button>
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">⚽ Partidos</h1>
        <button
          onClick={() => abrirModal()}
          className="btn-primary flex items-center gap-2 ml-auto"
        >
          <PlusIcon className="w-5 h-5" />
          Programar Partido
        </button>
      </div>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-[#8b949e]">Cargando partidos...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {partidos.length === 0 ? (
            <p className="text-[#8b949e]">No hay partidos programados para este torneo.</p>
          ) : (
            partidos.map((partido) => (
              <div key={partido.id} className="card p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[#e6edf3]">
                    vs {partido.rival}
                  </h3>
                  <p className="text-sm text-[#8b949e]">
                    {partido.categoria_jugando} • {partido.fecha_partido}
                  </p>
                  <p className="text-sm text-[#8b949e]">📍 {partido.direccion || 'Por definir'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    partido.estado === 'Jugado' 
                      ? 'bg-[#00e676] text-[#0d1117]' 
                      : partido.estado === 'Programado'
                      ? 'bg-[#f39c12] text-[#0d1117]'
                      : 'bg-[#e74c3c] text-white'
                  }`}>
                    {partido.estado}
                  </span>
                  {partido.estado === 'Jugado' && (
                    <span className="text-sm font-bold text-[#e6edf3]">
                      {partido.goles_axf} - {partido.goles_rival}
                    </span>
                  )}
                  <button
                    onClick={() => abrirModal(partido)}
                    className="btn-secondary flex items-center gap-1 text-sm"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleEliminar(partido.id)}
                    className="btn-danger flex items-center gap-1 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar
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
          <div className="bg-[#161b22] rounded-xl border border-[#2d3a4f] p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-[#e6edf3] mb-4">
              {editando ? 'Editar Partido' : 'Programar Partido'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="label">Rival *</label>
                <input
                  type="text"
                  value={formData.rival}
                  onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
                  required
                  className="w-full"
                  placeholder="Nombre del equipo rival"
                />
              </div>
              <div className="mb-4">
                <label className="label">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={formData.fecha_partido}
                  onChange={(e) => setFormData({ ...formData, fecha_partido: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="mb-4">
                <label className="label">Categoría que juega</label>
                <input
                  type="text"
                  value={formData.categoria_jugando}
                  onChange={(e) => setFormData({ ...formData, categoria_jugando: e.target.value })}
                  className="w-full"
                  placeholder="Ej: Sub-13"
                />
              </div>
              <div className="mb-4">
                <label className="label">Dirección / Cancha</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full"
                  placeholder="Ej: Estadio Nacional, Ñuñoa"
                />
              </div>
              <div className="mb-4">
                <label className="label">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full"
                >
                  <option value="Programado">Programado</option>
                  <option value="Jugado">Jugado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="btn-primary flex-1">
                  {editando ? 'Actualizar' : 'Programar'}
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

export default Partidos;
