// src/pages/Uniformes.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import * as XLSX from 'xlsx';

const Uniformes: React.FC = () => {
  const { confirmAction, notify } = useAcademyMessages();
  const [activeTab, setActiveTab] = useState<'alumnos' | 'catalogo' | 'taller'>('alumnos');
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [showModalCatalogo, setShowModalCatalogo] = useState(false);
  const [idCatEditando, setIdCatEditando] = useState<string | null>(null);
  const [showModalPedido, setShowModalPedido] = useState(false);

  // Formularios
  const [formCat, setFormCatalogo] = useState({
    nombre: '', precio: 0, aplica_numero: true, aplica_nombre_estampado: false,
    tipo_operacion: 'Taller', stock_disponible: 0
  });

  const [formPed, setFormPedido] = useState({
    jugador_id: '', prenda_id: '', prenda_nombre: '', talla: '8',
    numero_estampado: '', nombre_estampado: '', monto: 0,
    generar_cobro: false, estado_pago: 'Pendiente de Pago'
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/uniformes');
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrearCatalogo = () => {
    setIdCatEditando(null);
    setFormCatalogo({ nombre: '', precio: 0, aplica_numero: true, aplica_nombre_estampado: false, tipo_operacion: 'Taller', stock_disponible: 0 });
    setShowModalCatalogo(true);
  };

  const abrirModalEditarCatalogo = (cat: any) => {
    setIdCatEditando(cat.id);
    setFormCatalogo({
      nombre: cat.nombre || '',
      precio: cat.precio || 0,
      aplica_numero: cat.aplica_numero ?? true,
      aplica_nombre_estampado: cat.aplica_nombre_estampado ?? false,
      tipo_operacion: cat.tipo_operacion || 'Taller',
      stock_disponible: cat.stock_disponible || 0
    });
    setShowModalCatalogo(true);
  };

  const handleGuardarCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      if (idCatEditando) {
        await api.put(`/api/uniformes/catalogo/${idCatEditando}`, formCat);
        notify('✅ Prenda del catálogo actualizada.');
      } else {
        await api.post('/api/uniformes/catalogo', formCat);
        notify('✅ Prenda añadida al catálogo.');
      }
      setShowModalCatalogo(false);
      cargarDatos();
    } catch (e) {
      notify('Error guardando la prenda.');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarCatalogo = async (id: string, nombre: string) => {
    const conf = await confirmAction(`¿Estás seguro de eliminar "${nombre}" del catálogo?`, 'danger');
    if (!conf) return;

    try {
      await api.delete(`/api/uniformes/catalogo/${id}`);
      cargarDatos();
    } catch (e) {
      notify('Error al eliminar la prenda.');
    }
  };

  const handleSeleccionarPrenda = (id: string) => {
    const prenda = data.catalogo.find((p: any) => p.id === id);
    if (prenda) {
      setFormPedido({ ...formPed, prenda_id: prenda.id, prenda_nombre: prenda.nombre, monto: prenda.precio });
    }
  };

  const handleCrearPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const res = await api.post('/api/uniformes/pedidos', formPed);
      notify(`✅ ${res.data.message}`);
      setShowModalPedido(false);
      setFormPedido({ jugador_id: '', prenda_id: '', prenda_nombre: '', talla: '8', numero_estampado: '', nombre_estampado: '', monto: 0, generar_cobro: false, estado_pago: 'Pendiente de Pago' });
      cargarDatos();
    } catch (e) {
      notify('Error asignando la prenda.');
    } finally {
      setProcesando(false);
    }
  };

  const actualizarPedido = async (id: string, campo: string, valor: string) => {
    try {
      await api.put(`/api/uniformes/pedidos/${id}/actualizar`, { [campo]: valor });
      cargarDatos();
    } catch (e) {
      notify('Error actualizando el estado.');
    }
  };

  const exportarTallerExcel = () => {
    if (!data?.resumenTaller || Object.keys(data.resumenTaller).length === 0) {
      return notify("No hay pedidos pendientes para exportar.");
    }
    
    const datosExcel = Object.entries(data.resumenTaller).map(([prenda, cantidad]) => ({
      "Prenda y Talla": prenda,
      "Cantidad a Fabricar": cantidad
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Pedido_Taller");
    XLSX.writeFile(libro, `Pedido_Indumentaria_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10 font-bold">Cargando inventario...</div>;

  const pedidosFiltrados = (data?.pedidos || []).filter((p: any) => 
    p.jugadores?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.prenda_nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">👕 Uniformes e Inventario</h1>
          <p className="text-sm text-gray-400">Gestiona stock físico, pedidos al taller y entregas a los alumnos.</p>
        </div>
      </div>

      {/* PESTAÑAS PRINCIPALES */}
      <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveTab('alumnos')} 
          className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'alumnos' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}
        >
          🏃‍♂️ Gestión de Alumnos
        </button>
        <button 
          onClick={() => setActiveTab('catalogo')} 
          className={`flex-1 py-3 font-bold text-sm border-l border-r border-[#30363d] transition-colors ${activeTab === 'catalogo' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}
        >
          🛍️ Catálogo y Stock Físico
        </button>
        <button 
          onClick={() => setActiveTab('taller')} 
          className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'taller' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}
        >
          📦 Reporte Taller (Bajo Demanda)
        </button>
      </div>

      {/* TAB 1: GESTIÓN DE ALUMNOS */}
      {activeTab === 'alumnos' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center bg-[#0d1117] border border-[#30363d] p-4 rounded-xl">
            <input 
              type="text" 
              placeholder="Buscar alumno o prenda..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] text-white text-sm rounded-lg p-2.5 outline-none w-72 focus:border-[#289E9D]"
            />
            <button 
              onClick={() => setShowModalPedido(true)}
              className="bg-[#289E9D] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow flex items-center gap-2 hover:bg-[#207f7e] transition-colors"
            >
              <span>+</span> Asignar Prenda a Alumno
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {pedidosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-[#0d1117] rounded-xl border border-[#30363d]">Aún no hay prendas asignadas a los alumnos.</div>
            ) : (
              pedidosFiltrados.map((p: any) => (
                <div key={p.id} className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:border-gray-600 transition-colors">
                  
                  <div className="flex items-center gap-4 w-full lg:w-1/3">
                    <img src={p.jugadores?.foto_base64 || 'https://via.placeholder.com/150'} alt="img" className="w-12 h-12 rounded-full object-cover border border-[#30363d]" />
                    <div>
                      <span className="font-bold text-white text-sm block">{p.jugadores?.nombre}</span>
                      <p className="text-xs text-[#289E9D] font-semibold">{p.prenda_nombre}</p>
                      <div className="flex gap-2 text-[11px] text-gray-400 mt-1">
                        <span className="bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">Talla: <strong className="text-white">{p.talla}</strong></span>
                        {p.numero_estampado && <span className="bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">N°: <strong className="text-white">{p.numero_estampado}</strong></span>}
                        {p.nombre_estampado && <span className="bg-[#161b22] px-2 py-0.5 rounded border border-[#30363d]">Espalda: <strong className="text-white">{p.nombre_estampado}</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-1/4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Finanzas / Pago</span>
                    <select 
                      value={p.estado_pago || 'Pendiente de Pago'}
                      onChange={e => actualizarPedido(p.id, 'estado_pago', e.target.value)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 w-full outline-none border transition-colors ${
                        p.estado_pago === 'Incluido en Matrícula' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' :
                        p.estado_pago === 'Pagado' ? 'bg-green-900/20 text-green-400 border-green-500/30' :
                        'bg-red-900/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      <option value="Pendiente de Pago">⏳ Pendiente de Pago</option>
                      <option value="Pagado">💳 Pagado</option>
                      <option value="Incluido en Matrícula">🎁 Incluido en Matrícula</option>
                    </select>
                  </div>

                  <div className="w-full lg:w-1/3">
                    <span className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Logística / Entrega</span>
                    <select 
                      value={p.estado_entrega} 
                      onChange={e => actualizarPedido(p.id, 'estado_entrega', e.target.value)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 w-full outline-none border transition-colors ${
                        p.estado_entrega === 'Entregado' ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400' :
                        p.estado_entrega === 'Listo para Entrega' ? 'bg-blue-950/40 border-blue-500/50 text-blue-400' :
                        p.estado_entrega === 'En Taller' ? 'bg-orange-950/40 border-orange-500/50 text-orange-400' :
                        'bg-[#161b22] border-gray-600 text-gray-300'
                      }`}
                    >
                      <option value="Pendiente">🔴 Pendiente / Sin pedir</option>
                      <option value="En Taller">🟡 En Taller / Importación</option>
                      <option value="Listo para Entrega">🟢 Listo en Cancha (Avisar Whatsapp)</option>
                      <option value="Entregado">⚪ Entregado al Apoderado</option>
                    </select>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATÁLOGO Y STOCK (CON EDITAR Y ELIMINAR) 🔥 */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">Define las prendas de tu academia. Decide si se mandan a hacer a pedido o si tienes stock guardado.</p>
            <button 
              onClick={abrirModalCrearCatalogo}
              className="bg-[#289E9D] text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-[#207f7e] transition-colors"
            >
              + Agregar Prenda
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data?.catalogo.map((cat: any) => (
              <div key={cat.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-[#289E9D] transition-colors">
                <div className="absolute top-0 right-0 p-2">
                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${cat.tipo_operacion === 'Stock' ? 'bg-purple-900/30 text-purple-400' : 'bg-orange-900/30 text-orange-400'}`}>
                    {cat.tipo_operacion === 'Stock' ? '📦 En Bodega' : '🧵 A Pedido'}
                  </span>
                </div>

                <div className="mt-2">
                  <h3 className="text-lg font-bold text-white mb-1">{cat.nombre}</h3>
                  <span className="text-xl font-black text-[#289E9D] block mb-3">${Number(cat.precio).toLocaleString('es-CL')}</span>
                  
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-400">🔢 Número: <strong className="text-gray-200">{cat.aplica_numero ? 'Sí' : 'No'}</strong></p>
                    <p className="text-xs text-gray-400">✍️ Nombre: <strong className="text-gray-200">{cat.aplica_nombre_estampado ? 'Sí' : 'No'}</strong></p>
                  </div>
                </div>

                {cat.tipo_operacion === 'Stock' && (
                  <div className="mt-4 pt-3 border-t border-[#30363d] flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400">Stock Actual:</span>
                    <span className={`text-lg font-black ${cat.stock_disponible > 5 ? 'text-green-400' : cat.stock_disponible > 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                      {cat.stock_disponible} unid.
                    </span>
                  </div>
                )}

                {/* BOTONES ACCIONES CATÁLOGO */}
                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#30363d]">
                  <button onClick={() => abrirModalEditarCatalogo(cat)} className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-[#161b22] border border-[#30363d] rounded transition-colors" title="Editar Prenda">
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleEliminarCatalogo(cat.id, cat.nombre)} className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-[#161b22] border border-red-500/30 rounded transition-colors" title="Eliminar Prenda">
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTE TALLER */}
      {activeTab === 'taller' && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 animate-fade-in max-w-3xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-2">🧵</span>
            <h2 className="text-2xl font-bold text-white">Reporte para Fabricante</h2>
            <p className="text-sm text-gray-400 mt-1 mb-6">Suma automática de prendas "A pedido" que están pendientes de fabricación.</p>
            
            <div className="flex justify-center gap-4">
              <button 
                onClick={exportarTallerExcel}
                className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2"
              >
                📥 Descargar Excel
              </button>
            </div>
          </div>

          {Object.keys(data?.resumenTaller || {}).length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center text-gray-500">
              No hay pedidos pendientes para mandar al taller en este momento.
            </div>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-[#1C212D] text-xs uppercase font-bold text-gray-400 border-b border-[#30363d]">
                  <tr>
                    <th className="px-6 py-4">Prenda y Talla</th>
                    <th className="px-6 py-4 text-center">Cantidad a Fabricar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#30363d]">
                  {Object.entries(data?.resumenTaller || {}).map(([key, cant]: any) => (
                    <tr key={key} className="hover:bg-[#1C212D]/50">
                      <td className="px-6 py-4 font-semibold text-white">{key}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-[#289E9D] text-white px-4 py-1.5 rounded-full font-black shadow">{cant}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREAR O EDITAR CATÁLOGO */}
      {showModalCatalogo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">
              {idCatEditando ? '✏️ Editar Prenda del Catálogo' : '⚙️ Nueva Prenda en Catálogo'}
            </h2>
            
            <form onSubmit={handleGuardarCatalogo} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Nombre de la Prenda o Pack</label>
                <input type="text" placeholder="Ej: Kit Oficial 2026" value={formCat.nombre} onChange={e => setFormCatalogo({...formCat, nombre: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]" required />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Precio de Venta ($)</label>
                <input type="number" placeholder="Ej: 25000" value={formCat.precio} onChange={e => setFormCatalogo({...formCat, precio: Number(e.target.value)})} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <span className="block text-xs text-gray-400 mb-2 font-bold uppercase">Operación</span>
                  <select value={formCat.tipo_operacion} onChange={e => setFormCatalogo({...formCat, tipo_operacion: e.target.value})} className="w-full bg-transparent text-white font-semibold outline-none text-sm cursor-pointer">
                    <option value="Taller">🧵 A Pedido (Taller)</option>
                    <option value="Stock">📦 Stock Físico</option>
                  </select>
                </div>
                {formCat.tipo_operacion === 'Stock' && (
                  <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                    <span className="block text-xs text-gray-400 mb-2 font-bold uppercase">Unidades Bodega</span>
                    <input type="number" min="0" value={formCat.stock_disponible} onChange={e => setFormCatalogo({...formCat, stock_disponible: Number(e.target.value)})} className="w-full bg-transparent text-white font-semibold outline-none text-sm" required />
                  </div>
                )}
              </div>

              <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
                <label className="flex items-center justify-between text-gray-300 font-semibold cursor-pointer text-xs">
                  <span>¿Permite elegir número?</span>
                  <input type="checkbox" checked={formCat.aplica_numero} onChange={e => setFormCatalogo({...formCat, aplica_numero: e.target.checked})} className="accent-[#289E9D] w-4 h-4" />
                </label>
                <label className="flex items-center justify-between text-gray-300 font-semibold cursor-pointer text-xs">
                  <span>¿Permite nombre en espalda?</span>
                  <input type="checkbox" checked={formCat.aplica_nombre_estampado} onChange={e => setFormCatalogo({...formCat, aplica_nombre_estampado: e.target.checked})} className="accent-[#289E9D] w-4 h-4" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModalCatalogo(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-5 py-2 rounded-lg font-bold">
                  {idCatEditando ? 'Actualizar Prenda' : 'Crear Prenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASIGNAR PRENDA A ALUMNO */}
      {showModalPedido && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">➕ Asignar Prenda a Alumno</h2>
            
            <form onSubmit={handleCrearPedido} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Seleccionar Alumno *</label>
                <select 
                  value={formPed.jugador_id} 
                  onChange={e => setFormPedido({...formPed, jugador_id: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]"
                  required
                >
                  <option value="">-- Buscar Alumno --</option>
                  {data?.jugadores?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Prenda del Catálogo *</label>
                <select 
                  required
                  onChange={e => handleSeleccionarPrenda(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]"
                >
                  <option value="">-- Elegir Prenda --</option>
                  {data?.catalogo?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} (${p.precio}) - {p.tipo_operacion}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Talla *</label>
                  <select value={formPed.talla} onChange={e => setFormPedido({...formPed, talla: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none">
                    {['4','6','8','10','12','14','16','S','M','L','XL'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">N° Espalda</label>
                  <input type="number" placeholder="Ej: 10" value={formPed.numero_estampado} onChange={e => setFormPedido({...formPed, numero_estampado: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nombre</label>
                  <input type="text" placeholder="Ej: ALEXIS" value={formPed.nombre_estampado} onChange={e => setFormPedido({...formPed, nombre_estampado: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none uppercase" />
                </div>
              </div>

              <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-lg space-y-3">
                <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider border-b border-[#30363d] pb-2">Estado Financiero</span>
                
                <select 
                  value={formPed.estado_pago} 
                  onChange={e => setFormPedido({...formPed, estado_pago: e.target.value})}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-2.5 text-white font-semibold outline-none focus:border-[#289E9D]"
                >
                  <option value="Incluido en Matrícula">🎁 Ya incluido en la Matrícula</option>
                  <option value="Pagado">💳 Pagado en Efectivo / Transferencia Directa</option>
                  <option value="Pendiente de Pago">⏳ Pendiente de Pago (Cobrar aparte)</option>
                </select>

                {formPed.estado_pago === 'Pendiente de Pago' && (
                  <label className="flex items-center gap-3 text-orange-400 font-bold text-xs bg-orange-950/20 p-3 rounded-lg border border-orange-500/20 cursor-pointer mt-2">
                    <input type="checkbox" checked={formPed.generar_cobro} onChange={e => setFormPedido({...formPed, generar_cobro: e.target.checked})} className="accent-orange-500 w-4 h-4" />
                    Generar cupón de cobro en cuenta corriente por ${Number(formPed.monto).toLocaleString('es-CL')}
                  </label>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModalPedido(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-6 py-2 rounded-lg font-bold">Confirmar Asignación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Uniformes;
