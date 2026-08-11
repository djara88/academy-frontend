// src/pages/Finanzas.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const Finanzas: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cuentas' | 'egresos' | 'flujo' | 'kpis'>('cuentas');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Datos del backend
  const [resumen, setResumen] = useState<any>(null);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [egresos, setEgresos] = useState<any[]>([]);
  const [flujoCaja, setFlujoCaja] = useState<any[]>([]);

  // Modales
  const [modalAbono, setModalAbono] = useState<any>(null);
  const [modalNuevoCobro, setModalNuevoCobro] = useState(false);
  const [modalNuevoEgreso, setModalNuevoEgreso] = useState(false);

  // Formularios
  const [formAbono, setFormAbono] = useState({ monto_abono: 0, metodo_pago: 'Transferencia', observaciones: '' });
  const [formCobro, setFormCobro] = useState({ jugador_id: '', concepto: '', tipo_concepto: 'Mensualidad', monto: 0, fecha_vencimiento: '' });
  const [formEgreso, setFormEgreso] = useState({ concepto: '', categoria_gasto: 'Arriendo Canchas', centro_costo: 'Fútbol', monto: 0, metodo_pago: 'Transferencia', fecha_gasto: new Date().toISOString().split('T')[0], observaciones: '' });

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    setLoading(true);
    try {
      const [rRes, rCuentas, rEgresos, rFlujo] = await Promise.all([
        api.get('/api/finanzas/resumen'),
        api.get('/api/finanzas/cuentas-corrientes'),
        api.get('/api/finanzas/egresos'),
        api.get('/api/finanzas/flujo-caja')
      ]);

      setResumen(rRes.data.data);
      setCuentas(rCuentas.data.data || []);
      setEgresos(rEgresos.data.data || []);
      setFlujoCaja(rFlujo.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAbonarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAbono) return;
    setProcesando(true);
    try {
      await api.put(`/api/finanzas/cobros/${modalAbono.id}/pagar`, formAbono);
      alert('✅ Pago registrado con éxito.');
      setModalAbono(null);
      cargarTodo();
    } catch (e) {
      alert('Error al registrar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  const handleCrearCobro = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post('/api/finanzas/cobros', formCobro);
      alert('✅ Cargo asignado correctamente al alumno.');
      setModalNuevoCobro(false);
      setFormCobro({ jugador_id: '', concepto: '', tipo_concepto: 'Mensualidad', monto: 0, fecha_vencimiento: '' });
      cargarTodo();
    } catch (e) {
      alert('Error al asignar el cobro.');
    } finally {
      setProcesando(false);
    }
  };

  const handleCrearEgreso = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api.post('/api/finanzas/egresos', formEgreso);
      alert('✅ Egreso registrado correctamente.');
      setModalNuevoEgreso(false);
      setFormEgreso({ concepto: '', categoria_gasto: 'Arriendo Canchas', centro_costo: 'Fútbol', monto: 0, metodo_pago: 'Transferencia', fecha_gasto: new Date().toISOString().split('T')[0], observaciones: '' });
      cargarTodo();
    } catch (e) {
      alert('Error al registrar el egreso.');
    } finally {
      setProcesando(false);
    }
  };

  const handleEliminarEgreso = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar este registro de egreso?')) return;
    try {
      await api.delete(`/api/finanzas/egresos/${id}`);
      cargarTodo();
    } catch (e) {
      alert('Error al eliminar el egreso.');
    }
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10 font-bold">Cargando estado financiero...</div>;

  const cuentasFiltradas = cuentas.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.tutores?.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">💼 Módulo de Finanzas y Control ERP</h1>
          <p className="text-sm text-gray-400">Control total de ingresos, cuentas corrientes de alumnos, egresos y flujo de caja.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setModalNuevoCobro(true)} className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors">
            + Asignar Cobro
          </button>
          <button onClick={() => setModalNuevoEgreso(true)} className="bg-red-900/40 border border-red-500/40 hover:bg-red-900/60 text-red-300 px-4 py-2 rounded-lg font-bold text-sm shadow transition-colors">
            - Registrar Egreso
          </button>
        </div>
      </div>

      {/* TARJETAS DE KPIS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl">
          <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Recaudado (Efectivo Real)</span>
          <span className="text-2xl font-black text-green-400">${Number(resumen?.totalIngresosReales || 0).toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl">
          <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Por Cobrar (Por Vencer)</span>
          <span className="text-2xl font-black text-orange-400">${Number(resumen?.totalPorCobrar || 0).toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl">
          <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Total Egresos (Gastos)</span>
          <span className="text-2xl font-black text-red-400">${Number(resumen?.totalEgresos || 0).toLocaleString('es-CL')}</span>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] p-5 rounded-xl">
          <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Balance Neto Caja</span>
          <span className={`text-2xl font-black ${Number(resumen?.balanceNeto || 0) >= 0 ? 'text-[#289E9D]' : 'text-red-500'}`}>
            ${Number(resumen?.balanceNeto || 0).toLocaleString('es-CL')}
          </span>
        </div>
      </div>

      {/* NAVEGACIÓN PESTAÑAS */}
      <div className="flex bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
        <button onClick={() => setActiveTab('cuentas')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'cuentas' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}>
          💳 Cuentas Corrientes Alumnos
        </button>
        <button onClick={() => setActiveTab('egresos')} className={`flex-1 py-3 font-bold text-sm border-l border-r border-[#30363d] transition-colors ${activeTab === 'egresos' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}>
          💸 Egresos y Centros de Costo
        </button>
        <button onClick={() => setActiveTab('flujo')} className={`flex-1 py-3 font-bold text-sm border-r border-[#30363d] transition-colors ${activeTab === 'flujo' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}>
          📊 Flujo de Caja Unificado
        </button>
        <button onClick={() => setActiveTab('kpis')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'kpis' ? 'bg-[#289E9D] text-white' : 'text-gray-400 hover:bg-[#161b22]'}`}>
          📈 Indicadores Ejecutivos (KPI)
        </button>
      </div>

      {/* PESTAÑA 1: CUENTAS CORRIENTES ALUMNOS */}
      {activeTab === 'cuentas' && (
        <div className="space-y-4">
          <div className="bg-[#0d1117] border border-[#30363d] p-4 rounded-xl flex justify-between items-center">
            <input 
              type="text" 
              placeholder="Buscar por alumno o apoderado..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] text-white text-sm rounded-lg p-2.5 outline-none w-80 focus:border-[#289E9D]"
            />
            <span className="text-xs text-gray-400 font-semibold">Mostrando {cuentasFiltradas.length} alumnos</span>
          </div>

          <div className="space-y-3">
            {cuentasFiltradas.map(c => (
              <div key={c.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <img src={c.foto_base64 || 'https://via.placeholder.com/150'} alt="img" className="w-12 h-12 rounded-full object-cover border border-[#30363d]" />
                    <div>
                      <h3 className="text-base font-bold text-white">{c.nombre}</h3>
                      <p className="text-xs text-gray-400">Apoderado: {c.tutores?.nombre_completo || 'Sin registrar'} ({c.tutores?.telefono || 'N/A'})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 font-bold uppercase block">Saldo Pendiente</span>
                      <span className={`text-lg font-black ${c.saldoPendiente > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ${Number(c.saldoPendiente).toLocaleString('es-CL')}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.saldoPendiente <= 0 ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`}>
                      {c.saldoPendiente <= 0 ? '🟢 Al Día' : '🔴 Deuda Vencida'}
                    </span>
                  </div>
                </div>

                {/* TABLA DE COBROS DEL ALUMNO */}
                {c.cobros.length > 0 && (
                  <div className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden text-xs">
                    <table className="w-full text-left text-gray-300">
                      <thead className="bg-[#1C212D] text-gray-400 uppercase font-bold border-b border-[#30363d]">
                        <tr>
                          <th className="p-3">Concepto</th>
                          <th className="p-3">Monto</th>
                          <th className="p-3">Pagado</th>
                          <th className="p-3">Vencimiento</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#30363d]">
                        {c.cobros.map((cob: any) => (
                          <tr key={cob.id} className="hover:bg-[#1C212D]/40">
                            <td className="p-3 font-semibold text-white">{cob.concepto}</td>
                            <td className="p-3 font-bold">${Number(cob.monto).toLocaleString('es-CL')}</td>
                            <td className="p-3 text-green-400 font-bold">${Number(cob.monto_pagado).toLocaleString('es-CL')}</td>
                            <td className="p-3 text-gray-400">{cob.fecha_vencimiento || 'N/A'}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${cob.estado === 'Pagado' ? 'bg-green-900/40 text-green-400' : cob.estado === 'Parcial' ? 'bg-orange-900/40 text-orange-400' : 'bg-red-900/40 text-red-400'}`}>
                                {cob.estado}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {cob.estado !== 'Pagado' && (
                                <button onClick={() => { setModalAbono(cob); setFormAbono({ ...formAbono, monto_abono: Number(cob.monto) - Number(cob.monto_pagado) }); }} className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-3 py-1 rounded font-bold transition-colors">
                                  💳 Registrar Pago
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: EGRESOS Y CENTROS DE COSTO */}
      {activeTab === 'egresos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-[#0d1117] border border-[#30363d] p-4 rounded-xl">
            <h3 className="text-lg font-bold text-white">Registro de Egresos y Gastos Operativos</h3>
            <button onClick={() => setModalNuevoEgreso(true)} className="bg-red-900/40 border border-red-500/40 hover:bg-red-900/60 text-red-300 px-4 py-2 rounded-lg font-bold text-sm">
              + Registrar Nuevo Egreso
            </button>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#161b22] text-xs uppercase font-bold text-gray-400 border-b border-[#30363d]">
                <tr>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Concepto / Detalle</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Centro de Costo</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {egresos.map(e => (
                  <tr key={e.id} className="hover:bg-[#161b22]/50">
                    <td className="p-4 text-gray-400">{e.fecha_gasto}</td>
                    <td className="p-4 font-bold text-white">{e.concepto}</td>
                    <td className="p-4"><span className="bg-[#161b22] border border-[#30363d] px-2.5 py-1 rounded text-xs text-gray-300">{e.categoria_gasto}</span></td>
                    <td className="p-4"><span className="bg-purple-900/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded text-xs font-bold">{e.centro_costo}</span></td>
                    <td className="p-4 font-black text-red-400">${Number(e.monto).toLocaleString('es-CL')}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleEliminarEgreso(e.id)} className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-950/40 p-1.5 rounded border border-red-500/30">
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: FLUJO DE CAJA UNIFICADO */}
      {activeTab === 'flujo' && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#30363d]">
            <h3 className="text-lg font-bold text-white">Libro Diario de Entradas y Salidas de Caja</h3>
          </div>
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#161b22] text-xs uppercase font-bold text-gray-400 border-b border-[#30363d]">
              <tr>
                <th className="p-4">Fecha</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Descripción del Movimiento</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Método</th>
                <th className="p-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d]">
              {flujoCaja.map((m, idx) => (
                <tr key={idx} className="hover:bg-[#161b22]/50">
                  <td className="p-4 text-gray-400 text-xs">{m.fecha ? new Date(m.fecha).toLocaleDateString('es-CL') : 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded font-bold text-xs ${m.tipo === 'Ingreso' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {m.tipo === 'Ingreso' ? '📈 INGRESO' : '📉 EGRESO'}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-white">{m.concepto}</td>
                  <td className="p-4 text-xs text-gray-400">{m.categoria}</td>
                  <td className="p-4 text-xs text-gray-400">{m.metodo || 'Efectivo'}</td>
                  <td className={`p-4 text-right font-black ${m.tipo === 'Ingreso' ? 'text-green-400' : 'text-red-400'}`}>
                    {m.tipo === 'Ingreso' ? '+' : '-'}${Number(m.monto).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PESTAÑA 4: KPIS EJECUTIVOS */}
      {activeTab === 'kpis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
            <h3 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">🎯 Salud Financiera y Morosidad</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Tasa de Morosidad Actual:</span>
                <span className="font-bold text-orange-400">{resumen?.tasaMorosidad}%</span>
              </div>
              <div className="w-full bg-[#161b22] h-3 rounded-full overflow-hidden border border-[#30363d]">
                <div className="bg-orange-500 h-full transition-all" style={{ width: `${resumen?.tasaMorosidad || 0}%` }}></div>
              </div>
              <p className="text-xs text-gray-500">Un nivel de morosidad inferior al 15% se considera saludable para academias deportivas.</p>
            </div>
          </div>

          <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
            <h3 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">💡 Eficiencia de Recaudación</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Total Facturado (Devengado):</span><span className="font-bold text-white">${((resumen?.totalIngresosReales || 0) + (resumen?.totalPorCobrar || 0)).toLocaleString('es-CL')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Cobrado Efectivo:</span><span className="font-bold text-green-400">${Number(resumen?.totalIngresosReales || 0).toLocaleString('es-CL')}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Pendiente de Cobro:</span><span className="font-bold text-orange-400">${Number(resumen?.totalPorCobrar || 0).toLocaleString('es-CL')}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: REGISTRAR ABONO / PAGO */}
      {modalAbono && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">💳 Registrar Pago de Cobro</h2>
            <p className="text-xs text-gray-400">{modalAbono.concepto}</p>

            <form onSubmit={handleAbonarPago} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Monto a Abonar ($)</label>
                <input type="number" value={formAbono.monto_abono} onChange={e => setFormAbono({ ...formAbono, monto_abono: Number(e.target.value) })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white font-bold outline-none focus:border-[#289E9D]" required />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Método de Pago</label>
                <select value={formAbono.metodo_pago} onChange={e => setFormAbono({ ...formAbono, metodo_pago: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white font-semibold outline-none">
                  <option value="Transferencia">🏦 Transferencia Bancaria</option>
                  <option value="Efectivo">💵 Efectivo en Cancha</option>
                  <option value="Tarjeta">💳 Tarjeta Débito / Crédito</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Observaciones / N° Comprobante</label>
                <input type="text" placeholder="Ej: Transf #994812" value={formAbono.observaciones} onChange={e => setFormAbono({ ...formAbono, observaciones: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalAbono(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-5 py-2 rounded-lg font-bold">Confirmar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASIGNAR NUEVO COBRO */}
      {modalNuevoCobro && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">➕ Asignar Nuevo Cobro Manual</h2>

            <form onSubmit={handleCrearCobro} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Seleccionar Alumno *</label>
                <select value={formCobro.jugador_id} onChange={e => setFormCobro({ ...formCobro, jugador_id: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]" required>
                  <option value="">-- Seleccionar Alumno --</option>
                  {cuentas.map(j => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Concepto *</label>
                <input type="text" placeholder="Ej: Cuota Torneo Apertura 2026" value={formCobro.concepto} onChange={e => setFormCobro({ ...formCobro, concepto: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Monto ($) *</label>
                  <input type="number" placeholder="Ej: 30000" value={formCobro.monto} onChange={e => setFormCobro({ ...formCobro, monto: Number(e.target.value) })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none focus:border-[#289E9D]" required />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Vencimiento *</label>
                  <input type="date" value={formCobro.fecha_vencimiento} onChange={e => setFormCobro({ ...formCobro, fecha_vencimiento: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" required />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalNuevoCobro(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-[#289E9D] text-white px-5 py-2 rounded-lg font-bold">Crear Cobro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTRAR EGRESO */}
      {modalNuevoEgreso && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold text-white border-b border-[#30363d] pb-2">💸 Registrar Egreso / Gasto</h2>

            <form onSubmit={handleCrearEgreso} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Concepto o Proveedor *</label>
                <input type="text" placeholder="Ej: Arriendo Cancha Sintética Mayo" value={formEgreso.concepto} onChange={e => setFormEgreso({ ...formEgreso, concepto: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Categoría</label>
                  <select value={formEgreso.categoria_gasto} onChange={e => setFormEgreso({ ...formEgreso, categoria_gasto: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none">
                    <option value="Arriendo Canchas">⚽ Arriendo Canchas</option>
                    <option value="Sueldos/Profesores">👨‍🏫 Sueldos Profesores</option>
                    <option value="Arbitraje">🚩 Arbitraje / Torneos</option>
                    <option value="Indumentaria/Taller">🧵 Taller Confección</option>
                    <option value="Equipamiento">⚽ Balones e Insumos</option>
                    <option value="Otros">📦 Otros Gastos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Centro de Costo</label>
                  <select value={formEgreso.centro_costo} onChange={e => setFormEgreso({ ...formEgreso, centro_costo: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none">
                    <option value="Fútbol">Fútbol</option>
                    <option value="Básquetbol">Básquetbol</option>
                    <option value="Tenis">Tenis</option>
                    <option value="General">General / Sede</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Monto Gasto ($) *</label>
                  <input type="number" placeholder="Ej: 50000" value={formEgreso.monto} onChange={e => setFormEgreso({ ...formEgreso, monto: Number(e.target.value) })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" required />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Fecha Gasto</label>
                  <input type="date" value={formEgreso.fecha_gasto} onChange={e => setFormEgreso({ ...formEgreso, fecha_gasto: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 text-white outline-none" required />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalNuevoEgreso(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={procesando} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg font-bold">Guardar Egreso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;
