// src/pages/Configuracion.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';

const Configuracion: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const academyName = getAcademyName(user?.nombre_academia);

  const modulos = [
    { titulo: 'Profesores y Accesos', desc: 'Cupos, credenciales y categorías asignadas', icono: '🧑‍🏫', ruta: '/profesores', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
    { titulo: 'Perfil y Horarios', desc: `Días, horas y sede de ${academyName}`, icono: '🏟️', ruta: '/configuracion/perfil', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { titulo: 'Sedes y Ramas', desc: 'Gestiona ubicaciones y disciplinas deportivas de la academia', icono: '🏢', ruta: '/configuracion/estructura', bg: 'bg-teal-900/20', border: 'border-teal-500/30' },
    { titulo: 'Inscripciones Multideporte', desc: 'Inscribe al mismo alumno en otra disciplina sin duplicar su ficha ni su apoderado', icono: '🔄', ruta: '/inscripciones', bg: 'bg-violet-900/20', border: 'border-violet-500/30' },
    { titulo: 'Apoderados PRO', desc: 'Complemento familiar para toda la academia: portal, chat, pagos, privacidad y solicitudes deportivas', icono: '👨‍👩‍👧', ruta: '/apoderados-pro', bg: 'bg-fuchsia-900/20', border: 'border-fuchsia-500/30' },
    { titulo: 'Uniformes e Inventario', desc: 'Catálogo de prendas, tallas y entregas', icono: '👕', ruta: '/uniformes', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { titulo: 'Finanzas y Recaudación', desc: 'Métodos y datos para recibir pagos', icono: '💳', ruta: '/configuracion/finanzas', bg: 'bg-green-900/20', border: 'border-green-500/30' },
    { titulo: 'Términos PDF', desc: 'Reglamento y condiciones', icono: '⚖️', ruta: '/terminos', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    { titulo: 'Conexión WhatsApp', desc: 'Estado del Bot y escaneo QR', icono: '📱', ruta: '/whatsapp', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { titulo: 'Importar base existente', desc: 'Carga Excel o CSV, mapea columnas, valida duplicados y migra alumnos sin reingresarlos uno a uno', icono: '📥', ruta: '/importacion', bg: 'bg-sky-900/20', border: 'border-sky-500/30' }
  ];

  return <div className="max-w-5xl mx-auto space-y-6 pb-10">
    <div><h1 className="text-3xl font-bold text-[#e6edf3]">⚙️ Configuración de {academyName}</h1><p className="text-sm text-gray-400">Administra todos los parámetros y herramientas de {academyName}.</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{modulos.map((m, i) => <div key={i} onClick={() => navigate(m.ruta)} className={`cursor-pointer p-8 rounded-2xl border transition-all hover:scale-105 hover:shadow-2xl flex flex-col items-center text-center ${m.bg} ${m.border}`}><span className="text-6xl mb-4 drop-shadow-md">{m.icono}</span><h3 className="text-lg font-bold text-white mb-2">{m.titulo}</h3><p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p></div>)}</div>
  </div>;
};

export default Configuracion;
