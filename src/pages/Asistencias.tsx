// src/pages/Asistencias.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const Asistencias: React.FC = () => {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [fechaSel, setFechaSel] = useState(new Date().toISOString().split('T')[0]);
  
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any>({});
  
  const [esRecuperativa, setEsRecuperativa] = useState(false);
  const [estadoClase, setEstadoClase] = useState('Realizado');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [metricas, setMetricas] = useState<any>(null);
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  useEffect(() => {
    cargarCategoriasYMetricas();
  }, []);

  useEffect(() => {
    if (categoriaSel && estadoClase === 'Realizado') {
      cargarAlumnos();
    }
  }, [categoriaSel, estadoClase]);

  const cargarCategoriasYMetricas = async () => {
    try {
      const resC = await api.get('/api/jugadores/categorias');
      setCategorias(resC.data.data || []);
      
      const mes = new Date().toISOString().split('-')[1];
      const anio = new Date().getFullYear();
      const resM = await api.get(`/api/entrenamientos/metricas?mes=${mes}&anio=${anio}`);
      setMetricas(resM.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarAlumnos = async () => {
    try {
      const res = await api.get('/api/jugadores');
      const filtro = res.data.data.filter((j: any) => j.categorias?.some((c: any) => c.id === categoriaSel));
      setAlumnos(filtro);
      
      // Inicializar todos como presentes por defecto para ahorrar tiempo al profe
      const ini: any = {};
      filtro.forEach((a: any) => { ini[a.id] = 'Presente'; });
      setAsistencias(ini);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGuardarClase = async () => {
    setGuardando(true);
    try {
      const lista = alumnos.map(a => ({
        jugador_id: a.id,
        estado: asistencias[a.id]
      }));

      await api.post('/api/entrenamientos', {
        categoria_id: categoriaSel,
        fecha: fechaSel,
        hora: '17:00', // Podrías añadir un input de hora si lo deseas
        estado: estadoClase,
        es_recuperacion: esRecuperativa,
        motivo_cancelacion: motivoCancelacion,
        lista_asistencia: lista
      });

      alert(`✅ Entrenamiento ${estadoClase.toLowerCase()} registrado con éxito.`);
      setCategoriaSel('');
      cargarCategoriasYMetricas(); // Refrescar métricas
    } catch (e) {
      alert('Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarReporte = async () => {
    if (!categoriaSel) return alert('Selecciona una categoría primero.');
    const conf = window.confirm('¿Enviar por WhatsApp el resumen del mes a todos los apoderados de esta categoría?');
    if (!conf) return;

    setEnviandoReporte(true);
    try {
      const mes = new Date().toISOString().split('-')[1];
      const anio = new Date().getFullYear();
      const res = await api.post('/api/entrenamientos/reporte-mensual', { categoria_id: categoriaSel, mes, anio });
      alert(`✅ ${res.data.message}`);
    } catch (e) {
      alert('Error enviando reportes.');
    } finally {
      setEnviandoReporte(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-[#e6edf3]">📋 Asistencias y Recuperaciones</h1>
        <p className="text-sm text-gray-400">Pasa la lista en cancha, registra suspensiones y envía reportes mensuales.</p>
      </div>

      {/* DASHBOARD DE MÉTRICAS GRÁFICAS */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] flex flex-col justify-center items-center">
            <span className="text-gray-400 text-sm font-semibold">Asistencia Global (Mes)</span>
            <span className="text-4xl font-black text-[#289E9D]">{metricas.resumen.porcentajeGlobal}%</span>
            
            {/* Barra de progreso CSS en lugar de librería pesada */}
            <div className="w-full bg-[#161b22] rounded-full h-2.5 mt-3">
              <div className="bg-[#289E9D] h-2.5 rounded-full" style={{ width: `${metricas.resumen.porcentajeGlobal}%` }}></div>
            </div>
          </div>
          <div className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] text-center">
            <span className="text-gray-400 text-sm font-semibold block mb-2">Clases Realizadas</span>
            <span className="text-3xl font-bold text-white">{metricas.resumen.totalClases}</span>
          </div>
          <div className="bg-orange-900/20 p-5 rounded-xl border border-orange-500/30 text-center">
            <span className="text-orange-400 text-sm font-semibold block mb-2">Clases Recuperativas</span>
            <span className="text-3xl font-bold text-orange-400">{metricas.resumen.recuperativas}</span>
          </div>
          <div className="bg-red-900/20 p-5 rounded-xl border border-red-500/30 text-center">
            <span className="text-red-400 text-sm font-semibold block mb-2">Clases Suspendidas</span>
            <span className="text-3xl font-bold text-red-400">{metricas.resumen.canceladas}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL IZQUIERDO: FORMULARIO */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
            <h3 className="text-lg font-bold text-white">⚙️ Configurar Sesión</h3>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Categoría</label>
              <select value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none">
                <option value="">-- Seleccionar --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Fecha de la Clase</label>
              <input type="date" value={fechaSel} onChange={e => setFechaSel(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none" />
            </div>

            <div className="bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
              <label className="block text-xs font-semibold text-gray-400 mb-2">Estado del Entrenamiento</label>
              <div className="flex gap-2">
                <button onClick={() => setEstadoClase('Realizado')} className={`flex-1 py-1.5 rounded text-xs font-bold ${estadoClase === 'Realizado' ? 'bg-green-600 text-white' : 'bg-[#0d1117] text-gray-400'}`}>✔️ Realizado</button>
                <button onClick={() => setEstadoClase('Cancelado')} className={`flex-1 py-1.5 rounded text-xs font-bold ${estadoClase === 'Cancelado' ? 'bg-red-600 text-white' : 'bg-[#0d1117] text-gray-400'}`}>❌ Suspendido</button>
              </div>
            </div>

            {estadoClase === 'Cancelado' && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Motivo de Suspensión (Lluvia, Feriado, etc)</label>
                <input type="text" value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none" placeholder="Ej: Lluvia fuerte" />
              </div>
            )}

            {estadoClase === 'Realizado' && (
              <label className="flex items-center gap-2 text-sm text-orange-400 font-semibold cursor-pointer">
                <input type="checkbox" checked={esRecuperativa} onChange={e => setEsRecuperativa(e.target.checked)} className="accent-orange-500 w-4 h-4" />
                🔄 Esta clase es Recuperativa
              </label>
            )}

            <button 
              onClick={handleGuardarClase} 
              disabled={guardando || !categoriaSel}
              className="w-full bg-[#289E9D] hover:bg-[#207f7e] text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : '💾 Guardar Registro de Clase'}
            </button>

            <div className="border-t border-[#30363d] pt-4 mt-2">
              <button 
                onClick={handleEnviarReporte}
                disabled={enviandoReporte || !categoriaSel}
                className="w-full bg-[#21262d] border border-[#30363d] hover:bg-[#30363d] text-white py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2"
              >
                {enviandoReporte ? 'Enviando...' : '📲 Enviar Reporte Mensual (WhatsApp)'}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1">Requiere seleccionar una categoría.</p>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: PASAR LA LISTA */}
        <div className="lg:col-span-2">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 min-h-[500px]">
            <h3 className="text-xl font-bold text-white mb-4">📝 Pasar Lista de Alumnos</h3>
            
            {estadoClase === 'Cancelado' ? (
              <div className="text-center text-red-400 py-20 bg-red-900/10 rounded-xl border border-red-500/20">
                <span className="text-4xl block mb-2">🌧️</span>
                Clase suspendida. No se pasará lista hoy.<br/>
                Haz clic en Guardar para registrar la cancelación.
              </div>
            ) : !categoriaSel ? (
              <div className="text-center text-gray-500 mt-20">Selecciona una categoría para cargar a los alumnos.</div>
            ) : alumnos.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">No hay alumnos en esta categoría.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {alumnos.map(a => (
                  <div key={a.id} className="flex justify-between items-center bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
                    <div className="flex items-center gap-3">
                      <img src={a.foto_base64 || 'https://via.placeholder.com/150'} alt="img" className="w-10 h-10 rounded-full object-cover"/>
                      <span className="font-bold text-white text-sm">{a.nombre}</span>
                    </div>
                    
                    <div className="flex bg-[#0d1117] rounded-lg p-1 border border-[#30363d]">
                      <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Presente'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Presente' ? 'bg-green-600 text-white' : 'text-gray-400'}`}>✔️</button>
                      <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Ausente'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Ausente' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>❌</button>
                      <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Justificado'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Justificado' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>📝</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Asistencias;
