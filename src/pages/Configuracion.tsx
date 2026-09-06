import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import PublicPageEditor from '../components/PublicPageEditor';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
} from '../components/director/DirectorModule';

type Branch = { id:string; nombre:string; disciplina:string; sede_id:string; sedes?:{ id:string; nombre:string } | null };
type UsageItem = { used:number; limit:number|null };
type PlanSnapshot = {
  entitlements:{plan:{name:string;code:string;trial:boolean};features:string[];limits:{players:number|null;professors:number|null;sites:number|null;branches:number|null}};
  usage:{players:UsageItem;professors:UsageItem;sites:UsageItem;branches:UsageItem};
  structure:{requiresChoice:boolean;primaryBranchId?:string|null};
  onboarding:Array<{key:string;label:string;done:boolean}>;
};
type ConfigGroup = 'academia' | 'personas' | 'finanzas' | 'comunicaciones' | 'deporte';
type ConfigModule = { titulo:string; desc:string; icono:string; ruta:string; group:ConfigGroup };

const usageLabel:Record<string,string>={players:'Alumnos',professors:'Profesores',sites:'Sedes',branches:'Ramas'};
const percent=(item:UsageItem)=>item.limit?Math.min(100,Math.round((item.used/item.limit)*100)):0;
const groupInfo:Record<ConfigGroup,{title:string;description:string}> = {
  academia:{title:'Academia y estructura',description:'Identidad, sedes, disciplinas, categorías y datos públicos.'},
  personas:{title:'Personas y operación',description:'Equipo técnico, alumnos, familias e inventario asociado.'},
  finanzas:{title:'Finanzas y condiciones',description:'Medios de pago, recaudación y reglas aceptadas en matrícula.'},
  comunicaciones:{title:'Comunicaciones',description:'Canales que conectan a la academia con sus familias.'},
  deporte:{title:'Operación deportiva',description:'Herramientas deportivas disponibles según tu plan.'},
};

const Configuracion: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);
  const [branches,setBranches] = useState<Branch[]>([]);
  const [primaryBranchId,setPrimaryBranchId] = useState('');
  const [savingPrimary,setSavingPrimary] = useState(false);
  const [plan,setPlan]=useState<PlanSnapshot|null>(null);
  const section = searchParams.get('seccion');

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
  const showFriendlies = Boolean(
    plan
      && !plan.entitlements.plan.trial
      && plan.entitlements.plan.code === 'formacion'
      && plan.entitlements.features.includes('amistosos')
  );
  const modules:ConfigModule[] = [
    { titulo: 'Perfil y horarios', desc: `Datos generales y horarios de ${academyName}`, icono: '🏟️', ruta: '/configuracion/perfil', group:'academia' },
    { titulo: 'Página pública', desc: 'Descripción, colores, redes sociales y galería pública', icono: '🌐', ruta: '/configuracion?seccion=pagina-publica', group:'academia' },
    { titulo: 'Sedes y ramas', desc: 'Ubicaciones y disciplinas deportivas', icono: '🏢', ruta: '/configuracion/estructura', group:'academia' },
    { titulo: 'Categorías', desc: 'Organiza categorías dentro de cada rama', icono: '🧩', ruta: '/configuracion/estructura?modo=categorias', group:'academia' },
    { titulo: 'Importar alumnos', desc: 'Carga Excel o CSV y revisa duplicados', icono: '📥', ruta: '/importacion', group:'academia' },
    { titulo: 'Profesores y accesos', desc: 'Cupos, accesos y categorías asignadas', icono: '🧑‍🏫', ruta: '/profesores', group:'personas' },
    { titulo: 'Inscripciones multideporte', desc: 'Agrega disciplinas sin duplicar la ficha del alumno', icono: '🔄', ruta: '/inscripciones', group:'personas' },
    { titulo: 'Apoderados PRO', desc: 'Portal familiar, chat, pagos y solicitudes deportivas', icono: '👨‍👩‍👧', ruta: '/apoderados-pro', group:'personas' },
    { titulo: 'Uniformes e inventario', desc: 'Catálogo, tallas, pedidos y entregas', icono: '👕', ruta: '/uniformes', group:'personas' },
    { titulo: 'Finanzas y recaudación', desc: 'Medios de pago y configuración financiera', icono: '💳', ruta: '/configuracion/finanzas', group:'finanzas' },
    { titulo: 'Términos de matrícula', desc: 'Reglamento y condiciones que aceptan las familias', icono: '⚖️', ruta: '/terminos', group:'finanzas' },
    { titulo: 'WhatsApp', desc: 'Vincula el canal y revisa su estado', icono: '📱', ruta: '/whatsapp', group:'comunicaciones' },
    ...(showFriendlies ? [{ titulo: 'Amistosos', desc: 'Partidos, controles y exhibiciones amistosas', icono: '🤝', ruta: '/amistosos', group:'deporte' as ConfigGroup }] : []),
  ];
  const groupedModules = (Object.keys(groupInfo) as ConfigGroup[])
    .map((key)=>({key,...groupInfo[key],items:modules.filter((item)=>item.group===key)}))
    .filter((group)=>group.items.length);

  if (section === 'pagina-publica') {
    return (
      <DirectorPage>
        <DirectorHero
          eyebrow="Configuración de academia"
          title="Página pública"
          description="Administra cómo se presenta tu academia públicamente: enlace, descripción, colores, redes sociales y galería."
          actions={<button type="button" onClick={()=>navigate('/configuracion')} className={DIRECTOR_BUTTON_DARK}>← Volver a configuración</button>}
        />
        <PublicPageEditor academyName={academyName}/>
      </DirectorPage>
    );
  }

  return (
    <DirectorPage>
      <DirectorHero
        eyebrow="Configuración"
        title={academyName}
        description="Configura la academia por área de trabajo, sin recorrer menús técnicos."
        actions={<button type="button" onClick={()=>navigate('/puesta-en-marcha')} className={DIRECTOR_BUTTON_DARK}>Puesta en Marcha</button>}
      />

      {plan ? (
        <DirectorPanel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d8700]">Plan actual</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">{plan.entitlements.plan.name}</h2>
              <p className="mt-1 text-sm text-[#697468]">{completed}/{plan.onboarding.length} pasos operativos completados.</p>
            </div>
            <button onClick={()=>navigate('/suscripcion')} className={DIRECTOR_BUTTON}>Ver planes</button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {Object.entries(plan.usage).map(([key,item])=><div key={key} className={`rounded-xl border px-3 py-2.5 ${item.limit && percent(item)>=90?'border-amber-200 bg-amber-50':'border-[#e0e5dd] bg-[#fafbf9]'}`}><p className="text-[9px] font-black uppercase tracking-[.08em] text-[#748073]">{usageLabel[key]}</p><div className="mt-1 flex items-end justify-between gap-2"><strong className="text-base font-black text-[#111711]">{item.used}/{item.limit??'∞'}</strong><span className={`text-[10px] font-black ${item.limit && percent(item)>=90?'text-amber-800':'text-[#697468]'}`}>{item.limit?`${percent(item)}%`:'Sin límite'}</span></div></div>)}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {plan.onboarding.filter((item)=>!item.done).slice(0,4).map((item)=><span key={item.key} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-800">Pendiente · {item.label}</span>)}
            {!plan.onboarding.some((item)=>!item.done)?<span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-800">Configuración esencial completa</span>:null}
          </div>
          {plan.structure.requiresChoice?<div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800"><b>Acción requerida:</b> selecciona la rama principal para continuar con tu plan actual.</div>:null}
        </DirectorPanel>
      ) : null}

      <DirectorPanel className="p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(420px,.8fr)] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d8700]">Organización deportiva</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Rama principal</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697468]">Define la disciplina que Lestra tomará como referencia principal. Las demás ramas se conservan.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={primaryBranchId} onChange={(event)=>setPrimaryBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Selecciona rama principal</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select>
            <button disabled={!primaryBranchId || savingPrimary} onClick={()=>void savePrimary()} className={DIRECTOR_BUTTON}>{savingPrimary ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </DirectorPanel>

      <section className="space-y-5">
        {groupedModules.map((group)=><div key={group.key}>
          <div className="mb-2 px-1"><h2 className="text-base font-black text-[#111711]">{group.title}</h2><p className="mt-0.5 text-xs text-[#697468]">{group.description}</p></div>
          <DirectorPanel className="overflow-hidden">
            <div className="divide-y divide-[#e5e9e2] sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-3">
              {group.items.map((item)=><button key={item.titulo} type="button" onClick={()=>navigate(item.ruta)} className="group flex min-h-[104px] items-center gap-4 bg-white p-4 text-left transition hover:bg-[#fafbf9] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[#b7ff00]/40">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#dfe5dc] bg-[#f7f9f5] text-xl" aria-hidden="true">{item.icono}</span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-black text-[#111711]">{item.titulo}</strong><span className="mt-1 block text-xs leading-5 text-[#697468]">{item.desc}</span></span>
                <span className="shrink-0 text-lg font-black text-[#879181] transition group-hover:translate-x-0.5 group-hover:text-[#6d8700]" aria-hidden="true">→</span>
              </button>)}
            </div>
          </DirectorPanel>
        </div>)}
      </section>
    </DirectorPage>
  );
};

export default Configuracion;