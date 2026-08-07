import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';

const WhatsApp: React.FC = () => {
  const { user } = useAuth();
  
  const [estado, setEstado] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [mensajeError, setMensajeError] = useState<string>('');
  
  const checkWhatsAppStatus = async () => {
    if (!user?.academia_id) return;
    
    try {
      setEstado('loading');
      setMensajeError('');
      
      // Llamamos a tu backend principal, que a su vez hablará con Evolution API
      const response = await api.get(`/api/whatsapp/estado/${user.academia_id}`);
      const data = response.data;
      
      if (data.conectado) {
        setEstado('connected');
      } else if (data.qrCode) {
        // Evolution API devuelve el QR en formato base64
        // Asegurarnos de que tenga el prefijo correcto para que la etiqueta <img> lo lea
        const qrImage = data.qrCode.startsWith('data:image/png;base64,') 
          ? data.qrCode 
          : `data:image/png;base64,${data.qrCode}`;
          
        setQrCode(qrImage);
        setEstado('qr');
      } else {
        setEstado('error');
        setMensajeError('El servidor está iniciando, intenta actualizar en unos segundos.');
      }
    } catch (error: any) {
      console.error('Error al obtener estado de WhatsApp:', error);
      setEstado('error');
      setMensajeError(error.response?.data?.error || 'Error al conectar con el servidor de mensajes.');
    }
  };

  // Revisar el estado apenas entra a la pantalla
  useEffect(() => {
    checkWhatsAppStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.academia_id]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#e6edf3]">📱 Conexión a WhatsApp</h1>
        <button 
          onClick={checkWhatsAppStatus}
          className="bg-[#21262d] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#30363d] border border-[#30363d] flex items-center gap-2"
        >
          🔄 Actualizar Estado
        </button>
      </div>

      <div className="bg-[#0d1117] p-8 rounded-xl border border-[#30363d] shadow-lg text-center flex flex-col items-center min-h-[400px] justify-center">
        
        {estado === 'loading' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#289E9D] mx-auto"></div>
            <p className="text-[#289E9D] font-bold animate-pulse">Conectando con Evolution API...</p>
          </div>
        )}

        {estado === 'error' && (
          <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg max-w-md">
            <span className="text-4xl block mb-4">⚠️</span>
            <h3 className="text-red-400 font-bold mb-2">Error de conexión</h3>
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
            <h2 className="text-xl font-bold text-white">Escanea para conectar tu Academia</h2>
            <p className="text-gray-400 text-sm max-w-md">
              Abre WhatsApp en tu celular, ve a <strong>Dispositivos Vinculados</strong> y escanea este código.
            </p>
            
            <div className="bg-white p-4 rounded-xl shadow-2xl">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
            </div>
            
            <p className="text-xs text-gray-500">
              * Si el código no funciona, presiona "Actualizar Estado" para generar uno nuevo.
            </p>
          </div>
        )}

        {estado === 'connected' && (
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-24 h-24 bg-green-900/30 rounded-full flex items-center justify-center border-4 border-green-500 mb-4">
              <span className="text-5xl">✅</span>
            </div>
            <h2 className="text-2xl font-bold text-green-400">¡WhatsApp Conectado!</h2>
            <p className="text-gray-300">
              Tu academia está lista para enviar notificaciones automáticas a los apoderados y jugadores.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default WhatsApp;
