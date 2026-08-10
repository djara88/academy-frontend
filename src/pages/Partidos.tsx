// src/pages/Partidos.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Partido {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  link_maps: string;
  color_uniforme: string;
  es_amistoso: boolean;
  cobra_arbitraje: boolean;
  monto_arbitraje_jugador: number;
  goles_favor: number;
  goles_contra: number;
  estado: string;
  torneo_id?: string;
  torneos?: { nombre: string };
}

const Partidos: React.FC = () => {
  const navigate = useNavigate();
  const { torneoId } = useParams<{ torneoId: string }>();
  const [searchParams] = useSearchParams();
  const torneoQueryParam = searchParams.get('torneo_id');

  const idTorneoActivo = torneoId || torneoQueryParam;

  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'torneo' | 'amistosos'>('todos');

  // Modal de creación de partido
  const [showModal, setShowModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    es_amistoso: false,
    torneo_id: idTorneoActivo || '',
    rival: '',
    fecha: '',
    hora: '',
    ubicacion: '',
    link_maps: '',
    color_uniforme: 'Titular',
    cobra_arbitraje: false,
    monto_arbitraje_jugador: 0
  });

  useEffect(() => {
    cargarDatos();
  }, [idTorneoActivo, filtro]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError('');

      let url = '/api/partidos';
      if (idTorneoActivo) {
        url = `/api/partidos?torneo_id=${idTorneoActivo}`;
      } else if (filtro === 'amistosos') {
        url = '/api/partidos?tipo=amistosos';
      } else if (filtro === 'torneo') {
        url = '/api/partidos?tipo=torneo';
      }

      const [resPartidos, resTorneos] = await Promise.all([
        api.get(url),
        api.get('/api/torneos')
      ]);

      setPartidos(resPartidos.data.data || []);
      setTorneos(resTorneos.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar partidos:', err);
      setError(err.response?.data?.error || 'Error al cargar los partidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post('/api/partidos', form);
      setShowModal(false);
      setForm({
        es_amistoso: false,
        torneo_id: idTorneoActivo || '',
        rival: '',
        fecha: '',
        hora: '',
        ubicacion: '',
        link_maps: '',
        color_uniforme: 'Titular',
        cobra_arbitraje: false,
        monto_arbitraje_jugador: 0
      });
      cargarDatos();
    } catch (err: any) {
      console.error('Error al guardar partido:', err);
      alert('Ocurrió un error al guardar el partido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {idTorneoActivo && (
            <button
              onClick={() => navigate('/torneos')}
              className="bg-[#21262d] text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#30363d] text-sm"
            >
              ← Volver a Torneos
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-[#e6edf3]">⚽ Fixture y Partidos</h1>
            <p className="text-sm text-gray-400">
              {idTorneoActivo ? 'Partidos programados para este torneo.' : 'Gestión integral de partidos oficiales y encuentros amistosos.'}
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-5 py-2.5 rounded-lg font-bold shadow-lg transition-colors cursor-pointer"
        >
          + Programar Partido
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* BOTONES DE FILTRO SI NO ESTÁ FILTRADO POR UN TORNEO EN LA URL */}
      {!idTorneoActivo && (
        <div className="flex gap-2 bg-[#0d1117] p-1.5 rounded-lg border border-[#30363d] w-fit text-sm">
          <button 
            onClick={() => setFiltro('todos')} 
            className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${filtro === 'todos' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Todos los partidos
          </button>
          <button 
            onClick={() => setFiltro('torneo')} 
            className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${filtro === 'torneo' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🏆 De Torneos
          </button>
          <button 
            onClick={() => setFiltro('amistosos')} 
            className={`px-4 py-1.5 rounded-md font-semibold transition-colors ${filtro === 'amistosos' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            🤝 Amistosos
          </button>
        </div>
      )}

      {/* TARJETAS DE PARTIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10 text-[#289E9D] font-bold">Cargando partidos...</div>
        ) : partidos.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#0d1117] rounded-xl border border-[#30363d] text-gray-500">
            No hay partidos programados.
          </div>
        ) : (
          partidos.map(partido => (
            <div key={partido.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-3 relative hover:border-[#289E9D] transition-colors">
              <div className="flex justify-between items-center">
                {partido.es_amistoso ? (
                  <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    🤝 Partido Amistoso
                  </span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold truncate max-w-[180px]">
                    🏆 {partido.torneos?.nombre || 'Torneo'}
                  </span>
                )}
                <span className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                  partido.estado === 'Jugado' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40' 
                    : partido.estado === 'Programado' 
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  {partido.estado}
                </span>
              </div>

              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Rival</span>
                <h3 className="text-xl font-bold text-white">vs {partido.rival}</h3>
              </div>

              {/* RESULTADO (SI YA SE JUGÓ) */}
              {partido.estado === 'Jugado' && (
                <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-lg text-center">
                  <span className="text-xs text-gray-400 block mb-1">Marcador Final</span>
                  <span className="text-2xl font-black text-white">
                    {partido.goles_favor} - {partido.goles_contra}
                  </span>
                </div>
              )}

              {/* DETALLES DE FECHA Y HORA */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#161b22] p-3 rounded-lg border border-[#30363d]/50 text-gray-300">
                <div>
                  <span className="text-gray-500 block">📅 Fecha</span>
                  <strong className="text-white">{partido.fecha}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">⏰ Hora</span>
                  <strong className="text-white">{partido.hora} hrs</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500 block">📍 Lugar</span>
                  <strong className="text-white">{partido.ubicacion || 'Por confirmar'}</strong>
                </div>
              </div>

              {/* COBRO DE ARBITRAJE */}
              {partido.cobra_arbitraje && (
                <div className="bg-amber-900/20 border border-amber-500/30 p-2.5 rounded-lg flex justify-between items-center text-xs">
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    ⚖️ Arbitraje (En cancha):
                  </span>
                  <strong className="text-amber-400 text-sm">
                    ${Number(partido.monto_arbitraje_jugador).toLocaleString('es-CL')} / jug.
                  </strong>
                </div>
              )}

              {partido.link_maps && (
                <a 
                  href={partido.link_maps} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block text-center bg-[#21262d] hover:bg-[#30363d] text-gray-300 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  🗺️ Ver Ubicación en Mapas
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL PROGRAMAR PARTIDO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-white">⚽ Programar Partido</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              
              {/* SELECCIÓN TIPO */}
              <div className="flex gap-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                  <input 
                    type="radio" 
                    name="es_amistoso" 
                    checked={!form.es_amistoso} 
                    onChange={() => setForm({ ...form, es_amistoso: false })}
                    className="accent-[#289E9D]"
                  />
                  🏆 De Torneo
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-white font-medium">
                  <input 
                    type="radio" 
                    name="es_amistoso" 
                    checked={form.es_amistoso} 
                    onChange={() => setForm({ ...form, es_amistoso: true, torneo_id: '' })}
                    className="accent-[#289E9D]"
                  />
                  🤝 Amistoso
                </label>
              </div>

              {!form.es_amistoso && (
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Seleccionar Torneo *</label>
                  <select 
                    name="torneo_id" 
                    required={!form.es_amistoso}
                    value={form.torneo_id} 
                    onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="">-- Elige el torneo --</option>
                    {torneos.map(t => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Rival / Equipo Contrario *</label>
                <input 
                  type="text" 
                  name="rival" 
                  required 
                  placeholder="Ej: Colo Colo Filial Sur" 
                  value={form.rival} 
                  onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Fecha *</label>
                  <input 
                    type="date" 
                    name="fecha" 
                    required 
                    value={form.fecha} 
                    onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Hora *</label>
                  <input 
                    type="time" 
                    name="hora" 
                    required 
                    value={form.hora} 
                    onChange={handleChange}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Lugar / Nombre del Complejo</label>
                <input 
                  type="text" 
                  name="ubicacion" 
                  placeholder="Ej: Estadio Municipal Cancha 2" 
                  value={form.ubicacion} 
                  onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Link Ubicación (Waze / Google Maps)</label>
                <input 
                  type="url" 
                  name="link_maps" 
                  placeholder="https://maps.app.goo.gl/..." 
                  value={form.link_maps} 
                  onChange={handleChange}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                />
              </div>

              {/* COBRO DE ARBITRAJE */}
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-bold text-white flex items-center gap-2">
                    ⚖️ ¿Aplica cuota de arbitraje?
                  </span>
                  <input 
                    type="checkbox" 
                    name="cobra_arbitraje" 
                    checked={form.cobra_arbitraje} 
                    onChange={handleChange}
                    className="w-4 h-4 accent-[#289E9D]"
                  />
                </label>

                {form.cobra_arbitraje && (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">Monto a cobrar por jugador (Día del partido)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 font-bold">$</span>
                      <input 
                        type="number" 
                        name="monto_arbitraje_jugador" 
                        min="0"
                        value={form.monto_arbitraje_jugador} 
                        onChange={handleChange}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 pl-7 text-white outline-none focus:border-[#289E9D]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando} 
                  className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-6 py-2 rounded-lg font-bold"
                >
                  {guardando ? 'Guardando...' : 'Programar Partido'}
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
