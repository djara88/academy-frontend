import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

  const [showModalEval, setShowModalEval] = useState(false);
  const [nuevaEvalDatos, setNuevaEvalDatos] = useState<Record<string, number>>({});
  const [comentariosEval, setComentariosEval] = useState('');
  const [guardandoEval, setGuardandoEval] = useState(false);

  const [showModalInforme, setShowModalInforme] = useState(false);
  const [comentariosInforme, setComentariosInforme] = useState('');
  const [generandoPDF, setGenerandoPDF] = useState(false);
  
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

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

  const abrirModalEval = () => {
    const skillsMap: Record<string, string[]> = {
      Arquero: ['Reflejos', 'Estirada', 'Saque de Mano', 'Saque de Meta', 'Juego de Pies', 'Valentía'],
      Delantero: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Mediocampista: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Defensa: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental']
    };
    const habs = skillsMap[jugadorSeleccionado?.posicion_cancha || 'Delantero'];
    const evalInicial: Record<string, number> = {};
    
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
      cargarEvaluaciones(jugadorSeleccionado.id);
    } catch (error) {
      console.error('Error guardando evaluación', error);
    } finally {
      setGuardandoEval(false);
    }
  };

  // 🔥 NUEVO GENERADOR DE PDF (Optimizado con JPEG y menor tamaño)
  const handleGenerarPDF = async () => {
    if (!pdfTemplateRef.current || !jugadorSeleccionado) return;
    setGenerandoPDF(true);
    
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true
      });

      // 🔥 OPTIMIZACIÓN: De PNG a JPEG calidad 80%
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Agregamos como JPEG
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfBase64 = pdf.output('datauristring');

      try {
        await api.post(`/api/jugadores/${jugadorSeleccionado.id}/enviar-informe`, {
          pdf_base64: pdfBase64,
          comentarios: comentariosInforme
        });
        alert('✅ ¡Informe generado, descargado y ENVIADO al apoderado con éxito!');
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError);
        alert('⚠️ El PDF se descargó, pero hubo un problema al enviarlo al correo del apoderado (revisa que el tutor tenga email válido).');
      }

      pdf.save(`Informe_Tecnico_${jugadorSeleccionado.nombre.replace(/\s+/g, '_')}.pdf`);
      setShowModalInforme(false);
    } catch (error) {
      console.error('❌ Error al generar el PDF:', error);
      alert('Hubo un error crítico al procesar el informe.');
    } finally {
      setGenerandoPDF(false);
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
    <div className="max-w-7xl mx-auto space-y-6 relative overflow-hidden">
      
      {/* PLANTILLA OCULTA PARA EL PDF */}
      {jugadorSeleccionado && (
        <div 
          ref={pdfTemplateRef} 
          className="absolute -left-[10000px] top-0 w-[800px] bg-white text-black p-10 font-sans"
        >
          <div className="flex justify-between items-center border-b-4 border-green-700 pb-4 mb-6">
            {user?.logo_url ? (
              <img src={user.logo_url} alt="Logo Academia" className="w-20 h-20 object-contain" />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-xs text-gray-500">Logo</div>
            )}
            <div className="text-right">
              <h1 className="text-3xl font-black text-gray-800 tracking-tight">INFORME TÉCNICO DE CAPACIDADES</h1>
              <h2 className="text-xl text-gray-500 uppercase tracking-widest font-semibold mt-1">
                ACADEMIA DE FÚTBOL {user?.nombre_academia || 'PRO'}
              </h2>
            </div>
          </div>

          <div className="flex gap-6 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100 shadow-sm">
            <img 
              src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150'} 
              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-md" 
              alt="Jugador"
            />
            <div className="flex-1">
              <h2 className="text-3xl font-black uppercase text-gray-900 mb-2">{jugadorSeleccionado.nombre}</h2>
              <p className="text-lg text-gray-700 font-medium mb-1">
                {jugadorSeleccionado.categorias.map(c => c.nombre).join(' - ') || 'Sin Categoría'} | <span className="text-green-700 font-bold">{jugadorSeleccionado.posicion_cancha}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Fecha Emisión: {new Date().toLocaleDateString('es-CL')}
              </p>

              {evaluaciones.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(evaluaciones[0].datos_radar).map(([hab, valor]) => (
                    <div key={hab} className="bg-white px-3 py-1 rounded border border-gray-200 text-sm shadow-sm">
                      <span className="text-gray-500 font-semibold">{hab}</span>: <strong className="text-gray-900">{valor}/100</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-bold bg-gray-800 text-white p-2 px-4 rounded-t-lg uppercase tracking-wide">
              Gráfico de Rendimiento Táctico / Físico
            </h3>
            <div className="border border-gray-200 rounded-b-lg p-4 flex flex-col items-center bg-white">
              {evaluaciones.length > 0 ? (
                <>
                  <div className="flex gap-6 text-sm mb-2">
                    <span className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-full"></div> Actual</span>
                    {evaluaciones.length > 1 && <span className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-400 rounded-full"></div> Anterior</span>}
                  </div>
                  <RadarChart cx={350} cy={180} outerRadius={120} width={700} height={350} data={generarDatosRadar()}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#374151', fontSize: 14, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                    <Radar name="Actual" dataKey="Actual" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} strokeWidth={3} isAnimationActive={false} />
                    {evaluaciones.length > 1 && <Radar name="Anterior" dataKey="Anterior" stroke="#fb923c" fill="#fb923c" fillOpacity={0.2} strokeDasharray="5 5" isAnimationActive={false} />}
                  </RadarChart>
                </>
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-500">Sin evaluaciones para graficar.</div>
              )}
            </div>
          </div>

          {comentariosInforme && (
            <div>
              <h3 className="text-lg font-bold bg-gray-800 text-white p-2 px-4 rounded-t-lg uppercase tracking-wide">
                Observaciones del Cuerpo Técnico
              </h3>
              <div className="border border-gray-200 rounded-b-lg p-6 bg-gray-50">
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-md">{comentariosInforme}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA FRONTAL */}
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏃‍♂️ Gestión de Jugadores</h1>
        {jugadorSeleccionado && (
          <button onClick={() => setJugadorSeleccionado(null)} className="text-sm bg-[#21262d] text-white px-4 py-2 rounded-lg hover:bg-[#30363d] transition-colors">
            ← Volver al Plantel
          </button>
        )}
      </div>

      {!jugadorSeleccionado ? (
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
        <div className="space-y-6">
          <div className="flex justify-end gap-3 mb-2">
            <button onClick={abrirModalEval} className="btn-primary text-sm shadow-[#289E9D]/20 shadow-lg">
              📝 Nueva Evaluación
            </button>
            <button 
              onClick={() => { setComentariosInforme(''); setShowModalInforme(true); }}
              className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-bold text-sm transition-colors shadow-orange-600/20 shadow-lg"
            >
              📄 Generar Informe PDF
            </button>
          </div>

          <div className="space-y-6 bg-[#0d1117] p-4 rounded-xl">
            <div className="card-uniforme p-6 flex flex-col md:flex-row items-center gap-6 relative">
              <img src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150/161b22/8b949e'} className="w-32 h-32 rounded-lg object-cover border-4 border-[#289E9D] shadow-lg z-10" alt=""/>
              <div className="flex-1 text-center md:text-left z-10">
                <h2 className="text-3xl font-bold text-white uppercase">{jugadorSeleccionado.nombre}</h2>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-uniforme p-6 flex flex-col items-center">
                <h3 className="text-xl font-bold mb-4 w-full text-left">📊 Radar de Evolución</h3>
                {evaluaciones.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={generarDatosRadar()}>
                        <PolarGrid stroke="#30363d" />
                        <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#8b949e', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8b949e' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                        <Legend />
                        <Radar name="Evaluación Actual" dataKey="Actual" stroke="#289E9D" fill="#289E9D" fillOpacity={0.5} isAnimationActive={false} />
                        {evaluaciones.length > 1 && <Radar name="Anterior" dataKey="Anterior" stroke="#8b949e" fill="#8b949e" fillOpacity={0.3} isAnimationActive={false} />}
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
        </div>
      )}

      {showModalEval && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" data-html2canvas-ignore>
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
              <label className="block text-sm font-semibold text-gray-400 mb-2">Comentarios internos de evaluación</label>
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

      {showModalInforme && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" data-html2canvas-ignore>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">📄 Generar Informe</h2>
            <p className="text-sm text-gray-400 mb-6">Agrega un comentario final que se imprimirá al final del PDF para el apoderado.</p>
            
            <textarea 
              value={comentariosInforme} onChange={e => setComentariosInforme(e.target.value)}
              placeholder="Ej: Mateo ha mostrado una gran evolución este semestre..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:border-orange-500 outline-none resize-none h-32 mb-6"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModalInforme(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
              <button 
                onClick={handleGenerarPDF} 
                disabled={generandoPDF} 
                className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                {generandoPDF ? '⏳ Procesando PDF...' : '📥 Descargar y Enviar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jugadores;
