import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface Partido {
  id: string;
  rival: string;
  fecha_partido: string;
  categoria_jugando: string;
  direccion: string;
  goles_axf: number;
  goles_rival: number;
  estado: string;
}

const Partidos: React.FC = () => {
  const { torneoId } = useParams<{ torneoId: string }>();
  const navigate = useNavigate();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newPartido, setNewPartido] = useState({
    rival: '',
    fecha_partido: '',
    categoria_jugando: '',
    direccion: ''
  });

  const cargarPartidos = async () => {
    try {
      const response = await api.get(`/api/partidos/torneo/${torneoId}`);
      setPartidos(response.data.data || []);
    } catch (err: any) {
      setError('Error al cargar partidos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (torneoId) cargarPartidos();
  }, [torneoId]);

  const crearPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/partidos', { ...newPartido, torneo_id: torneoId });
      setShowModal(false);
      setNewPartido({ rival: '', fecha_partido: '', categoria_jugando: '', direccion: '' });
      cargarPartidos();
    } catch (err: any) {
      setError('Error al crear partido');
      console.error(err);
    }
  };

  const eliminarPartido = async (id: string) => {
    if (!confirm('¿Eliminar este partido?')) return;
    try {
      await api.delete(`/api/partidos/${id}`);
      cargarPartidos();
    } catch (err: any) {
      setError('Error al eliminar partido');
      console.error(err);
    }
  };

  if (loading) return <div className="text-[#e6edf3]">Cargando partidos...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">⚽ Partidos del Torneo</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate('/torneos')} className="btn-secondary">Volver</button>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Nuevo Partido</button>
        </div>
      </div>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {partidos.length === 0 ? (
        <div className="card p-6 text-[#8b949e] text-center">
          No hay partidos programados para este torneo.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {partidos.map((partido) => (
            <div key={partido.id} className="card p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-[#e6edf3]">vs {partido.rival}</h3>
                  <p className="text-sm text-[#8b949e]">Categoría: {partido.categoria_jugando}</p>
                  <p className="text-sm text-[#8b949e]">Fecha: {new Date(partido.fecha_partido).toLocaleString()}</p>
                  <p className="text-sm text-[#8b949e]">📍 {partido.direccion}</p>
                  {partido.estado === 'Jugado' && (
                    <p className="text-sm font-bold text-[#00e676]">
                      Resultado: {partido.goles_axf} - {partido.goles_rival}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => navigate(`/partidos/${partido.id}`)}
                    className="btn-secondary text-xs"
                  >
                    Detalles
                  </button>
                  <button
                    onClick={() => eliminarPartido(partido.id)}
                    className="btn-danger text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                  partido.estado === 'Jugado' ? 'bg-[#00e676] text-[#0d1117]' : 'bg-[#f39c12] text-[#0d1117]'
                }`}>
                  {partido.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear partido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#161b22] p-6 rounded-xl border border-[#2d3a4f] w-full max-w-md">
            <h2 className="text-xl font-bold text-[#e6edf3] mb-4">Nuevo Partido</h2>
            <form onSubmit={crearPartido}>
              <div className="mb-4">
                <label className="label">Rival</label>
                <input
                  type="text"
                  className="w-full"
                  value={newPartido.rival}
                  onChange={(e) => setNewPartido({ ...newPartido, rival: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="label">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  className="w-full"
                  value={newPartido.fecha_partido}
                  onChange={(e) => setNewPartido({ ...newPartido, fecha_partido: e.target.value })}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="label">Categoría</label>
                <input
                  type="text"
                  className="w-full"
                  value={newPartido.categoria_jugando}
                  onChange={(e) => setNewPartido({ ...newPartido, categoria_jugando: e.target.value })}
                  placeholder="Ej: Sub-13"
                />
              </div>
              <div className="mb-4">
                <label className="label">Dirección / Cancha</label>
                <input
                  type="text"
                  className="w-full"
                  value={newPartido.direccion}
                  onChange={(e) => setNewPartido({ ...newPartido, direccion: e.target.value })}
                  placeholder="Ej: Estadio Nacional"
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

export default Partidos;
