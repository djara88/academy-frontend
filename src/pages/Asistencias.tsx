// src/pages/Asistencias.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import * as XLSX from 'xlsx'; // 👈 IMPORTACIÓN DE LIBRERÍA EXCEL

const Asistencias: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'lista' | 'reportes'>('lista');

  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaSel, setCategoriaSel] = useState('');
  const [fechaSel, setFechaSel] = useState(new Date().toISOString().split('T')[0]);
  
  const [alumnos, setAlumnos] = useState<any[]>([]);
  const [asistencias, setAsistencias] = useState<any>({});
  
  const [esRecuperativa, setEsRecuperativa] = useState(false);
  const [estadoClase, setEstadoClase] = useState('Realizado');
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Estados de Métricas
  const [metricas, setMetricas] = useState<any>(null);
  const [mesMetricas, setMesMetricas] = useState(new Date().toISOString().split('-')[1]);
  const [anioMetricas, setAnioMetricas] = useState(new Date().getFullYear().toString());
  const [enviandoReporte, setEnviandoReporte] = useState(false);

  useEffect(() => {
    cargarCategoriasYMetricas();
  }, [mesMetricas, anioMetricas]);

  useEffect(() => {
    if (categoriaSel && estadoClase === 'Realizado') {
      cargarAlumnos();
    }
  }, [categoriaSel, estadoClase]);

  const cargarCategoriasYMetricas = async () => {
    try {
      const resC = await api.get('/api/jugadores/categorias');
      setCategorias(resC.data.data || []);
      
      const resM = await api.get(`/api/entrenamientos/metricas?mes=${mesMetricas}&anio=${anioMetricas}`);
      setMetricas(resM.data.data);
    } catch (e) {
      console.error('Error cargando métricas:', e);
    }
  };

  const cargarAlumnos = async () => {
    try {
      const res = await api.get('/api/jugadores');
      const filtro = res.data.data.filter((j: any) => j.categorias?.some((c: any) => c.id === categoriaSel));
      setAlumnos(filtro);
      
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
        hora: '17:00',
        estado: estadoClase,
        es_recuperacion: esRecuperativa,
        motivo_cancelacion: motivoCancelacion,
        lista_asistencia: lista
      });

      alert(`✅ Entrenamiento ${estadoClase.toLowerCase()} registrado con éxito.`);
      setCategoriaSel('');
      cargarCategoriasYMetricas(); 
    } catch (e) {
      alert('Error al guardar. Verifica tu conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEnviarReporte = async () => {
    if (!categoriaSel) return alert('Selecciona una categoría primero.');
    const conf = window.confirm('¿Enviar por WhatsApp el reporte INDIVIDUAL del mes a todos los apoderados de esta categoría?');
    if (!conf) return;

    setEnviandoReporte(true);
    try {
      const res = await api.post('/api/entrenamientos/reporte-mensual', { 
        categoria_id: categoriaSel, 
        mes: mesMetricas, 
        anio: anioMetricas 
      });
      alert(`✅ ${res.data.message}`);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Error enviando reportes.');
    } finally {
      setEnviandoReporte(false);
    }
  };

  // 🔥 NUEVA FUNCIÓN: EXPORTAR A EXCEL
  const exportarAExcel = () => {
    if (!metricas || !metricas.jugadores || metricas.jugadores.length === 0) {
      return alert("No hay datos suficientes para exportar.");
    }

    const datosExcel = metricas.jugadores.map((jug: any, index: number) => ({
      "Ranking": index + 1,
      "Alumno": jug.nombre,
      "Porcentaje (%)": `${jug.porcentaje}%`,
      "Clases Presente": jug.presentes,
      "Clases Totales del Mes": jug.total
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, `Asistencias_${mesMetricas}_${anioMetricas}`);
    
    // Descarga automática del archivo
    XLSX.writeFile(libro, `Reporte_Asistencias_${mesMetricas}_${anioMetricas}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">📋 Asistencias y Recuperaciones</h1>
          <p className="text-sm text-gray-400">Pasa la lista en cancha, controla inasistencias y envía reportes individuales.</p>
        </div>
        
        <div className="bg-[#0d1117] p-1.5 rounded-lg border border-[#30363d] flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('lista')} 
            className={`flex-1 md:flex-none px-5 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'lista' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📝 Pasar Lista
          </button>
          <button 
            onClick={() => setActiveTab('reportes')} 
            className={`flex-1 md:flex-none px-5 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'reportes' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:text-white'}`}
          >
            📊 Dashboard y Reportes
          </button>
        </div>
      </div>

      {activeTab === 'lista' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
              <h3 className="text-lg font-bold text-white">⚙️ Configurar Sesión</h3>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Categoría</label>
                <select value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none focus:border-[#289E9D]">
                  <option value="">-- Seleccionar --</option>
                  {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Fecha de la Clase</label>
                <input type="date" value={fechaSel} onChange={e => setFechaSel(e.target.value)} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none focus:border-[#289E9D]" />
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
            </div>
          </div>

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
                <div className="text-center text-gray-500 mt-20">Selecciona una categoría en el panel izquierdo para cargar a los alumnos.</div>
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
                        <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Presente'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Presente' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>✔️</button>
                        <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Ausente'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Ausente' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>❌</button>
                        <button onClick={() => setAsistencias({...asistencias, [a.id]: 'Justificado'})} className={`px-3 py-1 rounded text-xs font-bold ${asistencias[a.id] === 'Justificado' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>📝</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reportes' && metricas && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Mes de Análisis</label>
              <select value={mesMetricas} onChange={e => setMesMetricas(e.target.value)} className="bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none">
                <option value="01">Enero</option>
                <option value="02">Febrero</option>
                <option value="03">Marzo</option>
                <option value="04">Abril</option>
                <option value="05">Mayo</option>
                <option value="06">Junio</option>
                <option value="07">Julio</option>
                <option value="08">Agosto</option>
                <option value="09">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Año</label>
              <select value={anioMetricas} onChange={e => setAnioMetricas(e.target.value)} className="bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none">
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            
            <div className="ml-auto flex items-end gap-2 border-l border-[#30363d] pl-4">
              <select value={categoriaSel} onChange={e => setCategoriaSel(e.target.value)} className="bg-[#161b22] border border-[#30363d] rounded p-2 text-white text-xs outline-none">
                <option value="">-- Seleccionar Categoría --</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
              <button 
                onClick={handleEnviarReporte}
                disabled={enviandoReporte || !categoriaSel}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-2 rounded font-bold text-sm flex gap-2 items-center shadow-lg transition-colors"
              >
                {enviandoReporte ? 'Enviando...' : '📲 Enviar Reportes (WhatsApp)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] flex flex-col justify-center items-center relative overflow-hidden">
              <span className="text-gray-400 text-xs uppercase font-bold tracking-wider relative z-10">Asistencia Global</span>
              <span className="text-5xl font-black text-[#289E9D] mt-2 relative z-10">{metricas.global.porcentajeGlobal}%</span>
              <div className="w-full bg-[#161b22] rounded-full h-1.5 mt-4 relative z-10">
                <div className="bg-[#289E9D] h-1.5 rounded-full" style={{ width: `${metricas.global.porcentajeGlobal}%` }}></div>
              </div>
            </div>
            <div className="bg-[#0d1117] p-5 rounded-xl border border-[#30363d] flex flex-col justify-center items-center">
              <span className="text-gray-400 text-sm font-semibold mb-1">Clases Realizadas</span>
              <span className="text-3xl font-bold text-white">{metricas.global.totalClases}</span>
            </div>
            <div className="bg-orange-900/10 p-5 rounded-xl border border-orange-500/20 flex flex-col justify-center items-center">
              <span className="text-orange-400 text-sm font-semibold mb-1">Recuperativas</span>
              <span className="text-3xl font-bold text-orange-400">{metricas.global.recuperativas}</span>
            </div>
            <div className="bg-red-900/10 p-5 rounded-xl border border-red-500/20 flex flex-col justify-center items-center">
              <span className="text-red-400 text-sm font-semibold mb-1">Suspendidas</span>
              <span className="text-3xl font-bold text-red-400">{metricas.global.canceladas}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0d1117] p-6 rounded-xl border border-[#30363d]">
              <h3 className="text-lg font-bold text-white mb-4">🏷️ Rendimiento por Categorías</h3>
              <div className="space-y-4">
                {metricas.categorias.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No hay datos de categorías este mes.</p>
                ) : (
                  metricas.categorias.map((cat: any, idx: number) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-white">{cat.nombre}</span>
                        <span className="text-[#289E9D] font-bold">{cat.porcentaje}%</span>
                      </div>
                      <div className="w-full bg-[#161b22] rounded-full h-2">
                        <div className="bg-[#289E9D] h-2 rounded-full" style={{ width: `${cat.porcentaje}%` }}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0d1117] p-6 rounded-xl border border-[#30363d] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">🏃‍♂️ Ranking Individual</h3>
                {/* 🔥 BOTÓN EXPORTAR EXCEL */}
                <button 
                  onClick={exportarAExcel}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors"
                >
                  📥 Descargar Excel
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4 flex-1">
                {metricas.jugadores.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-6">No hay registros de alumnos este mes.</p>
                ) : (
                  metricas.jugadores.map((jug: any, idx: number) => (
                    <div key={idx} className="bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <span className="text-gray-500 text-xs">#{idx + 1}</span> {jug.nombre}
                        </span>
                        <span className={`font-bold ${jug.porcentaje >= 80 ? 'text-green-400' : jug.porcentaje >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {jug.porcentaje}%
                        </span>
                      </div>
                      <div className="w-full bg-[#0d1117] rounded-full h-1.5 mb-2">
                        <div className={`h-1.5 rounded-full ${jug.porcentaje >= 80 ? 'bg-green-500' : jug.porcentaje >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${jug.porcentaje}%` }}></div>
                      </div>
                      <div className="text-[10px] text-gray-500 flex justify-between">
                        <span>Asistencias: {jug.presentes}</span>
                        <span>Total Clases: {jug.total}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Asistencias;
