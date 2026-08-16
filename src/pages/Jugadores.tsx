// src/pages/Jugadores.tsx
import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import CompetitiveStatsCard from '../components/CompetitiveStatsCard';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

interface Categoria { id: string; nombre: string; }
interface Insignia { id: string; nombre: string; fecha: string; }
interface EstadisticasAcumuladas {
  partidos_jugados: number;
  goles: number;
  asistencias: number;
  mvp: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  clases_ausente: number;
  clases_presente: number;
  clases_justificadas: number;
}
interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  tipo_alumno: string;
  foto_base64: string;
  fecha_nacimiento: string;
  sede_id?: string | null;
  rama_id?: string | null;
  categorias: Categoria[];
  estado_financiero?: string;
  alerta_medica?: string;
  telefono_emergencia?: string;
  insignias?: Insignia[];
  estadisticas_acumuladas?: EstadisticasAcumuladas;
}
interface Evaluacion {
  id: string;
  created_at: string;
  datos_radar: Record<string, number>;
  comentarios_profesor: string;
  disciplina_codigo?: string | null;
  perfil_evaluacion?: string | null;
  metricas_version?: number;
}
interface SportProfile {
  code: string;
  label: string;
  roleLabel: string;
  roles: string[];
  metrics: string[];
  profileCode: string;
  metricVersion: number;
  supportsFootballStats: boolean;
  branch?: { id: string; nombre: string; disciplina: string };
}

const INSIGNIAS_DEPORTIVAS = [
  '🌟 Deportista del Evento / MVP',
  '🥇 Medalla de Oro (Campeón)',
  '🥈 Medalla de Plata',
  '🥉 Medalla de Bronce',
  '🎯 Excelencia Técnica',
  '📈 Progreso Destacado',
  '🛡️ Rendimiento Defensivo',
  '🔥 Espíritu Competitivo',
];
const INSIGNIAS_FORMATIVAS = [
  '🤝 Premio al Compañerismo y Empatía',
  '🏃 Premio a la Perseverancia y Esfuerzo',
  '🧠 Premio a la Resiliencia / Superación',
  '⚖️ Premio al Fair Play (Juego Limpio)',
  '👑 Premio al Liderazgo Positivo',
  '⏱️ Premio a la Puntualidad y Compromiso',
  '💬 Premio a la Buena Actitud y Escucha',
];

const Jugadores: React.FC = () => {
  const { notify } = useAcademyMessages();
  const { user } = useAuth();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluationsEnabled, setEvaluationsEnabled] = useState(false);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [sportProfile, setSportProfile] = useState<SportProfile | null>(null);
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
  const [guardandoEmergencia, setGuardandoEmergencia] = useState(false);
  const [modoRadar, setModoRadar] = useState<'historial' | 'categoria'>('historial');
  const [promedioCategoria, setPromedioCategoria] = useState<Record<string, number>>({});
  const [insigniaSeleccionada, setInsigniaSeleccionada] = useState<string>('');

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resJugadores, resCategorias, resPlan] = await Promise.all([
        api.get('/api/jugadores'),
        api.get('/api/jugadores/categorias'),
        api.get('/api/academias/mi-plan'),
      ]);
      setJugadores(resJugadores.data.data || []);
      setCategorias(resCategorias.data.data || []);
      setEvaluationsEnabled((resPlan.data?.data?.features || []).includes('evaluaciones'));
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarPerfil = async (jugador: Jugador) => {
    if (!jugador.rama_id) { setSportProfile(null); return; }
    try {
      const response = await api.get('/api/sport-profiles', { params: { rama_id: jugador.rama_id, role: jugador.posicion_cancha || undefined } });
      setSportProfile(response.data?.data || null);
    } catch (_error) {
      setSportProfile(null);
    }
  };

  const cargarEvaluacionesYPromedio = async (jugador: Jugador) => {
    await cargarPerfil(jugador);
    if (!evaluationsEnabled) { setEvaluaciones([]); setPromedioCategoria({}); return; }
    try {
      const resEval = await api.get(`/api/evaluaciones/jugador/${jugador.id}`);
      setEvaluaciones(resEval.data.data || []);
      if (jugador.categorias.length > 0) {
        const resProm = await api.get(`/api/jugadores/categorias/${jugador.categorias[0].id}/promedio`);
        setPromedioCategoria(resProm.data.data || {});
      } else {
        setPromedioCategoria({});
      }
    } catch (error) {
      console.error('Error cargando evaluaciones', error);
      setEvaluaciones([]);
      setPromedioCategoria({});
    }
  };

  useEffect(() => { if (user?.academia_id) void cargarDatos(); }, [user?.academia_id]);
  useEffect(() => { if (jugadorSeleccionado) void cargarEvaluacionesYPromedio(jugadorSeleccionado); }, [jugadorSeleccionado?.id, evaluationsEnabled]);

  const handleAgregarInsignia = async () => {
    if (!jugadorSeleccionado || !insigniaSeleccionada) return;
    const nuevaInsignia: Insignia = { id: Date.now().toString(), nombre: insigniaSeleccionada, fecha: new Date().toISOString() };
    const actuales = (jugadorSeleccionado.insignias || []).map(ins => typeof ins === 'string' ? { id: Math.random().toString(), nombre: ins, fecha: new Date().toISOString() } : ins);
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

  const guardarDatosEmergencia = async () => {
    if (!jugadorSeleccionado) return;
    const alertaMedica = (jugadorSeleccionado.alerta_medica || '').trim();
    const telefonoEmergencia = (jugadorSeleccionado.telefono_emergencia || '').trim();
    setGuardandoEmergencia(true);
    try {
      await api.put(`/api/jugadores/${jugadorSeleccionado.id}/datos-rapidos`, { alerta_medica: alertaMedica, telefono_emergencia: telefonoEmergencia });
      const actualizado = { ...jugadorSeleccionado, alerta_medica: alertaMedica, telefono_emergencia: telefonoEmergencia };
      setJugadorSeleccionado(actualizado);
      setJugadores(jugadores.map(j => j.id === actualizado.id ? actualizado : j));
      await notify('Datos de emergencia actualizados. El profesor asignado podrá ver únicamente esta información.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar los datos de emergencia.');
    } finally { setGuardandoEmergencia(false); }
  };

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date(); const nace = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nace.getFullYear(); const m = hoy.getMonth() - nace.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nace.getDate())) edad--;
    return edad;
  };
  const obtenerAnio = (fechaNacimiento: string) => fechaNacimiento ? new Date(fechaNacimiento).getFullYear().toString() : 'N/A';

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault(); if (!nuevaCategoria.trim()) return;
    await api.post('/api/jugadores/categorias', { nombre: nuevaCategoria }); setNuevaCategoria(''); void cargarDatos();
  };
  const handleAsignarCategoria = async () => {
    if (!jugadorSeleccionado || !catAAsignar) return;
    await api.post(`/api/jugadores/${jugadorSeleccionado.id}/categorias`, { categoria_id: catAAsignar });
    setShowAsignarCat(false); void cargarDatos();
    const catObj = categorias.find(c => c.id === catAAsignar);
    if (catObj) setJugadorSeleccionado({ ...jugadorSeleccionado, categorias: [...jugadorSeleccionado.categorias, catObj] });
  };

  const abrirModalEval = () => {
    if (!jugadorSeleccionado || !evaluationsEnabled || !sportProfile?.metrics?.length) return;
    const ultimaEval = evaluaciones[0]?.datos_radar || {};
    const evalInicial = Object.fromEntries(sportProfile.metrics.map((metric) => [metric, ultimaEval[metric] ?? 50]));
    setNuevaEvalDatos(evalInicial);
    setComentariosEval('');
    setShowModalEval(true);
  };

  const handleGuardarEvaluacion = async () => {
    if (!jugadorSeleccionado) return;
    setGuardandoEval(true);
    try {
      await api.post('/api/evaluaciones', { jugador_id: jugadorSeleccionado.id, datos_radar: nuevaEvalDatos, comentarios_profesor: comentariosEval });
      setShowModalEval(false);
      await cargarEvaluacionesYPromedio(jugadorSeleccionado);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la evaluación.');
    } finally { setGuardandoEval(false); }
  };

  const handleGenerarPDF = async () => {
    if (!jugadorSeleccionado) return;
    setGenerandoPDF(true);
    try {
      const response = await api.post(`/api/jugadores/${jugadorSeleccionado.id}/enviar-informe`, { comentarios: comentariosInforme });
      const signedUrl = response.data?.url;
      if (!signedUrl) throw new Error('El servidor no devolvió el informe generado.');
      const pdfResponse = await fetch(signedUrl);
      if (!pdfResponse.ok) throw new Error('No fue posible descargar el informe generado.');
      const blob = await pdfResponse.blob(); const objectUrl = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = objectUrl; link.download = `Informe_Evolucion_${jugadorSeleccionado.nombre.replace(/\s+/g, '_')}.pdf`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(objectUrl);
      await notify(response.data?.email_sent ? '✅ Informe premium generado, descargado y enviado al apoderado.' : '✅ Informe premium generado y descargado. No fue posible confirmar el envío por correo.');
      setShowModalInforme(false);
    } catch (error) {
      console.error('Error al generar informe:', error); await notify('Hubo un error al procesar el informe.');
    } finally { setGenerandoPDF(false); }
  };

  const jugadoresFiltrados = categoriaSeleccionada === 'Todas' ? jugadores : jugadores.filter(j => j.categorias.some(c => c.id === categoriaSeleccionada));
  const generarDatosRadar = () => {
    if (evaluaciones.length === 0) return [];
    const evalActual = evaluaciones[0].datos_radar;
    const comparativa = modoRadar === 'historial' ? (evaluaciones[1]?.datos_radar || {}) : promedioCategoria;
    return Object.keys(evalActual).map(habilidad => ({ habilidad, Actual: evalActual[habilidad] || 0, Comparativa: comparativa[habilidad] || 0, fullMark: 100 }));
  };

  if (loading) return <div className="mt-10 text-center text-[#289E9D]">Cargando plantel...</div>;

  return <div className="relative mx-auto max-w-7xl space-y-6 overflow-hidden">
    <div className="flex items-end justify-between"><h1 className="text-3xl font-bold text-[#e6edf3]">🏃 Gestión de Deportistas</h1>{jugadorSeleccionado && <button onClick={() => setJugadorSeleccionado(null)} className="rounded-lg bg-[#21262d] px-4 py-2 text-sm text-white hover:bg-[#30363d]">← Volver al plantel</button>}</div>

    {!jugadorSeleccionado ? <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      <div className="space-y-4 lg:col-span-1"><div className="card-uniforme p-4"><h3 className="mb-3 font-bold text-[#289E9D]">Categorías</h3><ul className="space-y-2"><li><button onClick={() => setCategoriaSeleccionada('Todas')} className={`w-full rounded-lg px-3 py-2 text-left ${categoriaSeleccionada === 'Todas' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#21262d]'}`}>🏅 Todas las categorías</button></li>{categorias.map(cat => <li key={cat.id}><button onClick={() => setCategoriaSeleccionada(cat.id)} className={`w-full rounded-lg px-3 py-2 text-left ${categoriaSeleccionada === cat.id ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#21262d]'}`}>{cat.nombre}</button></li>)}</ul><div className="mt-6 border-t border-[#30363d] pt-4"><p className="mb-2 text-xs text-gray-500">Crear nueva categoría</p><form onSubmit={handleCrearCategoria} className="flex gap-2"><input value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} placeholder="Ej: Sub-11 / Juvenil" className="w-full rounded border border-[#30363d] bg-[#0d1117] px-3 py-2 text-sm text-white"/><button type="submit" className="rounded bg-[#289E9D] px-3 font-bold text-white">+</button></form></div></div></div>
      <div className="card-uniforme overflow-hidden lg:col-span-3"><div className="overflow-x-auto"><table className="w-full border-collapse text-left"><thead className="border-b border-[#30363d] bg-[#1f2937] text-sm text-[#8b949e]"><tr><th className="p-4">Deportista</th><th className="p-4">Rol / especialidad</th><th className="p-4">Edad</th><th className="p-4 text-center">Estados</th></tr></thead><tbody className="divide-y divide-[#30363d]">{jugadoresFiltrados.map(jugador => <tr key={jugador.id} onClick={() => setJugadorSeleccionado(jugador)} className="group cursor-pointer hover:bg-[#21262d]"><td className="flex items-center gap-3 p-4"><img src={jugador.foto_base64 || 'https://via.placeholder.com/150'} className="h-10 w-10 rounded-full border border-[#30363d] object-cover group-hover:border-[#289E9D]" alt=""/><span className="font-bold text-white">{jugador.nombre}</span></td><td className="p-4 text-gray-300">{jugador.posicion_cancha || 'Sin definir'}</td><td className="p-4 text-gray-300">{calcularEdad(jugador.fecha_nacimiento)} años</td><td className="mt-2 flex h-full items-center justify-center gap-2 p-4"><div title={jugador.estado_financiero} className={`h-3 w-3 rounded-full ${jugador.estado_financiero === 'Al Día' ? 'bg-green-500' : 'bg-red-500'}`}/><div title={jugador.alerta_medica ? `Alerta médica: ${jugador.alerta_medica}` : 'Salud OK'} className={`h-3 w-3 rounded-full ${jugador.alerta_medica ? 'bg-red-500' : 'bg-green-500'}`}/></td></tr>)}</tbody></table></div></div>
    </div> : <div className="space-y-6">
      <div className="mb-2 flex justify-end gap-3">{evaluationsEnabled && <button onClick={abrirModalEval} disabled={!sportProfile} className="btn-primary text-sm shadow-lg shadow-[#289E9D]/20 disabled:opacity-50">📝 Nueva Evaluación</button>}{evaluationsEnabled && <button onClick={() => { setComentariosInforme(''); setShowModalInforme(true); }} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-orange-700">📄 Generar Informe PDF</button>}</div>
      <div className="space-y-6 rounded-xl bg-[#0d1117] p-4">
        <div className="card-uniforme relative flex flex-col items-center gap-6 p-6 md:flex-row"><img src={jugadorSeleccionado.foto_base64 || 'https://via.placeholder.com/150'} className="h-32 w-32 rounded-lg border-4 border-[#289E9D] object-cover shadow-lg" alt=""/><div className="flex-1 text-center md:text-left"><div className="mb-2 flex flex-col items-center justify-center gap-4 md:flex-row md:justify-start"><h2 className="text-3xl font-bold uppercase text-white">{jugadorSeleccionado.nombre}</h2><div className="flex gap-2"><button onClick={cambiarEstadoFinanciero} className={`rounded-full border px-2 py-1 text-xs font-bold ${jugadorSeleccionado.estado_financiero === 'Al Día' ? 'border-green-500/50 bg-green-500/20 text-green-400' : 'border-red-500/50 bg-red-500/20 text-red-400'}`}>💰 {jugadorSeleccionado.estado_financiero}</button><span className={`rounded-full border px-2 py-1 text-xs font-bold ${jugadorSeleccionado.alerta_medica ? 'border-red-500/50 bg-red-500/20 text-red-400' : 'border-green-500/50 bg-green-500/20 text-green-400'}`}>🏥 {jugadorSeleccionado.alerta_medica || 'Sin alerta'}</span></div></div><div className="mt-1 flex flex-wrap items-center justify-center gap-4 md:justify-start"><p className="text-lg font-semibold text-[#289E9D]">{sportProfile?.label || 'Deporte'}{jugadorSeleccionado.posicion_cancha ? ` · ${jugadorSeleccionado.posicion_cancha}` : ''}</p><span className="text-gray-400">|</span><p className="text-sm text-gray-300">Edad: <strong className="text-white">{calcularEdad(jugadorSeleccionado.fecha_nacimiento)} años</strong></p><span className="text-gray-400">|</span><p className="text-sm text-gray-300">Año: <strong className="text-white">{obtenerAnio(jugadorSeleccionado.fecha_nacimiento)}</strong></p></div>
          <div className="mt-4 rounded-xl border border-[#30363d] bg-[#10151d] p-4 text-left"><p className="text-xs font-black uppercase tracking-[0.15em] text-[#48d8d0]">Información mínima de emergencia</p><p className="mt-1 text-xs text-[#8b949e]">Solo esta alerta y teléfono serán visibles para el profesor correspondiente.</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#b1bac4]">Alerta médica</span><input maxLength={300} value={jugadorSeleccionado.alerta_medica || ''} onChange={event => setJugadorSeleccionado({ ...jugadorSeleccionado, alerta_medica: event.target.value })} placeholder="Ej.: Asma, alergia severa" className="w-full"/></label><label><span className="mb-1 block text-xs font-bold text-[#b1bac4]">Teléfono de emergencia</span><input type="tel" maxLength={40} value={jugadorSeleccionado.telefono_emergencia || ''} onChange={event => setJugadorSeleccionado({ ...jugadorSeleccionado, telefono_emergencia: event.target.value })} placeholder="Ej.: +56 9 1234 5678" className="w-full"/></label></div><button onClick={() => void guardarDatosEmergencia()} disabled={guardandoEmergencia} className="btn-primary mt-3 min-h-11 w-full px-4 py-2 text-sm disabled:opacity-50 md:w-auto">{guardandoEmergencia ? 'Guardando...' : 'Guardar datos de emergencia'}</button></div>
          <div className="mt-4 flex flex-col gap-2"><div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">{jugadorSeleccionado.categorias.map(c => <span key={c.id} className="rounded-full border border-[#30363d] bg-[#21262d] px-3 py-1 text-xs text-gray-300">{c.nombre}</span>)}<button onClick={() => setShowAsignarCat(!showAsignarCat)} className="rounded-full border border-[#30363d] bg-[#1f2937] px-3 py-1 text-xs text-white hover:bg-[#30363d]">+ Asignar</button></div>{showAsignarCat && <div className="mt-2 flex justify-center gap-2 md:justify-start"><select value={catAAsignar} onChange={e => setCatAAsignar(e.target.value)} className="rounded border border-[#30363d] bg-[#0d1117] px-2 py-1 text-sm text-white"><option value="">Seleccionar...</option>{categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select><button onClick={handleAsignarCategoria} className="rounded bg-[#289E9D] px-3 py-1 text-sm font-bold text-white">Guardar</button></div>}</div>
        </div></div>

        <div className="card-uniforme border-l-4 border-yellow-500 bg-[#161b22] p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-yellow-500">🏅 Asignar Nuevo Reconocimiento</h3><div className="mb-4 flex flex-col gap-3 md:flex-row"><select value={insigniaSeleccionada} onChange={e => setInsigniaSeleccionada(e.target.value)} className="flex-1 rounded border border-[#30363d] bg-[#0d1117] p-2 text-sm text-gray-300"><option value="">Seleccionar reconocimiento...</option><optgroup label="--- 🏅 ÁMBITO DEPORTIVO ---">{INSIGNIAS_DEPORTIVAS.map(ins => <option key={ins}>{ins}</option>)}</optgroup><optgroup label="--- 🤝 ÁMBITO FORMATIVO Y VALORES ---">{INSIGNIAS_FORMATIVAS.map(ins => <option key={ins}>{ins}</option>)}</optgroup></select><button onClick={handleAgregarInsignia} disabled={!insigniaSeleccionada} className="rounded bg-yellow-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Otorgar Reconocimiento</button></div>{jugadorSeleccionado.insignias?.length ? <div className="mt-4 border-t border-[#30363d] pt-4"><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Historial:</h4><ul className="max-h-40 space-y-2 overflow-y-auto pr-2">{jugadorSeleccionado.insignias.map((ins,index)=>{const item=typeof ins==='string'?{id:index.toString(),nombre:ins,fecha:new Date().toISOString()}:ins;return <li key={item.id} className="flex items-center justify-between rounded border border-[#30363d] bg-[#0d1117] p-2 text-sm"><div><span className="mr-2 font-semibold text-white">{item.nombre}</span><span className="text-xs italic text-gray-500">({new Date(item.fecha).toLocaleDateString('es-CL')})</span></div><button onClick={()=>handleEliminarInsignia(item.id)} className="rounded bg-red-500/10 p-1 text-red-500">✖</button></li>})}</ul></div>:<p className="mt-2 text-xs italic text-gray-500">Aún no se han otorgado reconocimientos.</p>}</div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card-uniforme relative flex flex-col items-center p-6"><div className="mb-6 flex w-full items-center justify-between"><div><h3 className="text-xl font-bold">📊 Radar de Evolución</h3><p className="mt-1 text-xs font-bold text-[#70e4df]">{sportProfile?.label || 'Perfil deportivo'} · métricas propias de la rama</p></div>{evaluationsEnabled && <div className="flex rounded-lg border border-[#30363d] bg-[#161b22] p-1 text-xs"><button onClick={()=>setModoRadar('historial')} className={`rounded px-3 py-1 ${modoRadar==='historial'?'bg-[#289E9D] text-white':'text-gray-400'}`}>Historial</button><button onClick={()=>setModoRadar('categoria')} className={`rounded px-3 py-1 ${modoRadar==='categoria'?'bg-[#289E9D] text-white':'text-gray-400'}`}>Vs Categoría</button></div>}</div>{!evaluationsEnabled ? <div className="flex h-80 w-full items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/5 p-8 text-center text-sm leading-6 text-violet-100">Las evaluaciones deportivas completas y el radar están disponibles desde <b className="ml-1">Competencia</b>.</div> : evaluaciones.length > 0 ? <div className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="70%" data={generarDatosRadar()}><PolarGrid stroke="#30363d"/><PolarAngleAxis dataKey="habilidad" tick={{fill:'#8b949e',fontSize:12}}/><PolarRadiusAxis angle={30} domain={[0,100]} tick={{fill:'#8b949e'}}/><Tooltip contentStyle={{backgroundColor:'#161b22',borderColor:'#30363d',color:'#fff'}}/><Legend/><Radar name="Actual" dataKey="Actual" stroke="#289E9D" fill="#289E9D" fillOpacity={0.5}/>{(evaluaciones.length>1||modoRadar==='categoria')&&<Radar name={modoRadar==='historial'?'Anterior':'Promedio Cat.'} dataKey="Comparativa" stroke="#8b949e" fill="#8b949e" fillOpacity={0.3} strokeDasharray="3 3"/>}</RadarChart></ResponsiveContainer></div>:<div className="flex h-80 w-full items-center justify-center text-center text-gray-500">Aún no hay evaluaciones para este perfil.</div>}</div>

          <div className="card-uniforme space-y-4 p-6"><h3 className="flex items-center gap-2 text-xl font-bold text-white"><span>🏆</span> Actividad Acumulada</h3><CompetitiveStatsCard jugadorId={jugadorSeleccionado.id} fallbackLabel={sportProfile?.label || 'Deporte'} />
            <div className="space-y-2 rounded-lg border border-[#30363d] bg-[#0d1117] p-4"><h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Asistencia a Entrenamientos</h4><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded border border-green-500/30 bg-green-950/20 p-2"><span className="block text-[10px] font-bold uppercase text-green-400">✔️ Presente</span><span className="text-lg font-black text-green-400">{jugadorSeleccionado.estadisticas_acumuladas?.clases_presente || 0}</span></div><div className="rounded border border-red-500/30 bg-red-950/20 p-2"><span className="block text-[10px] font-bold uppercase text-red-400">❌ Ausente</span><span className="text-lg font-black text-red-400">{jugadorSeleccionado.estadisticas_acumuladas?.clases_ausente || 0}</span></div><div className="rounded border border-blue-500/30 bg-blue-950/20 p-2"><span className="block text-[10px] font-bold uppercase text-blue-400">📝 Justificado</span><span className="text-lg font-black text-blue-400">{jugadorSeleccionado.estadisticas_acumuladas?.clases_justificadas || 0}</span></div></div></div>
          </div>
        </div>
      </div>
    </div>}

    {showModalEval && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-lg rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">{sportProfile?.label || 'Evaluación deportiva'}</p><h2 className="mb-4 mt-1 text-2xl font-bold text-white">📝 Evaluar a {jugadorSeleccionado?.nombre}</h2><div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">{Object.keys(nuevaEvalDatos).map(skill => <div key={skill} className="flex items-center gap-4"><span className="w-36 text-sm font-medium text-gray-300">{skill}</span><input type="range" min="0" max="100" value={nuevaEvalDatos[skill]} onChange={e => setNuevaEvalDatos({...nuevaEvalDatos,[skill]:Number(e.target.value)})} className="flex-1 accent-[#289E9D]"/><span className="w-10 text-right font-bold text-[#289E9D]">{nuevaEvalDatos[skill]}</span></div>)}</div><textarea value={comentariosEval} onChange={e=>setComentariosEval(e.target.value)} maxLength={3000} placeholder="Comentarios del profesor (opcional)" className="mt-5 h-24 w-full rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-white outline-none focus:border-[#289E9D]"/><div className="mt-6 flex justify-end gap-3"><button onClick={()=>setShowModalEval(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button><button onClick={handleGuardarEvaluacion} disabled={guardandoEval} className="rounded-lg bg-[#289E9D] px-6 py-2 font-bold text-white disabled:opacity-50">{guardandoEval?'Guardando...':'Guardar'}</button></div></div></div>}

    {showModalInforme && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-lg rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl"><h2 className="mb-2 text-2xl font-bold text-white">📄 Generar Informe · {sportProfile?.label || 'Deporte'}</h2><textarea value={comentariosInforme} onChange={e=>setComentariosInforme(e.target.value)} placeholder="Comentario final..." className="mb-6 h-32 w-full rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-white outline-none focus:border-orange-500"/><div className="flex justify-end gap-3"><button onClick={()=>setShowModalInforme(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button><button onClick={handleGenerarPDF} disabled={generandoPDF} className="rounded-lg bg-orange-600 px-6 py-2 font-bold text-white disabled:opacity-50">{generandoPDF?'Procesando...':'Descargar y Enviar'}</button></div></div></div>}
  </div>;
};

export default Jugadores;
