import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface Categoria {
  id: string;
  nombre: string;
}

interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  tipo_alumno: string;
  foto_base64: string;
  categorias: Categoria[];
}

interface Evaluacion {
  id: string;
  fecha: string;
  datos_radar: Record<string, number>;
  comentarios_profesor: string;
}

const Jugadores: React.FC = () => {
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  
  // Estados de navegación
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  
  // Estados de carga y modales
  const [loading, setLoading] = useState(true);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  
  // Modal de Asignación de Categoría
  const [showAsignarCat, setShowAsignarCat] = useState(false);
  const [catAAsignar, setCatAAsignar] = useState('');

  // Cargar Datos Iniciales
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

  useEffect(() => {
    if (user?.academia_id) cargarDatos();
  }, [user]);

  // Cargar Evaluaciones al seleccionar un jugador
  useEffect(() => {
    if (jugadorSeleccionado) {
      api.get(`/api/jugadores/${jugadorSeleccionado.id}/evaluaciones`)
        .then(res => setEvaluaciones(res.data.data || []))
        .catch(err => console.error('Error cargando evaluaciones', err));
    }
  }, [jugadorSeleccionado]);

  // Crear nueva categoría
  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      await api.post('/api/jugadores/categorias', { nombre: nuevaCategoria });
      setNuevaCategoria('');
      cargarDatos();
    } catch (error) {
      console.error('Error al crear categoría', error);
    }
  };

  // Asignar jugador a categoría extra
  const handleAsignarCategoria = async () => {
    if (!jugadorSeleccionado || !catAAsignar) return;
    try {
      await api.post(`/api/jugadores/${jugadorSeleccionado.id}/categorias`, { categoria_id: catAAsignar });
      setShowAsignarCat(false);
      cargarDatos();
      // Actualizamos el jugador seleccionado localmente
      const catObj = categorias.find(c => c.id === catAAsignar);
      if (catObj) {
        setJugadorSeleccionado({
          ...jugadorSeleccionado,
          categorias: [...jugadorSeleccionado.categorias, catObj]
        });
      }
    } catch (error) {
      console.error('Error al asignar', error);
    }
  };

  // Filtrar Jugadores
  const jugadoresFiltrados = categoriaSeleccionada === 'Todas'
    ? jugadores
    : jugadores.filter(j => j.categorias.some(c => c.id === categoriaSeleccionada));

  // Preparar Datos del Gráfico de Radar (Compara las últimas 2 evaluaciones)
  const generarDatosRadar = () => {
    if (evaluaciones.length === 0) return [];
    
    // Tomamos la última (Actual) y la penúltima (Anterior)
    const evalActual = evaluaciones[0].datos_radar;
    const evalAnterior = evaluaciones.length > 1 ? evaluaciones[1].datos_radar : {};
    
    const habilidades = Object.keys(evalActual);
    
    return habilidades.map(hab => ({
      habilidad: hab,
      Actual: evalActual[hab] || 0,
      Anterior: evalAnterior[hab] || 0,
      fullMark: 100
    }));
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10">Cargando plantel...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏃‍♂️ Gestión de Jugadores</h1>
        {jugadorSeleccionado && (
          <button 
            onClick={() => setJugadorSeleccionado(null)}
            className="text-sm bg-[#21262d] text-white px-4 py-2 rounded-lg hover:bg-[#30363d]"
          >
            ← Volver al Plantel
          </button>
        )}
      </div>

      {!jugadorSeleccionado ? (
        /* VISTA 1: LISTADO DE JUGADORES Y CATEGORÍAS */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Columna Izquierda: Filtros y Categorías */}
          <div className="md:col-span-1 space-y-4">
            <div className="card-uniforme p-4">
              <h3 className="font-bold mb-3 text-[#289E9D]">Categorías</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setCategoriaSeleccionada('Todas')}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${categoriaSeleccionada === 'Todas' ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}
                  >
                    ⚽ Todas las categorías
                  </button>
                </li>
                {categorias.map(cat => (
                  <li key={cat.id}>
                    <button
                      onClick={() => setCategoriaSeleccionada(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${categoriaSeleccionada === cat.id ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}
                    >
                      {cat.nombre}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-[#30363d] pt-4">
                <p className="text-xs text-gray-500 mb-2">Crear nueva categoría (Ej: Sub-11)</p>
                <form onSubmit={handleCrearCategoria} className="flex gap-2">
                  <input
                    type="text"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    placeholder="Nombre..."
                    className="w-full text-sm py-2 px-3"
                  />
                  <button type="submit" className="bg-[#289E9D] text-white px-3 rounded-lg font-bold hover:bg-[#207f7e]">+</button>
                </form>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Grilla de Jugadores */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jugadoresFiltrados.map(jugador => (
                <div 
                  key={jugador.id} 
                  onClick={() => setJugadorSeleccionado(jugador)}
                  className="card-uniforme p-4 cursor-pointer hover:border-[#289E9D] transition-colors group flex items-center gap-4"
                >
                  <img 
                    src={jugador.foto_base64 || 'https://via.placeholder.com/150/161b22/8b949e?text=Sin+Foto'} 
                    alt={jugador.nombre} 
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#30363d] group-hover:border-[#289E9D]"
                  />
                  <div>
                    <h3 className="font-bold text-white truncate max-w-[150px]">{jugador.nombre}</h3>
                    <p className="text-xs text-gray-400">{jugador.posicion_cancha}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {jugador.categorias.map(c => (
                        <span key={c.id} className="text-[10px] bg-[#21262d] text-[#289E9D] px-2 py-0.5 rounded-full">
                          {c.nombre}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {jugadoresFiltrados.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500">
                  No hay jugadores en esta categoría.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA 2: FICHA TÉCNICA DEL JUGADOR */
        <div className="space-y-6">
          {/* Header del Jugador */}
          <div className="card-uniforme p-6 flex flex-col md:flex-row items-center gap-6 relative">
            <img 
              src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150/161b22/8b949e?text=Sin+Foto'} 
              alt={jugadorSeleccionado.nombre} 
              className="w-32 h-32 rounded-lg object-cover border-4 border-[#289E9D] shadow-lg"
            />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold text-white">{jugadorSeleccionado.nombre}</h2>
              <p className="text-lg text-[#289E9D] font-semibold">{jugadorSeleccionado.posicion_cancha}</p>
              
              <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                {jugadorSeleccionado.categorias.map(c => (
                  <span key={c.id} className="text-xs bg-[#21262d] text-gray-300 border border-[#30363d] px-3 py-1 rounded-full">
                    {c.nombre}
                  </span>
                ))}
                <button 
                  onClick={() => setShowAsignarCat(!showAsignarCat)}
                  className="text-xs bg-[#289E9D] text-white px-3 py-1 rounded-full font-bold hover:bg-[#207f7e]"
                >
                  + Asignar Categoría
                </button>
              </div>

              {showAsignarCat && (
                <div className="mt-3 flex gap-2">
                  <select 
                    value={catAAsignar} 
                    onChange={e => setCatAAsignar(e.target.value)}
                    className="text-sm py-1"
                  >
                    <option value="">Seleccionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <button onClick={handleAsignarCategoria} className="btn-primary py-1 px-3 text-sm">Guardar</button>
                </div>
              )}
            </div>

            {/* Acciones Principales */}
            <div className="flex flex-col gap-2">
              <button className="btn-primary text-sm shadow-[#289E9D]/20 shadow-lg">
                📝 Nueva Evaluación
              </button>
              <button className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-bold text-sm transition-colors shadow-orange-600/20 shadow-lg">
                📄 Generar Informe PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfico de Radar */}
            <div className="card-uniforme p-6 flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4 w-full text-left">📊 Evolución del Jugador</h3>
              {evaluaciones.length > 0 ? (
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={generarDatosRadar()}>
                      <PolarGrid stroke="#30363d" />
                      <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#8b949e', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8b949e' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#fff' }} 
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Radar name="Evaluación Actual" dataKey="Actual" stroke="#289E9D" fill="#289E9D" fillOpacity={0.5} />
                      {evaluaciones.length > 1 && (
                        <Radar name="Evaluación Anterior" dataKey="Anterior" stroke="#8b949e" fill="#8b949e" fillOpacity={0.3} />
                      )}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-500 w-full text-center">
                  Aún no hay evaluaciones para generar el radar.<br/>Haz clic en "Nueva Evaluación".
                </div>
              )}
            </div>

            {/* Tabla de Estadísticas y Torneos (Placeholder para ahora) */}
            <div className="card-uniforme p-6">
              <h3 className="text-xl font-bold mb-4">🏆 Estadísticas y Partidos</h3>
              <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[#8b949e] border-b border-[#30363d]">
                    <tr>
                      <th className="pb-2">Fecha</th>
                      <th className="pb-2">Competición</th>
                      <th className="pb-2">Desempeño</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr>
                      <td className="py-3 border-b border-[#30363d]">12/08/2026</td>
                      <td className="py-3 border-b border-[#30363d]">Liga Formativa</td>
                      <td className="py-3 border-b border-[#30363d] text-green-400 font-bold">Destacado</td>
                    </tr>
                    <tr>
                      <td className="py-3 border-b border-[#30363d]">05/08/2026</td>
                      <td className="py-3 border-b border-[#30363d]">Amistoso Local</td>
                      <td className="py-3 border-b border-[#30363d]">Regular</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-center text-xs text-gray-500 mt-6">
                  Pronto conectaremos esto automáticamente con el módulo de Torneos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jugadores;
