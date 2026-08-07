// src/pages/FinanzasConfig.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const FinanzasConfig: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string, tipo: 'exito' | 'error' } | null>(null);

  const [config, setConfig] = useState({
    acepta_efectivo: true,
    acepta_transferencia: false,
    acepta_pago_online: false,
    transferencia_banco: '',
    transferencia_tipo_cuenta: '',
    transferencia_numero: '',
    transferencia_rut: '',
    transferencia_correo: '',
    link_pago_online: ''
  });

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const response = await api.get('/api/finanzas/configuracion');
      if (response.data.data) {
        // Combinamos lo que venga de BD con el estado inicial para evitar nulos
        setConfig(prev => ({ ...prev, ...response.data.data }));
      }
    } catch (error) {
      console.error('Error cargando configuración financiera', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      await api.put('/api/finanzas/configuracion', config);
      setMensaje({ texto: '¡Configuración guardada y encriptada con éxito!', tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: 'Hubo un error al guardar los datos.', tipo: 'error' });
    } finally {
      setGuardando(false);
      // Borrar mensaje después de 3 segundos
      setTimeout(() => setMensaje(null), 3000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setConfig({ ...config, [name]: checked });
    } else {
      setConfig({ ...config, [name]: value });
    }
  };

  if (loading) return <div className="text-center text-[#289E9D] mt-10">Cargando módulo financiero...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#e6edf3]">💳 Configuración de Recaudación</h1>
      </div>

      {/* SELLO DE CONFIANZA */}
      <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl flex items-start gap-4">
        <span className="text-3xl">🔒</span>
        <div>
          <h3 className="text-blue-400 font-bold">Máxima Seguridad de Datos (Ley 19.628)</h3>
          <p className="text-gray-300 text-sm mt-1">
            Los datos ingresados aquí están <strong>encriptados y protegidos</strong>. AcademiaPro nunca tendrá acceso a tus fondos, no cobramos comisiones y no compartiremos tu información financiera con terceros. Solo se usarán de forma automatizada por el Bot de WhatsApp para indicar a los apoderados cómo pagar.
          </p>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">
        
        {/* EFECTIVO */}
        <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">💵 Pago en Efectivo</h3>
            <p className="text-gray-400 text-sm">Permite a los apoderados pagar presencialmente en la academia.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" name="acepta_efectivo" checked={config.acepta_efectivo} onChange={handleChange} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#289E9D]"></div>
          </label>
        </div>

        {/* TRANSFERENCIA */}
        <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🏦 Transferencia Bancaria</h3>
              <p className="text-gray-400 text-sm">El Bot de WhatsApp entregará estos datos automáticamente.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="acepta_transferencia" checked={config.acepta_transferencia} onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#289E9D]"></div>
            </label>
          </div>

          {config.acepta_transferencia && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Banco</label>
                <input type="text" name="transferencia_banco" value={config.transferencia_banco} onChange={handleChange} placeholder="Ej: Banco Estado" className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tipo de Cuenta</label>
                <select name="transferencia_tipo_cuenta" value={config.transferencia_tipo_cuenta} onChange={handleChange} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white">
                  <option value="">Seleccionar...</option>
                  <option value="Cuenta Corriente">Cuenta Corriente</option>
                  <option value="Cuenta Vista">Cuenta Vista</option>
                  <option value="Cuenta RUT">Cuenta RUT</option>
                  <option value="Chequera Electrónica">Chequera Electrónica</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">N° de Cuenta</label>
                <input type="text" name="transferencia_numero" value={config.transferencia_numero} onChange={handleChange} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">RUT</label>
                <input type="text" name="transferencia_rut" value={config.transferencia_rut} onChange={handleChange} placeholder="Ej: 12.345.678-9" className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Correo Electrónico (Opcional)</label>
                <input type="email" name="transferencia_correo" value={config.transferencia_correo} onChange={handleChange} placeholder="pagos@miacademia.cl" className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* PAGO ONLINE */}
        <div className="bg-[#0d1117] border border-[#30363d] p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">🌐 Pago Online (Tarjetas)</h3>
              <p className="text-gray-400 text-sm">Recibe pagos con Tarjeta de Crédito/Débito vía Mercado Pago, Flow, etc.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="acepta_pago_online" checked={config.acepta_pago_online} onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#289E9D]"></div>
            </label>
          </div>

          {config.acepta_pago_online && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-400 mb-1">Tu Link Universal de Pagos</label>
              <input type="url" name="link_pago_online" value={config.link_pago_online} onChange={handleChange} placeholder="https://link.mercadopago.cl/..." className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white mb-2" />
              <p className="text-xs text-gray-500 italic">Genera este link en la plataforma de tu pasarela de pagos (ej. MercadoPago) y pégalo aquí. El Bot lo enviará para que el apoderado digite el monto a pagar.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          {mensaje && (
            <div className={`px-4 py-2 rounded font-bold text-sm ${mensaje.tipo === 'exito' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {mensaje.texto}
            </div>
          )}
          <button type="submit" disabled={guardando} className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-8 py-3 rounded-lg font-bold transition-colors ml-auto">
            {guardando ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FinanzasConfig;
