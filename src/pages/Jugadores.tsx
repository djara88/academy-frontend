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

interface Insignia {
  id: string;
  nombre: string;
  fecha: string;
}

interface Jugador {
  id: string; nombre: string; posicion_cancha: string;
  tipo_alumno: string; foto_base64: string; fecha_nacimiento: string;
  categorias: Categoria[];
  estado_financiero?: string;
  alerta_medica?: string;
  insignias?: Insignia[]; // Ahora es un historial completo
}

interface Evaluacion {
  id: string; created_at: string; datos_radar: Record<string, number>; comentarios_profesor: string;
}

// 🏆 LISTAS DE INSIGNIAS AGRUPADAS
const INSIGNIAS_DEPORTIVAS = [
  "🌟 Jugador del Partido (MVP)",
  "🥇 Medalla de Oro (Campeón)",
  "🥈 Medalla de Plata",
  "🥉 Medalla de Bronce",
  "🧱 Muro Defensivo",
  "🧤 Guante de Oro (Arquero)",
  "⚽ Goleador de la Fecha"
];

const INSIGNIAS_FORMATIVAS = [
  "🤝 Premio al Compañerismo y Empatía",
  "🏃 Premio a la Perseverancia y Esfuerzo",
  "🧠 Premio a la Resiliencia / Superación",
  "⚖️ Premio al Fair Play (Juego Limpio)",
  "👑 Premio al Liderazgo Positivo",
  "⏱️ Premio a la Puntualidad y Compromiso",
  "💬 Premio a la Buena Actitud y Escucha"
];

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

  const [modoRadar, setModoRadar] = useState<'historial' | 'categoria'>('historial');
  const [promedioCategoria, setPromedioCategoria] = useState<Record<string, number>>({});
  
  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState<string>('');

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

  const cargarEvaluacionesYPromedio = async (jugador: Jugador) => {
    try {
      const resEval = await api.get(`/api/jugadores/${jugador.id}/evaluaciones`);
      setEvaluaciones(resEval.data.data || []);

      if (jugador.categorias.length > 0) {
        const catPrincipalId = jugador.categorias[0].id;
        const resProm = await api.get(`/api/jugadores/categorias/${catPrincipalId}/promedio`);
        setPromedioCategoria(resProm.data.data || {});
      } else {
        setPromedioCategoria({});
      }
    } catch (error) {
      console.error('Error cargando detalles', error);
    }
  };

  useEffect(() => { if (user?.academia_id) cargarDatos(); }, [user]);
  useEffect(() => { if (jugadorSeleccionado) cargarEvaluacionesYPromedio(jugadorSeleccionado); }, [jugadorSeleccionado]);

  // 🏆 LÓGICA DE HISTORIAL DE INSIGNIAS
  const handleAgregarInsignia = async () => {
    if (!jugadorSeleccionado || !insigniaSeleccionada) return;
    
    const nuevaInsignia: Insignia = {
      id: Date.now().toString(),
      nombre: insigniaSeleccionada,
      fecha: new Date().toISOString()
    };
    
    // Normalizamos por si vienen datos viejos (strings) de pruebas anteriores
    const actuales = (jugadorSeleccionado.insignias || []).map(ins => 
      typeof ins === 'string' ? { id: Math.random().toString(), nombre: ins, fecha: new Date().toISOString() } : ins
    );

    const nuevas = [nuevaInsignia, ...actuales];
    
    setJugadorSeleccionado({ ...jugadorSeleccionado, insignias: nuevas });
    setJugadores(jugadores.map(j => j.id === jugadorSeleccionado.id ? { ...j, insignias: nuevas } : j));
    setInsigniaSeleccionada('');
    await api.put(`/api/jugadores/${jugadorSeleccionado.id}/datos-rapidos`, { insignias: nuevas });
  };

  const handleEliminarInsignia = async (idAEliminar: string) => {
    if (!jugadorSeleccionado) return;
    const actuales = (jugadorSeleccionado.insignias || []).map(ins => typeof ins === 'string' ? { id: Math.random().toString(), nombre: ins, fecha: new Date().toISOString() } : ins);
    const nuevas = actuales.filter(i => i.id !== idAEliminar);
    
    setJugadorSeleccionado({ ...jugadorSeleccionado, insignias: nuevas });
    setJugadores(jugadores.map(j => j.id === jugadorSeleccionado.id ? { ...j, insignias: nuevas } : j));
    await api.put(`/api/jugadores/${jugadorSeleccionado.id}/datos-rapidos`, { insignias: nuevas });
  };

  const cambiarEstadoFinanciero = async () => {
    if (!jugadorSeleccionado) return;
    const nuevo = jugadorSeleccionado.estado_financiero === 'Al Día' ? 'Moroso' : 'Al Día';
    setJugadorSeleccionado({ ...jugadorSeleccionado, estado_financiero: nuevo });
    setJugadores(jugadores.map(j => j.id === jugadorSeleccionado.id ? { ...j, estado_financiero: nuevo } : j));
    await api.put(`/api/jugadores/${jugadorSeleccionado.id}/datos-rapidos`, { estado_financiero: nuevo });
  };

  const cambiarAlertaMedica = async () => {
    if (!jugadorSeleccionado) return;
    const actual = jugadorSeleccionado.alerta_medica || '';
    const nueva = window.prompt("Ingrese condición médica (Ej: Asma). Déjelo vacío para indicar que está sano:", actual);
    if (nueva !== null) {
      setJugadorSeleccionado({ ...jugadorSeleccionado, alerta_medica: nueva });
      setJugadores(jugadores.map(j => j.id === jugadorSeleccionado.id ? { ...j, alerta_medica: nueva } : j));
      await api.put(`/api/jugadores/${jugadorSeleccionado.id}/datos-rapidos`, { alerta_medica: nueva });
    }
  };

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
      cargarEvaluacionesYPromedio(jugadorSeleccionado);
    } catch (error) {
      console.error('Error guardando evaluación', error);
    } finally {
      setGuardandoEval(false);
    }
  };

  const handleGenerarPDF = async () => {
    if (!pdfTemplateRef.current || !jugadorSeleccionado) return;
    setGenerandoPDF(true);
    
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      const pdfBase64 = pdf.output('datauristring');

      try {
        await api.post(`/api/jugadores/${jugadorSeleccionado.id}/enviar-informe`, {
          pdf_base64: pdfBase64,
          comentarios: comentariosInforme
        });
        alert('✅ ¡Informe generado y ENVIADO al apoderado con éxito!');
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError);
        alert('⚠️ El PDF se descargó, pero hubo un problema al enviarlo al correo del apoderado.');
      }

      pdf.save(`Informe_Tecnico_${jugadorSeleccionado.nombre.replace(/\s+/g, '_')}.pdf`);
      setShowModalInforme(false);
    } catch (error) {
      console.error('❌ Error al generar el PDF:', error);
      alert('Hubo un error al procesar el informe.');
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
    
    if (modoRadar === 'historial') {
      const evalAnterior = evaluaciones.length > 1 ? evaluaciones[1].datos_radar : {};
      return Object.keys(evalActual).map(hab => ({
        habilidad: hab,
        Actual: evalActual[hab] || 0,
        Comparativa: evalAnterior[hab] || 0,
        fullMark: 100
      }));
    } else {
      return Object.keys(evalActual).map(hab => ({
        habilidad: hab,
        Actual: evalActual[hab] || 0,
        Comparativa: promedioCategoria[hab] || 0,
        fullMark: 100
      }));
    }
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10">Cargando plantel...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative overflow-hidden">
      
      {/* ========================================== */}
      {/* PLANTILLA PDF (PROPORCIÓN A4 Y COMPLETA) */}
      {/* ========================================== */}
      {jugadorSeleccionado && (
        <div 
          ref={pdfTemplateRef} 
          className="absolute -left-[10000px] top-0 w-[800px] min-h-[1130px] bg-white text-black p-12 font-sans flex flex-col"
        >
          {/* ENCABEZADO */}
          <div className="flex justify-between items-center border-b-4 border-green-700 pb-4 mb-6">
            {user?.logo_url ? <img src={user.logo_url} className="w-24 h-24 object-contain" alt="Logo" /> : <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-sm text-gray-500 font-bold">LOGO</div>}
            <div className="text-right">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">INFORME TÉCNICO DE CAPACIDADES</h1>
              <h2 className="text-xl text-gray-600 uppercase tracking-widest font-semibold mt-1">ACADEMIA DE FÚTBOL {user?.nombre_academia || 'PRO'}</h2>
            </div>
          </div>

          {/* DATOS DEL JUGADOR */}
          <div className="flex gap-8 mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm items-center">
            <img src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150'} className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 shadow-sm" alt="Foto" />
            <div className="flex-1">
              <h2 className="text-3xl font-black uppercase text-gray-900 mb-1">{jugadorSeleccionado.nombre}</h2>
              <p className="text-lg text-gray-700 font-medium mb-3">
                {jugadorSeleccionado.categorias.map(c => c.nombre).join(' - ')} | <span className="text-green-700 font-bold">{jugadorSeleccionado.posicion_cancha}</span>
              </p>
              
              <div className="flex gap-6 text-sm text-gray-600 mb-4 border-t border-gray-200 pt-3">
                <p><strong>Edad:</strong> {calcularEdad(jugadorSeleccionado.fecha_nacimiento)} años</p>
                <p><strong>Año Nacimiento:</strong> {obtenerAnio(jugadorSeleccionado.fecha_nacimiento)}</p>
                <p><strong>Fecha Emisión:</strong> {new Date().toLocaleDateString('es-CL')}</p>
              </div>
            </div>
          </div>

          {/* RENDIMIENTO Y MÉTRICAS (MÁS LLENO) */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
              <h3 className="text-sm font-bold bg-gray-800 text-white p-3 uppercase tracking-wider text-center">Rendimiento Táctico / Físico</h3>
              <div className="p-4 flex-1 flex flex-col items-center justify-center">
                {evaluaciones.length > 0 ? (
                  <>
                    <div className="flex gap-4 text-xs mb-4">
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-600 rounded-full"></div> Actual</span>
                      <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-400 rounded-full"></div> {modoRadar === 'historial' ? 'Anterior' : 'Prom. Categoría'}</span>
                    </div>
                    <RadarChart cx={180} cy={140} outerRadius={100} width={360} height={280} data={generarDatosRadar()}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                      <Radar name="Actual" dataKey="Actual" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} strokeWidth={3} isAnimationActive={false} />
                      <Radar name="Comparativa" dataKey="Comparativa" stroke="#fb923c" fill="#fb923c" fillOpacity={0.2} strokeDasharray="5 5" isAnimationActive={false} />
                    </RadarChart>
                  </>
                ) : ( <div className="text-gray-400 text-sm text-center my-auto">Sin métricas registradas.</div> )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {/* Resumen de habilidades */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <h3 className="text-sm font-bold bg-gray-100 text-gray-800 p-3 uppercase tracking-wider border-b border-gray-200">Puntajes Actuales</h3>
                <div className="p-4 grid grid-cols-2 gap-3">
                  {evaluaciones.length > 0 ? Object.entries(evaluaciones[0].datos_radar).map(([hab, valor]) => (
                    <div key={hab} className="flex justify-between border-b border-dashed border-gray-200 pb-1 text-sm">
                      <span className="text-gray-600">{hab}</span>
                      <strong className="text-gray-900">{valor}/100</strong>
                    </div>
                  )) : <p className="text-xs text-gray-400 col-span-2">Sin puntajes.</p>}
                </div>
              </div>

              {/* RECONOCIMIENTOS TIPO LISTA (Como en tu imagen) */}
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm flex-1">
                <h3 className="text-sm font-bold bg-yellow-50 text-yellow-800 p-3 uppercase tracking-wider border-b border-yellow-200">Reconocimientos Históricos</h3>
                <div className="p-4">
                  {(jugadorSeleccionado.insignias && jugadorSeleccionado.insignias.length > 0) ? (
                    <ul className="space-y-2">
                      {jugadorSeleccionado.insignias.slice(0, 6).map(ins => {
                        const insObj = typeof ins === 'string' ? { id: ins, nombre: ins, fecha: new Date().toISOString() } : ins;
                        return (
                          <li key={insObj.id} className="text-sm text-gray-800 flex items-start gap-2 leading-tight border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                            <span className="text-green-600 font-bold">☑</span>
                            <div>
                              <span className="font-semibold">{insObj.nombre}</span><br/>
                              <span className="text-gray-500 text-xs italic">(Obtenida el {new Date(insObj.fecha).toLocaleDateString('es-CL')})</span>
                            </div>
                          </li>
                        );
                      })}
                      {jugadorSeleccionado.insignias.length > 6 && <li className="text-xs text-gray-400 italic mt-2">Y {jugadorSeleccionado.insignias.length - 6} reconocimientos más...</li>}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic text-center mt-4">Aún no registra reconocimientos.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* OBSERVACIONES Y FIRMA */}
          <div className="flex flex-col flex-grow">
            {comentariosInforme && (
              <div className="mb-auto border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <h3 className="text-sm font-bold bg-gray-800 text-white p-3 uppercase tracking-wider">Observaciones del Cuerpo Técnico</h3>
                <div className="p-5 bg-white">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{comentariosInforme}</p>
                </div>
              </div>
            )}
            
            {/* ESPACIO PARA FIRMA */}
            <div className="mt-16 flex justify-center pb-8 pt-8">
              <div className="text-center w-72">
                <div className="border-b border-gray-800 mb-2"></div>
                <p className="font-bold text-gray-900 uppercase">{user?.nombre_completo || 'Director de Academia'}</p>
                <p className="text-sm text-gray-500">Director Deportivo</p>
                <p className="text-xs text-gray-400">{user?.nombre_academia || 'Academia de Fútbol'}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================== */}
      {/* VISTA PRINCIPAL (UI REACT) */}
      {/* ========================================== */}
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold text-[#e6edf3]">🏃‍♂️ Gestión de Jugadores</h1>
        {jugadorSeleccionado && (
          <button onClick={() => setJugadorSeleccionado(null)} className="text-sm bg-[#21262d] text-white px-4 py-2 rounded-lg hover:bg-[#30363d]">
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
                  <button onClick={() => setCategoriaSeleccionada('Todas')} className={`w-full text-left px-3 py-2 rounded-lg ${categoriaSeleccionada === 'Todas' ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}>⚽ Todas las categorías</button>
                </li>
                {categorias.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => setCategoriaSeleccionada(cat.id)} className={`w-full text-left px-3 py-2 rounded-lg ${categoriaSeleccionada === cat.id ? 'bg-[#289E9D] text-white' : 'hover:bg-[#21262d] text-gray-400'}`}>{cat.nombre}</button>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-[#30363d] pt-4">
                <p className="text-xs text-gray-500 mb-2">Crear nueva categoría</p>
                <form onSubmit={handleCrearCategoria} className="flex gap-2">
                  <input type="text" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Ej: Sub-11" className="w-full text-sm py-2 px-3 bg-[#0d1117] border border-[#30363d] rounded text-white" />
                  <button type="submit" className="bg-[#289E9D] text-white px-3 rounded font-bold hover:bg-[#207f7e]">+</button>
                </form>
              </div>

            </div>
          </div>

          <div className="lg:col-span-3 card-uniforme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#1f2937] text-[#8b949e] border-b border-[#30363d] text-sm">
                  <tr>
                    <th className="p-4">Jugador</th>
                    <th className="p-4">Posición</th>
                    <th className="p-4">Edad</th>
                    <th className="p-4 text-center">Estados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]">
                  {jugadoresFiltrados.map(jugador => (
                    <tr key={jugador.id} onClick={() => setJugadorSeleccionado(jugador)} className="hover:bg-[#21262d] cursor-pointer group">
                      <td className="p-4 flex items-center gap-3">
                        <img src={jugador.foto_base64 || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-full object-cover border border-[#30363d] group-hover:border-[#289E9D]" alt="img" />
                        <span className="font-bold text-white">{jugador.nombre}</span>
                      </td>
                      <td className="p-4 text-gray-300">{jugador.posicion_cancha}</td>
                      <td className="p-4 text-gray-300">{calcularEdad(jugador.fecha_nacimiento)} años</td>
                      <td className="p-4 flex gap-2 justify-center items-center h-full mt-2">
                        <div title={jugador.estado_financiero} className={`w-3 h-3 rounded-full ${jugador.estado_financiero === 'Al Día' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div title={jugador.alerta_medica ? `Alerta Médica: ${jugador.alerta_medica}` : 'Salud OK'} className={`w-3 h-3 rounded-full ${jugador.alerta_medica ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end gap-3 mb-2">
            <button onClick={abrirModalEval} className="btn-primary text-sm shadow-[#289E9D]/20 shadow-lg">📝 Nueva Evaluación</button>
            <button onClick={() => { setComentariosInforme(''); setShowModalInforme(true); }} className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-bold text-sm shadow-lg">📄 Generar Informe PDF</button>
          </div>

          <div className="space-y-6 bg-[#0d1117] p-4 rounded-xl">
            <div className="card-uniforme p-6 flex flex-col md:flex-row items-center gap-6 relative">
              <img src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150'} className="w-32 h-32 rounded-lg object-cover border-4 border-[#289E9D] shadow-lg" alt="img" />
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 mb-2">
                  <h2 className="text-3xl font-bold text-white uppercase">{jugadorSeleccionado.nombre}</h2>
                  <div className="flex gap-2">
                    <button onClick={cambiarEstadoFinanciero} title="Clic para cambiar Pago" className={`text-xs px-2 py-1 rounded-full font-bold border ${jugadorSeleccionado.estado_financiero === 'Al Día' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>💰 {jugadorSeleccionado.estado_financiero}</button>
                    <button onClick={cambiarAlertaMedica} title="Clic para cambiar Alerta" className={`text-xs px-2 py-1 rounded-full font-bold border ${jugadorSeleccionado.alerta_medica ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'}`}>🏥 {jugadorSeleccionado.alerta_medica || 'Sano'}</button>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-1">
                  <p className="text-lg text-[#289E9D] font-semibold">{jugadorSeleccionado.posicion_cancha}</p>
                  <span className="text-gray-400">|</span>
                  <p className="text-sm text-gray-300">Edad: <strong className="text-white">{calcularEdad(jugadorSeleccionado.fecha_nacimiento)} años</strong></p>
                  <span className="text-gray-400">|</span>
                  <p className="text-sm text-gray-300">Año: <strong className="text-white">{obtenerAnio(jugadorSeleccionado.fecha_nacimiento)}</strong></p>
                </div>
                
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap items-center justify-center md:justify-start">
                    {jugadorSeleccionado.categorias.map(c => <span key={c.id} className="text-xs bg-[#21262d] text-gray-300 border border-[#30363d] px-3 py-1 rounded-full">{c.nombre}</span>)}
                    <button onClick={() => setShowAsignarCat(!showAsignarCat)} className="text-xs bg-[#1f2937] text-white border border-[#30363d] px-3 py-1 rounded-full hover:bg-[#30363d]">+ Asignar</button>
                  </div>
                  {showAsignarCat && (
                    <div className="mt-2 flex gap-2 justify-center md:justify-start">
                      <select value={catAAsignar} onChange={e => setCatAAsignar(e.target.value)} className="text-sm py-1 px-2 rounded bg-[#0d1117] border border-[#30363d] text-white outline-none">
                        <option value="">Seleccionar...</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                      <button onClick={handleAsignarCategoria} className="bg-[#289E9D] text-white py-1 px-3 rounded text-sm font-bold">Guardar</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN INSIGNIAS (AHORA ES UN HISTORIAL CON FECHAS) */}
            <div className="card-uniforme p-4 border-l-4 border-yellow-500 bg-[#161b22]">
              <h3 className="text-sm font-bold text-yellow-500 mb-3 flex items-center gap-2">
                🏅 Asignar Nuevo Reconocimiento
              </h3>
              
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <select 
                  value={insigniaSeleccionada} 
                  onChange={e => setInsigniaSeleccionada(e.target.value)}
                  className="bg-[#0d1117] text-sm text-gray-300 border border-[#30363d] rounded p-2 flex-1 focus:border-yellow-500 outline-none"
                >
                  <option value="">Seleccionar reconocimiento...</option>
                  <optgroup label="--- ⚽ ÁMBITO DEPORTIVO ---" className="font-bold text-[#289E9D]">
                    {INSIGNIAS_DEPORTIVAS.map(ins => <option key={ins} value={ins} className="text-gray-300 font-normal">{ins}</option>)}
                  </optgroup>
                  <optgroup label="--- 🤝 ÁMBITO FORMATIVO Y VALORES ---" className="font-bold text-green-500 mt-2">
                    {INSIGNIAS_FORMATIVAS.map(ins => <option key={ins} value={ins} className="text-gray-300 font-normal">{ins}</option>)}
                  </optgroup>
                </select>
                <button 
                  onClick={handleAgregarInsignia}
                  disabled={!insigniaSeleccionada}
                  className="bg-yellow-600 text-white font-bold px-4 py-2 rounded text-sm disabled:opacity-50 hover:bg-yellow-700 transition-colors"
                >
                  Otorgar Reconocimiento
                </button>
              </div>

              {/* Lista del historial de insignias asignadas */}
              {jugadorSeleccionado.insignias && jugadorSeleccionado.insignias.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-[#30363d]">
                  <h4 className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2">Historial del Jugador:</h4>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {jugadorSeleccionado.insignias.map((ins, index) => {
                      // Adaptación por si hay datos guardados como string de la versión anterior
                      const insObj = typeof ins === 'string' ? { id: index.toString(), nombre: ins, fecha: new Date().toISOString() } : ins;
                      return (
                        <li key={insObj.id} className="text-sm flex justify-between items-center bg-[#0d1117] border border-[#30363d] p-2 rounded">
                          <div>
                            <span className="text-white font-semibold mr-2">{insObj.nombre}</span>
                            <span className="text-xs text-gray-500 italic">({new Date(insObj.fecha).toLocaleDateString('es-CL')})</span>
                          </div>
                          <button onClick={() => handleEliminarInsignia(insObj.id)} className="text-red-500 hover:text-red-400 p-1 bg-red-500/10 rounded" title="Eliminar reconocimiento">
                            ✖
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-2 italic">Aún no se han otorgado reconocimientos a este jugador.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card-uniforme p-6 flex flex-col items-center relative">
                <div className="flex justify-between w-full items-center mb-6">
                  <h3 className="text-xl font-bold">📊 Radar de Evolución</h3>
                  <div className="bg-[#161b22] rounded-lg p-1 border border-[#30363d] flex text-xs">
                    <button onClick={() => setModoRadar('historial')} className={`px-3 py-1 rounded ${modoRadar === 'historial' ? 'bg-[#289E9D] text-white' : 'text-gray-400'}`}>Historial</button>
                    <button onClick={() => setModoRadar('categoria')} className={`px-3 py-1 rounded ${modoRadar === 'categoria' ? 'bg-[#289E9D] text-white' : 'text-gray-400'}`}>Vs Categoría</button>
                  </div>
                </div>

                {evaluaciones.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={generarDatosRadar()}>
                        <PolarGrid stroke="#30363d" />
                        <PolarAngleAxis dataKey="habilidad" tick={{ fill: '#8b949e', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8b949e' }} />
                        <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#fff' }} />
                        <Legend />
                        <Radar name="Actual" dataKey="Actual" stroke="#289E9D" fill="#289E9D" fillOpacity={0.5} />
                        {(evaluaciones.length > 1 || modoRadar === 'categoria') && <Radar name={modoRadar === 'historial' ? 'Anterior' : 'Promedio Cat.'} dataKey="Comparativa" stroke="#8b949e" fill="#8b949e" fillOpacity={0.3} strokeDasharray="3 3"/>}
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : ( <div className="h-80 flex items-center justify-center text-gray-500 w-full text-center">Aún no hay evaluaciones.</div> )}
              </div>

              <div className="card-uniforme p-6">
                <h3 className="text-xl font-bold mb-4">🏆 Estadísticas y Partidos</h3>
                <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] h-80 overflow-y-auto">
                  <p className="text-center text-gray-500 mt-10">Próximamente conexión con Torneos.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALES */}
      {showModalEval && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">📝 Evaluar a {jugadorSeleccionado?.nombre}</h2>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {Object.keys(nuevaEvalDatos).map(skill => (
                <div key={skill} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-gray-300">{skill}</span>
                  <input type="range" min="0" max="100" value={nuevaEvalDatos[skill]} onChange={e => setNuevaEvalDatos({...nuevaEvalDatos, [skill]: Number(e.target.value)})} className="flex-1 accent-[#289E9D]" />
                  <span className="w-10 text-right font-bold text-[#289E9D]">{nuevaEvalDatos[skill]}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModalEval(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleGuardarEvaluacion} disabled={guardandoEval} className="bg-[#289E9D] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#207f7e]">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showModalInforme && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">📄 Generar Informe</h2>
            <textarea value={comentariosInforme} onChange={e => setComentariosInforme(e.target.value)} placeholder="Comentario final..." className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-white focus:border-orange-500 outline-none h-32 mb-6" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowModalInforme(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
              <button onClick={handleGenerarPDF} disabled={generandoPDF} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700">{generandoPDF ? 'Procesando...' : 'Descargar y Enviar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jugadores;
