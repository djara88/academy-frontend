import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';

const WhatsApp: React.FC = () => {
  const { user } = useAuth();
  const academyName = getAcademyName(user?.nombre_academia);

  const [estado, setEstado] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [mensajeError, setMensajeError] = useState<string>('');

  const checkWhatsAppStatus = async () => {
    if (!user?.academia_id) return;

    try {
      setEstado('loading');
      setMensajeError('');

      const response = await api.get(`/api/whatsapp/estado/${user.academia_id}`);
      const data = response.data;

      if (data.conectado) {
        setEstado('connected');
      } else if (data.qrCode) {
        const qrImage = data.qrCode.startsWith('data:image/png;base64,')
          ? data.qrCode
          : `data:image/png;base64,${data.qrCode}`;

        setQrCode(qrImage);
        setEstado('qr');
      } else {
        setEstado('error');
        setMensajeError('La conexión todavía no está disponible. Intenta actualizar en unos segundos.');
      }
    } catch (error) {
      console.error('Error al obtener estado de WhatsApp:', error);
      setEstado('error');
      setMensajeError('No fue posible verificar la conexión de WhatsApp. Intenta nuevamente.');
    }
  };

  useEffect(() => {
    checkWhatsAppStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.academia_id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#e6edf3]">📱 WhatsApp de {academyName}</h1>
        <button
          onClick={checkWhatsAppStatus}
          className="bg-[#21262d] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#30363d] border border-[#30363d] flex items-center gap-2"
        >
          🔄 Actualizar conexión
        </button>
      </div>

      <div className="bg-[#0d1117] p-8 rounded-xl border border-[#30363d] shadow-lg text-center flex flex-col items-center min-h-[400px] justify-center">
        {estado === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#289E9D] mx-auto"></div>
            <p className="text-[#289E9D] font-bold animate-pulse">Verificando conexión de WhatsApp...</p>
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg max-w-md">
            <span className="text-4xl block mb-4">⚠️</span>
            <h3 className="text-red-400 font-bold mb-2">WhatsApp no disponible</h3>
            <p className="text-gray-300 text-sm mb-4">{mensajeError}</p>
            <button
              onClick={checkWhatsAppStatus}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold"
            >
              Reintentar
            </button>
          </div>
        )}

        {estado === 'qr' && (
          <div className="space-y-6 flex flex-col items-center">
            <h2 className="text-xl font-bold text-white">Conecta el WhatsApp de {academyName}</h2>
            <p className="text-gray-400 text-sm max-w-md">
              Abre WhatsApp en tu celular, entra a <strong>Dispositivos vinculados</strong> y escanea este código.
            </p>

            <div className="bg-white p-4 rounded-xl shadow-2xl">
              <img src={qrCode} alt="Código QR para conectar WhatsApp" className="w-64 h-64 object-contain" />
            </div>

            <p className="text-xs text-gray-500">
              Si el código vence, pulsa “Actualizar conexión” para obtener uno nuevo.
            </p>
          </div>
        )}

        {estado === 'connected' && (
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-24 h-24 bg-green-900/30 rounded-full flex items-center justify-center border-4 border-green-500 mb-4">
              <span className="text-5xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-green-400">WhatsApp conectado</h2>
            <p className="text-gray-300">
              {academyName} puede enviar las notificaciones de WhatsApp habilitadas en Lestra.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsApp;
