import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import PublicPageEditor from '../components/PublicPageEditor';

type Branch = { id:string; nombre:string; disciplina:string; sede_id:string; sedes?:{ id:string; nombre:string } | null };
type UsageItem = { used:number; limit:number|null };
type PlanSnapshot = {
  entitlements:{plan:{name:string;code:string;trial:boolean};features:string[];limits:{players:number|null;professors:number|null;sites:number|null;branches:number|null}};
  usage:{players:UsageItem;professors:UsageItem;sites:UsageItem;branches:UsageItem};
  structure:{requiresChoice:boolean;primaryBranchId?:string|null};
  onboarding:Array<{key:string;label:string;done:boolean}>;
};

const usageLabel:Record<string,string>={players:'Alumnos',professors:'Profesores',sites:'Sedes',branches:'Ramas'};
const percent=(item:UsageItem)=>item.limit?Math.min(100,Math.round((item.used/item.limit)*100)):0;

const Configuracion: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);
  const [branches,setBranches] = useState<Branch[]>([]);
  const [primaryBranchId,setPrimaryBranchId] = useState('');
  const [savingPrimary,setSavingPrimary] = useState(false);
  const [plan,setPlan]=useState<PlanSnapshot|null>(null);

  const load = async () => {
    try {
      const [primaryResponse,planResponse]=await Promise.all([
        api.get('/api/academias/rama-principal'),
        api.get('/api/academias/plan-operativo'),
      ]);
      setBranches(primaryResponse.data.data?.ramas || []);
      setPrimaryBranchId(primaryResponse.data.data?.rama_principal_id || '');
      setPlan(planResponse.data.data || null);
    } catch (error) {
      console.error('No fue posible cargar la configuración:', error);
    }
  };
  useEffect(() => { void load(); }, []);

  const savePrimary = async () => {
    if (!primaryBranchId) return;
    setSavingPrimary(true);
    try {
      const response = await api.put('/api/academias/rama-principal', { rama_id: primaryBranchId });
      const branch = response.data.data?.branch;
      await load();
      await notify(`Rama principal actualizada${branch?.nombre ? ` a ${branch.nombre}` : ''}.`, { title: academyName });
    } catch (error:any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar la rama principal.', { title: academyName });
    } finally { setSavingPrimary(false); }
  };

  const completed=useMemo(()=>plan?.onboarding.filter((item)=>item.done).length||0,[plan]);
  const modulos = [
    { titulo: 'Amistosos', desc: 'Programa partidos, controles, exhibiciones o competencias amistosas', icono: '🤝', ruta: '/amistosos', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { titulo: 'Profesores y accesos', desc: 'Administra cupos, accesos y categorías asignadas', icono: '🧑‍🏫', ruta: '/profesores', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30' },
    { titulo: 'Perfil y horarios', desc: `Datos generales y horarios de ${academyName}`, icono: '🏟️', ruta: '/configuracion/perfil', bg: 'bg-blue-900/20', border: 'border-blue-500/30' },
    { titulo: 'Sedes y ramas', desc: 'Administra ubicaciones y disciplinas deportivas', icono: '🏢', ruta: '/configuracion/estructura', bg: 'bg-teal-900/20', border: 'border-teal-500/30' },
    { titulo: 'Categorías', desc: 'Crea y organiza categorías dentro de cada rama', icono: '🧩', ruta: '/configuracion/estructura?modo=categorias', bg: 'bg-lime-900/20', border: 'border-lime-500/30' },
    { titulo: 'Inscripciones multideporte', desc: 'Inscribe al mismo alumno en otra disciplina sin duplicar su ficha', icono: '🔄', ruta: '/inscripciones', bg: 'bg-violet-900/20', border: 'border-violet-500/30' },
    { titulo: 'Apoderados PRO', desc: 'Portal familiar, chat, pagos, privacidad y solicitudes deportivas', icono: '👨‍👩‍👧', ruta: '/apoderados-pro', bg: 'bg-fuchsia-900/20', border: 'border-fuchsia-500/30' },
    { titulo: 'Uniformes e inventario', desc: 'Catálogo, tallas, pedidos y entregas', icono: '👕', ruta: '/uniformes', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    { titulo: 'Finanzas y recaudación', desc: 'Configura los medios de pago de la academia', icono: '💳', ruta: '/configuracion/finanzas', bg: 'bg-green-900/20', border: 'border-green-500/30' },
    { titulo: 'Términos de matrícula', desc: 'Reglamento y condiciones que aceptarán los apoderados', icono: '⚖️', ruta: '/terminos', bg: 'bg-orange-900/20', border: 'border-orange-500/30' },
    { titulo: 'WhatsApp', desc: 'Vincula y revisa el estado de la conexión', icono: '📱', ruta: '/whatsapp', bg: 'bg-emerald-900/20', border: 'border-emerald-500/30' },
    { titulo: 'Importar alumnos', desc: 'Carga Excel o CSV y revisa duplicados antes de importar', icono: '📥', ruta: '/importacion', bg: 'bg-sky-900/20', border: 'border-sky-500/30' },
  ];

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <div>
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Configuración</p>
      <h1 className="mt-1 text-3xl font-black text-[#e6edf3]">{academyName}</h1>
      <p className="text-sm text-gray-400">Administra la estructura, el plan y las preferencias de tu academia.</p>
    </div>

    {plan?<section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.14),transparent_38%),#151b25] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-black uppercase text-[#70e4df]">Plan {plan.entitlements.plan.name}</p><h2 className="mt-1 text-2xl font-black text-white">Uso del plan</h2><p className="mt-1 text-sm text-[#8995a4]">Revisa los cupos disponibles para alumnos, profesores, sedes y ramas.</p></div>
        <button onClick={()=>navigate('/suscripcion')} className="rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 py-3 text-sm font-black text-[#70e4df]">Ver planes</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(plan.usage).map(([key,item])=><div key={key} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-center justify-between"><p className="text-xs font-black text-[#aab4c1]">{usageLabel[key]}</p><p className="text-sm font-black text-white">{item.used}/{item.limit??'∞'}</p></div>{item.limit?<div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${percent(item)>=90?'bg-amber-400':'bg-[#289E9D]'}`} style={{width:`${percent(item)}%`}}/></div>:<p className="mt-3 text-xs font-bold text-emerald-300">Sin límite</p>}</div>)}</div>
      {plan.structure.requiresChoice?<div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"><b>Acción requerida:</b> selecciona la rama principal para continuar con tu plan actual.</div>:null}
    </section>:null}

    {plan?<section className="rounded-2xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
      <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-violet-300">Puesta en marcha</p><h2 className="mt-1 text-xl font-black text-white">Estado de configuración · {completed}/{plan.onboarding.length}</h2></div><span className="text-2xl">{completed===plan.onboarding.length?'✅':'🚀'}</span></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">{plan.onboarding.map((item)=><div key={item.key} className={`flex items-center gap-3 rounded-xl border p-3 ${item.done?'border-emerald-400/15 bg-emerald-500/5':'border-white/10 bg-[#0d1117]'}`}><span>{item.done?'✅':'○'}</span><span className={`text-sm font-bold ${item.done?'text-emerald-200':'text-[#aab4c1]'}`}>{item.label}</span></div>)}</div>
    </section>:null}

    <section className="rounded-2xl border border-[#289E9D]/30 bg-[linear-gradient(135deg,rgba(40,158,157,.10),rgba(13,17,23,.85))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Organización deportiva</p><h2 className="mt-1 text-xl font-black text-white">Rama principal</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#8b949e]">Selecciona la rama principal de la academia. Si tu plan limita las ramas activas, las demás se conservarán sin eliminarse.</p></div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"><select value={primaryBranchId} onChange={(event)=>setPrimaryBranchId(event.target.value)} className="min-h-11 min-w-[260px] rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-[#289E9D]"><option value="">Selecciona rama principal</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select><button disabled={!primaryBranchId || savingPrimary} onClick={()=>void savePrimary()} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{savingPrimary ? 'Guardando...' : 'Guardar rama principal'}</button></div>
      </div>
    </section>

    <PublicPageEditor academyName={academyName}/>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{modulos.map((m) => <div key={m.titulo} onClick={() => navigate(m.ruta)} className={`cursor-pointer rounded-2xl border p-7 transition-all hover:-translate-y-1 hover:shadow-2xl ${m.bg} ${m.border}`}><span className="text-4xl drop-shadow-md">{m.icono}</span><h3 className="mt-4 text-lg font-black text-white">{m.titulo}</h3><p className="mt-2 text-xs leading-relaxed text-gray-400">{m.desc}</p></div>)}</div>
  </div>;
};

export default Configuracion;
