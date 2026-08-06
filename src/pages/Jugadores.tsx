import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface Categoria { id: string; nombre: string; }
interface Jugador {
  id: string; nombre: string; posicion_cancha: string;
  tipo_alumno: string; foto_base64: string; fecha_nacimiento: string;
  categorias: Categoria[];
}
interface Evaluacion {
  id: string; created_at: string; datos_radar: Record<string, number>; comentarios_profesor: string;
}

const Jugadores: React.FC = () => {
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [showAsignarCat, setShowAsignarCat] = useState(false);
  const [catAAsignar, setCatAAsignar] = useState('');

  // Estados Modal Nueva Evaluación
  const [showModalEval, setShowModalEval] = useState(false);
  const [nuevaEvalDatos, setNuevaEvalDatos] = useState<Record<string, number>>({});
  const [comentariosEval, setComentariosEval] = useState('');
  const [guardandoEval, setGuardandoEval] = useState(false);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resJugadores, resCategorias] = await Promise.all([
        api.get('/api/jugadores'),
        api.get('/api/jugadores/categorias')
      ]);
      setJugadores(resJugadores.data.data || []);
      setCategorias(resCategorias.data.data || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEvaluaciones = async (id: string) => {
    try {
      const res = await api.get(`/api/jugadores/${id}/evaluaciones`);
      setEvaluaciones(res.data.data || []);
    } catch (error) {
      console.error('Error cargando evaluaciones', error);
    }
  };

  useEffect(() => { if (user?.academia_id) cargarDatos(); }, [user]);
  useEffect(() => { if (jugadorSeleccionado) cargarEvaluaciones(jugadorSeleccionado.id); }, [jugadorSeleccionado]);

  // ==========================================
  // UTILIDADES DE FECHAS (Edad y Año)
  // ==========================================
  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nace = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nace.getFullYear();
    const m = hoy.getMonth() - nace.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nace.getDate())) edad--;
    return edad;
  };

  const obtenerAnio = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 'N/A';
    return new Date(fechaNacimiento).getFullYear().toString();
  };

  // ==========================================
  // FUNCIONES CRUD
  // ==========================================
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    await api.post('/api/jugadores/categorias', { nombre: nuevaCategoria });
    setNuevaCategoria('');
    cargarDatos();
  };

  const handleAsignarCategoria = async () => {
    if (!jugadorSeleccionado || !catAAsignar) return;
    await api.post(`/api/jugadores/${jugadorSeleccionado.id}/categorias`, { categoria_id: catAAsignar });
    setShowAsignarCat(false);
    cargarDatos();
    const catObj = categorias.find(c => c.id === catAAsignar);
    if (catObj) setJugadorSeleccionado({ ...jugadorSeleccionado, categorias: [...jugadorSeleccionado.categorias, catObj] });
  };

  // ==========================================
  // MODAL DE EVALUACIÓN
  // ==========================================
  const abrirModalEval = () => {
    const skillsMap: Record<string, string[]> = {
      Arquero: ['Reflejos', 'Estirada', 'Saque de Mano', 'Saque de Meta', 'Juego de Pies', 'Valentía'],
      Delantero: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Mediocampista: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Defensa: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental']
    };
    const habs = skillsMap[jugadorSeleccionado?.posicion_cancha || 'Delantero'];
    const evalInicial: Record<string, number> = {};
    
    // Si ya tiene una evaluación anterior, cargamos esos datos como base para modificarlos
    if (evaluaciones.length > 0) {
      const ultimaEval = evaluaciones[0].datos_radar;
      habs.forEach(h => evalInicial[h] = ultimaEval[h] || 50);
    } else {
      habs.forEach(h => evalInicial[h] = 50);
    }
    
    setNuevaEvalDatos(evalInicial);
    setComentariosEval('');
    setShowModalEval(true);
  };

  const handleGuardarEvaluacion = async () => {
    if (!jugadorSeleccionado) return;
    setGuardandoEval(true);
    try {
      await api.post(`/api/jugadores/${jugadorSeleccionado.id}/evaluaciones`, {
        datos_radar: nuevaEvalDatos,
        comentarios_profesor: comentariosEval
      });
      setShowModalEval(false);
      cargarEvaluaciones(jugadorSeleccionado.id); // Refrescar radar
    } catch (error) {
      console.error('Error guardando evaluación', error);
    } finally {
      setGuardandoEval(false);
    }
  };

  const jugadoresFiltrados = categoriaSeleccionada === 'Todas'
    ? jugadores
    : jugadores.filter(j => j.categorias.some(c => c.id === categoriaSeleccionada));

  const generarDatosRadar = () => {
    if (evaluaciones.length === 0) return [];
    const evalActual = evaluaciones[0].datos_radar;
    const evalAnterior = evaluaciones.length > 1 ? evaluaciones[1].datos_radar : {};
    return Object.keys(evalActual).map(hab => ({
      habilidad: hab,
      Actual: evalActual[hab] || 0,
      Anterior: evalAnterior[hab] || 0,
      fullMark: 100
    }));
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10">Cargando plantel...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏃‍♂️ Gestión de Jugadores</h1>
        {jugadorSeleccionado && (
          <button onClick={() => setJugadorSeleccionado(null)} className="text-sm bg-[#21262d] text-white px-4 py-2 rounded-lg hover:bg-[#30363d] transition-colors">
            ← Volver al Plantel
          </button>
        )}
      </div>

      {!jugadorSeleccionado ? (
        /* VISTA 1: LISTADO EN FORMATO TABLA (Adiós a las tarjetas) */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="card-uniforme p-4">
              <h3 className="font-bold mb-3 text-[#289E9D]">Categorías</h3>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => setCategoriaSeleccionada('Todas')} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${categoriaSeleccionada === 'Todas' ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}>
                    ⚽ Todas las categorías
                  </button>
                </li>
                {categorias.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => setCategoriaSeleccionada(cat.id)} className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${categoriaSeleccionada === cat.id ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}>
                      {cat.nombre}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-[#30363d] pt-4">
                <p className="text-xs text-gray-500 mb-2">Crear nueva categoría</p>
                <form onSubmit={handleCrearCategoria} className="flex gap-2">
                  <input type="text" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Ej: Sub-11" className="w-full text-sm py-2 px-3" />
                  <button type="submit" className="bg-[#289E9D] text-white px-3 rounded-lg font-bold hover:bg-[#207f7e]">+</button>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 card-uniforme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#1f2937] text-[#8b949e] border-b border-[#30363d] text-sm">
                  <tr>
                    <th className="p-4 font-semibold">Jugador</th>
                    <th className="p-4 font-semibold">Posición</th>
                    <th className="p-4 font-semibold">Edad</th>
                    <th className="p-4 font-semibold">Año Nac.</th>
                    <th className="p-4 font-semibold">Categorías</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]">
                  {jugadoresFiltrados.map(jugador => (
                    <tr key={jugador.id} onClick={() => setJugadorSeleccionado(jugador)} className="hover:bg-[#21262d] cursor-pointer transition-colors group">
                      <td className="p-4 flex items-center gap-3">
                        <img src={jugador.foto_base64 || 'https://via.placeholder.com/150/161b22/8b949e'} alt="" className="w-10 h-10 rounded-full object-cover border border-[#30363d] group-hover:border-[#289E9D]" />
                        <span className="font-bold text-white">{jugador.nombre}</span>
                      </td>
                      <td className="p-4 text-gray-300">{jugador.posicion_cancha}</td>
                      <td className="p-4 text-gray-300 font-medium">{calcularEdad(jugador.fecha_nacimiento)} años</td>
                      <td className="p-4 text-gray-300">{obtenerAnio(jugador.fecha_nacimiento)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {jugador.categorias.map(c => (
                            <span key={c.id} className="text-[10px] bg-[#161b22] border border-[#30363d] text-[#289E9D] px-2 py-1 rounded-full">
                              {c.nombre}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {jugadoresFiltrados.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay jugadores registrados en esta vista.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA 2: FICHA TÉCNICA */
        <div className="space-y-6">
          <div className="card-uniforme p-6 flex flex-col md:flex-row items-center gap-6">
            <img src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150/161b22/8b949e'} className="w-32 h-32 rounded-lg object-cover border-4 border-[#289E9D] shadow-lg" alt=""/>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white">{jugadorSeleccionado.nombre}</h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1">
                <p className="text-lg text-[#289E9D] font-semibold">{jugadorSeleccionado.posicion_cancha}</p>
                <span className="text-sm text-gray-400">|</span>
                <p className="text-sm text-gray-300">Edad: <strong className="text-white">{calcularEdad(jugadorSeleccionado.fecha_nacimiento)} años</strong></p>
                <span className="text-sm text-gray-400">|</span>
                <p className="text-sm text-gray-300">Nacimiento: <strong className="text-white">{obtenerAnio(jugadorSeleccionado.fecha_nacimiento)}</strong></p>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start items-center">
                {jugadorSeleccionado.categorias.map(c => <span key={c.id} className="text-xs bg-[#21262d] text-gray-300 border border-[#30363d] px-3 py-1 rounded-full">{c.nombre}</span>)}
                <button onClick={() => setShowAsignarCat(!showAsignarCat)} className="text-xs bg-[#1f2937] text-white border border-[#30363d] px-3 py-1 rounded-full hover:bg-[#30363d] transition-colors">
                  + Asignar
                </button>
              </div>
              {showAsignarCat && (
                <div className="mt-3 flex gap-2">
                  <select value={catAAsignar} onChange={e => setCatAAsignar(e.target.value)} className="text-sm py-1 rounded bg-[#0d1117] border-[#30363d] text-white">
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button onClick={handleAsignarCategoria} className="bg-[#289E9D] text-white py-1 px-3 rounded-lg text-sm font-bold">Guardar</button>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={abrirModalEval} className="btn-primary text-sm shadow-[#289E9D]/20 shadow-lg">
                📝 Nueva Evaluación
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-bold text-sm transition-colors shadow-orange-600/20 shadow-lg">
                📄 Generar Informe PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-uniforme p-6 flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4 w-full text-left">📊 Evolución del Jugador</h3>
              {evaluaciones.length > 0 ? (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={generarDatosRadar()}>
                      <PolarGrid stroke="#30363d" />
                      <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#8b949e', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8b949e' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                      <Radar name="Evaluación Actual" dataKey="Actual" stroke="#289E9D" fill="#289E9D" fillOpacity={0.5} />
                      {evaluaciones.length > 1 && <Radar name="Evaluación Anterior" dataKey="Anterior" stroke="#8b949e" fill="#8b949e" fillOpacity={0.3} />}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500 w-full text-center">Aún no hay evaluaciones registradas.</div>
              )}
            </div>

            <div className="card-uniforme p-6">
              <h3 className="text-xl font-bold mb-4">🏆 Estadísticas y Partidos</h3>
              <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[#8b949e] border-b border-[#30363d]">
                    <tr><th className="pb-2">Fecha</th><th className="pb-2">Competición</th><th className="pb-2">Desempeño</th></tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr><td className="py-3 border-b border-[#30363d]">12/08/2026</td><td className="py-3 border-b border-[#30363d]">Liga Formativa</td><td className="py-3 border-b border-[#30363d] text-green-400 font-bold">Destacado</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVA EVALUACIÓN */}
      {showModalEval && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">📝 Evaluar a {jugadorSeleccionado?.nombre}</h2>
            <p className="text-sm text-gray-400 mb-6">Mueve los controles para calificar del 0 al 100.</p>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {Object.keys(nuevaEvalDatos).map(skill => (
                <div key={skill} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-gray-300">{skill}</span>
                  <input type="range" min="0" max="100" value={nuevaEvalDatos[skill]} 
                    onChange={e => setNuevaEvalDatos({...nuevaEvalDatos, [skill]: Number(e.target.value)})} 
                    className="flex-1 accent-[#289E9D]"
                  />
                  <span className="w-10 text-right font-bold text-[#289E9D]">{nuevaEvalDatos[skill]}</span>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-400 mb-2">Comentarios del Profesor</label>
              <textarea 
                value={comentariosEval} onChange={e => setComentariosEval(e.target.value)}
                placeholder="Observaciones de esta evaluación..."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none resize-none h-24"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModalEval(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleGuardarEvaluacion} disabled={guardandoEval} className="bg-[#289E9D] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#207f7e] transition-colors">
                {guardandoEval ? 'Guardando...' : 'Guardar Evaluación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jugadores;
