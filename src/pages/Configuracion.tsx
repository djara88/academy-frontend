// src/pages/Configuracion.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch = { id:string; nombre:string; disciplina:string; sede_id:string; sedes?:{ id:string; nombre:string } | null };

const Configuracion: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);
  const [branches,setBranches] = useState<Branch[]>([]);
  const [primaryBranchId,setPrimaryBranchId] = useState('');
  const [savingPrimary,setSavingPrimary] = useState(false);

  useEffect(() => {
    const loadPrimary = async () => {
      try {
        const response = await api.get('/api/academias/rama-principal');
        setBranches(response.data.data?.ramas || []);
        setPrimaryBranchId(response.data.data?.rama_principal_id || '');
      } catch (error) {
        console.error('No fue posible cargar la rama principal:', error);
      }
    };
    void loadPrimary();
  }, []);

  const savePrimary = async () => {
    if (!primaryBranchId) return;
    setSavingPrimary(true);
    try {
      const response = await api.put('/api/academias/rama-principal', { rama_id: primaryBranchId });
      const branch = response.data.data?.branch;
      await notify(`Rama principal actualizada${branch?.nombre ? ` a ${branch.nombre}` : ''}.`, { title: academyName });
    } catch (error:any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar la rama principal.', { title: academyName });
    } finally {
      setSavingPrimary(false);
    }
  };

  const modulos = [
    { titulo: 'Profesores y Accesos', desc: 'Cupos, credenciales y categorías asignadas por rama', icono: '🧑‍🏫', ruta: '/profesores', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
    { titulo: 'Perfil y Horarios', desc: `Datos generales y horarios de ${academyName}`, icono: '🏟️', ruta: '/configuracion/perfil', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { titulo: 'Sedes y Ramas', desc: 'Gestiona ubicaciones, disciplinas, categorías y criterios deportivos', icono: '🏢', ruta: '/configuracion/estructura', bg: 'bg-teal-900/20', border: 'border-teal-500/30' },
    { titulo: 'Inscripciones Multideporte', desc: 'Inscribe al mismo alumno en otra disciplina sin duplicar su ficha ni su apoderado', icono: '🔄', ruta: '/inscripciones', bg: 'bg-violet-900/20', border: 'border-violet-500/30' },
    { titulo: 'Apoderados PRO', desc: 'Complemento familiar para toda la academia: portal, chat, pagos, privacidad y solicitudes deportivas', icono: '👨‍👩‍👧', ruta: '/apoderados-pro', bg: 'bg-fuchsia-900/20', border: 'border-fuchsia-500/30' },
    { titulo: 'Uniformes e Inventario', desc: 'Catálogo general o específico por rama, tallas y entregas', icono: '👕', ruta: '/uniformes', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { titulo: 'Finanzas y Recaudación', desc: 'Métodos y datos para recibir pagos', icono: '💳', ruta: '/configuracion/finanzas', bg: 'bg-green-900/20', border: 'border-green-500/30' },
    { titulo: 'Términos PDF', desc: 'Reglamento y condiciones', icono: '⚖️', ruta: '/terminos', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    { titulo: 'Conexión WhatsApp', desc: 'Estado del Bot y escaneo QR', icono: '📱', ruta: '/whatsapp', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { titulo: 'Importar base existente', desc: 'Carga Excel o CSV, mapea columnas, valida duplicados y migra alumnos sin reingresarlos uno a uno', icono: '📥', ruta: '/importacion', bg: 'bg-sky-900/20', border: 'border-sky-500/30' }
  ];

  return <div className="max-w-5xl mx-auto space-y-6 pb-10">
    <div><h1 className="text-3xl font-bold text-[#e6edf3]">⚙️ Configuración de {academyName}</h1><p className="text-sm text-gray-400">Administra todos los parámetros y herramientas de {academyName}.</p></div>

    <section className="rounded-2xl border border-[#289E9D]/30 bg-[linear-gradient(135deg,rgba(40,158,157,.10),rgba(13,17,23,.85))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Contexto por defecto</p><h2 className="mt-1 text-xl font-black text-white">Rama principal de la academia</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#8b949e]">Se usa como rama inicial en los módulos multideporte. No impide trabajar con otras ramas; solo evita que tengas que seleccionarla cada vez.</p></div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <select value={primaryBranchId} onChange={(event)=>setPrimaryBranchId(event.target.value)} className="min-h-11 min-w-[260px] rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-[#289E9D]"><option value="">Selecciona rama principal</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select>
          <button disabled={!primaryBranchId || savingPrimary} onClick={()=>void savePrimary()} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{savingPrimary ? 'Guardando...' : 'Guardar rama principal'}</button>
        </div>
      </div>
    </section>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{modulos.map((m, i) => <div key={i} onClick={() => navigate(m.ruta)} className={`cursor-pointer p-8 rounded-2xl border transition-all hover:scale-105 hover:shadow-2xl flex flex-col items-center text-center ${m.bg} ${m.border}`}><span className="text-6xl mb-4 drop-shadow-md">{m.icono}</span><h3 className="text-lg font-bold text-white mb-2">{m.titulo}</h3><p className="text-xs text-gray-400 leading-relaxed">{m.desc}</p></div>)}</div>
  </div>;
};

export default Configuracion;
