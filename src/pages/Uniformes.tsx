// src/pages/Uniformes.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const Uniformes: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Modales
  const [showModalCatalogo, setShowModalCatalogo] = useState(false);
  const [showModalPedido, setShowModalPedido] = useState(false);

  // Form Catalogo
  const [formCat, setFormCatalogo] = useState({
    nombre: '',
    precio: 0,
    aplica_numero: true,
    aplica_nombre_estampado: false
  });

  // Form Pedido
  const [formPed, setFormPedido] = useState({
    jugador_id: '',
    prenda_id: '',
    prenda_nombre: '',
    talla: '8',
    numero_estampado: '',
    nombre_estampado: '',
    monto: 0,
    generar_cobro: true
  });

  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

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

  const handleCrearCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post('/api/uniformes/catalogo', formCat);
      alert('✅ Prenda agregada al catálogo.');
      setShowModalCatalogo(false);
      setFormCatalogo({ nombre: '', precio: 0, aplica_numero: true, aplica_nombre_estampado: false });
      cargarDatos();
    } catch (e) {
      alert('Error creando prenda en el catálogo.');
    } finally {
      setProcesando(false);
    }
  };

  const handleSeleccionarPrendaEnPedido = (prendaId: string) => {
    const prenda = data.catalogo.find((p: any) => p.id === prendaId);
    if (prenda) {
      setFormPedido({
        ...formPed,
        prenda_id: prenda.id,
        prenda_nombre: prenda.nombre,
        monto: prenda.precio
      });
    }
  };

  const handleCrearPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPed.jugador_id || !formPed.prenda_nombre) {
      return alert('Selecciona el alumno y la prenda.');
    }

    setProcesando(true);
    try {
      const res = await api.post('/api/uniformes/pedidos', formPed);
      alert(`✅ ${res.data.message}`);
      setShowModalPedido(false);
      setFormPedido({
        jugador_id: '',
        prenda_id: '',
        prenda_nombre: '',
        talla: '8',
        numero_estampado: '',
        nombre_estampado: '',
        monto: 0,
        generar_cobro: true
      });
      cargarDatos();
    } catch (e) {
      alert('Error al registrar pedido.');
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = async (pedidoId: string, nuevoEstado: string) => {
    try {
      await api.put(`/api/uniformes/pedidos/${pedidoId}/estado`, { estado_entrega: nuevoEstado });
      cargarDatos();
    } catch (e) {
      alert('Error actualizando estado.');
    }
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10 font-bold">Cargando gestión de indumentaria...</div>;

  const pedidosFiltrados = (data?.pedidos || []).filter((p: any) => {
    const coincideEstado = filtroEstado === 'Todos' || p.estado_entrega === filtroEstado;
    const coincideNombre = p.jugadores?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || p.prenda_nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideNombre;
  });

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">👕 Uniformes e Indumentaria</h1>
          <p className="text-sm text-gray-400">Administra solicitudes, confección en taller y cargos independientes en cuenta corriente.</p>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowModalCatalogo(true)}
            className="bg-[#161b22] hover:bg-[#21262d] text-gray-200 border border-[#30363d] px-4 py-2 rounded-lg font-bold text-xs transition-colors"
          >
            ⚙️ Configurar Catálogo
          </button>
          <button 
            onClick={() => setShowModalPedido(true)}
            className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-4 py-2 rounded-lg font-bold text-xs shadow-lg transition-colors flex items-center gap-1.5"
          >
            <span>➕</span> Solicitar Indumentaria
          </button>
        </div>
      </div>

      {/* KPIS Y METRICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] text-center">
          <span className="text-red-400 text-xs font-bold uppercase block mb-1">Sin Pedir al Taller</span>
          <span className="text-3xl font-black text-red-400">{data?.kpis.pendientes}</span>
        </div>
        <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] text-center">
          <span className="text-orange-400 text-xs font-bold uppercase block mb-1">En Confección</span>
          <span className="text-3xl font-black text-orange-400">{data?.kpis.enTaller}</span>
        </div>
        <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] text-center">
          <span className="text-blue-400 text-xs font-bold uppercase block mb-1">En Cancha (Avisados)</span>
          <span className="text-3xl font-black text-blue-400">{data?.kpis.listos}</span>
        </div>
        <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] text-center">
          <span className="text-green-400 text-xs font-bold uppercase block mb-1">Entregados</span>
          <span className="text-3xl font-black text-green-400">{data?.kpis.entregados}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* RESUMEN PARA ENVIAR AL TALLER (TOTALES POR TALLA) */}
        <div className="lg:col-span-1 bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4 h-fit">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📦</span> Consolidado para Proveedor / Taller
          </h3>
          <p className="text-xs text-gray-400">Total de prendas activas agrupadas por talla para enviar a confeccionar:</p>

          <div className="space-y-2">
            {Object.keys(data?.resumenTallas || {}).length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-6">No hay prendas pendientes por mandar a taller.</p>
            ) : (
              Object.entries(data?.resumenTallas || {}).map(([talla, cantidad]: any) => (
                <div key={talla} className="flex justify-between items-center bg-[#161b22] p-3 rounded-lg border border-[#30363d]">
                  <span className="text-sm font-bold text-gray-200">Talla {talla}</span>
                  <span className="bg-[#289E9D] text-white font-black text-xs px-3 py-1 rounded-full">
                    {cantidad} {cantidad === 1 ? 'unidad' : 'unidades'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* LISTADO Y SEGUIMIENTO DE ENTREGAS */}
        <div className="lg:col-span-2 bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-lg font-bold text-white">🏃 Seguimiento de Pedidos</h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Buscar por alumno o prenda..." 
                value={busqueda} 
                onChange={e => setBusqueda(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] text-white text-xs rounded p-2 outline-none w-full sm:w-48"
              />
              <select 
                value={filtroEstado} 
                onChange={e => setFiltroEstado(e.target.value)}
                className="bg-[#161b22] border border-[#30363d] text-white text-xs rounded p-2 outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Taller">En Taller</option>
                <option value="Listo para Entrega">Listo en Cancha</option>
                <option value="Entregado">Entregado</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {pedidosFiltrados.length === 0 ? (
              <p className="text-center text-gray-500 py-12 text-xs">No hay registros de indumentaria creados.</p>
            ) : (
              pedidosFiltrados.map((p: any) => (
                <div key={p.id} className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <img src={p.jugadores?.foto_base64 || 'https://via.placeholder.com/150'} alt="img" className="w-10 h-10 rounded-full object-cover border border-[#30363d]" />
                    <div>
                      <span className="font-bold text-white text-sm block">{p.jugadores?.nombre || 'Alumno'}</span>
                      <p className="text-xs text-[#289E9D] font-semibold">{p.prenda_nombre}</p>
                      <div className="flex gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span>Talla: <strong className="text-white">{p.talla}</strong></span>
                        {p.numero_estampado && <span>| N°: <strong className="text-white">#{p.numero_estampado}</strong></span>}
                        {p.nombre_estampado && <span>| Nombre: <strong className="text-white">"{p.nombre_estampado}"</strong></span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
                    <span className="text-xs text-gray-300 font-bold">${Number(p.monto).toLocaleString('es-CL')}</span>
                    
                    <select 
                      value={p.estado_entrega} 
                      onChange={e => handleCambiarEstado(p.id, e.target.value)}
                      className={`text-xs font-bold rounded px-2.5 py-1.5 outline-none border ${
                        p.estado_entrega === 'Entregado' ? 'bg-green-950/40 border-green-500/50 text-green-400' :
                        p.estado_entrega === 'Listo para Entrega' ? 'bg-blue-950/40 border-blue-500/50 text-blue-400' :
                        p.estado_entrega === 'En Taller' ? 'bg-orange-950/40 border-orange-500/50 text-orange-400' :
                        'bg-red-950/40 border-red-500/50 text-red-400'
                      }`}
                    >
                      <option value="Pendiente">🔴 Pendiente</option>
                      <option value="En Taller">🟡 En Confección / Taller</option>
                      <option value="Listo para Entrega">📲 Listo en Cancha (Avisar)</option>
                      <option value="Entregado">🟢 Entregado al Apoderado</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL 1: CONFIGURAR CATÁLOGO DE PRENDAS */}
      {showModalCatalogo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">⚙️ Agregar Prenda al Catálogo</h2>
            
            <form onSubmit={handleCrearCatalogo} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Nombre de la Prenda / Pack</label>
                <input type="text" placeholder="Ej: Kit Oficial Titular 2026" value={formCat.nombre} onChange={e => setFormCatalogo({...formCat, nombre: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" required />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Precio de Venta ($)</label>
                <input type="number" placeholder="25000" value={formCat.precio} onChange={e => setFormCatalogo({...formCat, precio: Number(e.target.value)})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" required />
              </div>

              <div className="space-y-2 pt-2 border-t border-[#30363d]">
                <label className="flex items-center justify-between text-gray-300 font-semibold cursor-pointer">
                  <span>¿Requiere número estampado?</span>
                  <input type="checkbox" checked={formCat.aplica_numero} onChange={e => setFormCatalogo({...formCat, aplica_numero: e.target.checked})} className="accent-[#289E9D]" />
                </label>
                <label className="flex items-center justify-between text-gray-300 font-semibold cursor-pointer">
                  <span>¿Requiere nombre de jugador estampado?</span>
                  <input type="checkbox" checked={formCat.aplica_nombre_estampado} onChange={e => setFormCatalogo({...formCat, aplica_nombre_estampado: e.target.checked})} className="accent-[#289E9D]" />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowModalCatalogo(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-5 py-2 rounded font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SOLICITAR INDUMENTARIA Y REGISTRAR CARGO EN CUENTA CORRIENTE */}
      {showModalPedido && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white">👕 Solicitar Indumentaria para Alumno</h2>
            
            <form onSubmit={handleCrearPedido} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Seleccionar Alumno *</label>
                <select 
                  value={formPed.jugador_id} 
                  onChange={e => setFormPedido({...formPed, jugador_id: e.target.value})}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none"
                  required
                >
                  <option value="">-- Seleccionar Alumno --</option>
                  {data?.jugadores?.map((j: any) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Prenda del Catálogo</label>
                  <select 
                    onChange={e => handleSeleccionarPrendaEnPedido(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none"
                  >
                    <option value="">-- Opciones --</option>
                    {data?.catalogo?.map((p: any) => <option key={p.id} value={p.id}>{p.nombre} (${p.precio})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nombre Personalizado de la Prenda</label>
                  <input type="text" value={formPed.prenda_nombre} onChange={e => setFormPedido({...formPed, prenda_nombre: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" placeholder="Ej: Camiseta Oficial" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Talla *</label>
                  <select value={formPed.talla} onChange={e => setFormPedido({...formPed, talla: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none">
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Número Estampado</label>
                  <input type="number" placeholder="Ej: 10" value={formPed.numero_estampado} onChange={e => setFormPedido({...formPed, numero_estampado: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Nombre Estampado</label>
                  <input type="text" placeholder="Ej: GONZALEZ" value={formPed.nombre_estampado} onChange={e => setFormPedido({...formPed, nombre_estampado: e.target.value})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Monto ($)</label>
                <input type="number" value={formPed.monto} onChange={e => setFormPedido({...formPed, monto: Number(e.target.value)})} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2 text-white outline-none" />
              </div>

              {/* OPCCIÓN DE REGISTRO EN CUENTA CORRIENTE */}
              <div className="p-3 bg-[#0d1117] border border-[#289E9D]/40 rounded-lg space-y-1">
                <label className="flex items-center justify-between text-white font-bold cursor-pointer">
                  <span>💳 Generar cobro separado en Cuenta Corriente</span>
                  <input type="checkbox" checked={formPed.generar_cobro} onChange={e => setFormPedido({...formPed, generar_cobro: e.target.checked})} className="accent-[#289E9D] w-4 h-4" />
                </label>
                <p className="text-[11px] text-gray-400">
                  Se creará un cobro independiente con el concepto "Indumentaria", separado de las mensualidades.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowModalPedido(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-5 py-2 rounded font-bold">Solicitar y Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Uniformes;
