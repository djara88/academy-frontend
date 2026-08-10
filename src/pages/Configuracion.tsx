// src/pages/Configuracion.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Configuracion: React.FC = () => {
  const navigate = useNavigate();

  const modulos = [
    { 
      titulo: 'Perfil y Horarios', 
      desc: 'Días, horas y lugar de la escuela', 
      icono: '🏟️', 
      ruta: '/configuracion/perfil', 
      bg: 'bg-blue-900/20', 
      border: 'border-blue-500/30' 
    },
    { 
      titulo: 'Finanzas y Recaudación', 
      desc: 'Control de pagos e ingresos', 
      icono: '💳', 
      ruta: '/finanzas', 
      bg: 'bg-green-900/20', 
      border: 'border-green-500/30' 
    },
    { 
      titulo: 'Términos PDF', 
      desc: 'Reglamento y condiciones', 
      icono: '⚖️', 
      ruta: '/terminos', 
      bg: 'bg-orange-900/20', 
      border: 'border-orange-500/30' 
    },
    { 
      titulo: 'Conexión WhatsApp', 
      desc: 'Estado del Bot y escaneo QR', 
      icono: '📱', 
      ruta: '/whatsapp', 
      bg: 'bg-emerald-900/20', 
      border: 'border-emerald-500/30' 
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-[#e6edf3]">⚙️ Configuración de Academia</h1>
        <p className="text-sm text-gray-400">Administra todos los parámetros y conexiones de tu escuela.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {modulos.map((m, i) => (
          <div 
            key={i} 
            onClick={() => navigate(m.ruta)} 
            className={`cursor-pointer p-8 rounded-2xl border transition-all hover:scale-105 hover:shadow-2xl flex flex-col items-center text-center ${m.bg} ${m.border}`}
          >
            <span className="text-6xl mb-4 drop-shadow-md">{m.icono}</span>
            <h3 className="text-lg font-bold text-white mb-2">{m.titulo}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Configuracion;
