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
  DirectorStat,
} from '../components/director/DirectorModule';

type Branch = { id:string; nombre:string; disciplina:string; sede_id:string; sedes?:{ id:string; nombre:string } | null };
type UsageItem = { used:number; limit:number|null };
type PlanSnapshot = {
  entitlements:{plan:{name:string;code:string;trial:boolean};features:string[];limits:{players:number|null;professors:number|null;sites:number|null;branches:number|null}};
  usage:{players:UsageItem;professors:UsageItem;sites:UsageItem;branches:UsageItem};
  structure:{requiresChoice:boolean;primaryBranchId?:string|null};
  onboarding:Array<{key:string;label:string;done:boolean}>;
};
type ConfigModule = { titulo:string; desc:string; icono:string; ruta:string };

const usageLabel:Record<string,string>={players:'Alumnos',professors:'Profesores',sites:'Sedes',branches:'Ramas'};
const percent=(item:UsageItem)=>item.limit?Math.min(100,Math.round((item.used/item.limit)*100)):0;

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
  const modulos:ConfigModule[] = [
    ...(showFriendlies ? [{ titulo: 'Amistosos', desc: 'Programa partidos, controles, exhibiciones o competencias amistosas', icono: '🤝', ruta: '/amistosos' }] : []),
    { titulo: 'Profesores y accesos', desc: 'Administra cupos, accesos y categorías asignadas', icono: '🧑‍🏫', ruta: '/profesores' },
    { titulo: 'Página pública', desc: 'Configura la página pública de tu academia, redes sociales, colores y galería', icono: '🌐', ruta: '/configuracion?seccion=pagina-publica' },
    { titulo: 'Perfil y horarios', desc: `Datos generales y horarios de ${academyName}`, icono: '🏟️', ruta: '/configuracion/perfil' },
    { titulo: 'Sedes y ramas', desc: 'Administra ubicaciones y disciplinas deportivas', icono: '🏢', ruta: '/configuracion/estructura' },
    { titulo: 'Categorías', desc: 'Crea y organiza categorías dentro de cada rama', icono: '🧩', ruta: '/configuracion/estructura?modo=categorias' },
    { titulo: 'Inscripciones multideporte', desc: 'Inscribe al mismo alumno en otra disciplina sin duplicar su ficha', icono: '🔄', ruta: '/inscripciones' },
    { titulo: 'Apoderados PRO', desc: 'Portal familiar, chat, pagos, privacidad y solicitudes deportivas', icono: '👨‍👩‍👧', ruta: '/apoderados-pro' },
    { titulo: 'Uniformes e inventario', desc: 'Catálogo, tallas, pedidos y entregas', icono: '👕', ruta: '/uniformes' },
    { titulo: 'Finanzas y recaudación', desc: 'Configura los medios de pago de la academia', icono: '💳', ruta: '/configuracion/finanzas' },
    { titulo: 'Términos de matrícula', desc: 'Reglamento y condiciones que aceptarán los apoderados', icono: '⚖️', ruta: '/terminos' },
    { titulo: 'WhatsApp', desc: 'Vincula y revisa el estado de la conexión', icono: '📱', ruta: '/whatsapp' },
    { titulo: 'Importar alumnos', desc: 'Carga Excel o CSV y revisa duplicados antes de importar', icono: '📥', ruta: '/importacion' },
  ];

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
        eyebrow="Configuración de academia"
        title={academyName}
        description="Administra estructura, plan, recaudación, accesos y preferencias desde un único centro de configuración."
        actions={<button type="button" onClick={()=>navigate('/puesta-en-marcha')} className={DIRECTOR_BUTTON_DARK}>Puesta en Marcha</button>}
        aside={plan ? (
          <div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Plan actual</p>
            <p className="mt-2 text-xl font-black text-white">{plan.entitlements.plan.name}</p>
            <p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{completed}/{plan.onboarding.length} pasos operativos completados</p>
          </div>
        ) : null}
      />

      {plan ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(plan.usage).map(([key,item])=><DirectorStat key={key} label={usageLabel[key]} value={`${item.used}/${item.limit??'∞'}`} detail={item.limit ? `${percent(item)}% utilizado` : 'Sin límite'} tone={item.limit && percent(item)>=90 ? 'dark' : key==='players' ? 'lime' : 'default'} />)}
        </section>
      ) : null}

      {plan ? (
        <DirectorPanel className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Plan {plan.entitlements.plan.name}</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Uso y estado de configuración</h2>
              <p className="mt-1 text-sm text-[#697468]">Revisa cupos y confirma qué pasos esenciales ya están listos.</p>
            </div>
            <button onClick={()=>navigate('/suscripcion')} className={DIRECTOR_BUTTON}>Ver planes</button>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {plan.onboarding.map((item)=><div key={item.key} className={`flex items-center gap-3 rounded-[14px] border p-3 ${item.done?'border-[#cde995] bg-[#f3fadf]':'border-[#dfe5dc] bg-[#f6f8f4]'}`}><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${item.done?'bg-[#b7ff00] text-[#111711]':'bg-white text-[#7a8477]'}`}>{item.done?'✓':'○'}</span><span className={`text-sm font-bold ${item.done?'text-[#435b00]':'text-[#5f695e]'}`}>{item.label}</span></div>)}
          </div>
          {plan.structure.requiresChoice?<div className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><b>Acción requerida:</b> selecciona la rama principal para continuar con tu plan actual.</div>:null}
        </DirectorPanel>
      ) : null}

      <DirectorPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Organización deportiva</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Rama principal</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697468]">Selecciona la rama principal de la academia. Si tu plan limita ramas activas, las demás se conservan sin eliminarse.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:min-w-[520px]">
            <select value={primaryBranchId} onChange={(event)=>setPrimaryBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Selecciona rama principal</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select>
            <button disabled={!primaryBranchId || savingPrimary} onClick={()=>void savePrimary()} className={DIRECTOR_BUTTON}>{savingPrimary ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      </DirectorPanel>

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Administración</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Accesos de configuración</h2>
          </div>
          <p className="max-w-xl text-sm text-[#697468]">Todos los ajustes de la academia, organizados bajo el mismo sistema visual de Lestra.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => (
            <button key={m.titulo} type="button" onClick={() => navigate(m.ruta)} className="group min-h-[170px] rounded-[24px] border border-[#d9e0d6] bg-white p-5 text-left shadow-[0_14px_34px_rgba(20,29,21,.045)] transition hover:-translate-y-1 hover:border-[#9eb493] hover:shadow-[0_22px_48px_rgba(20,29,21,.09)] focus:outline-none focus:ring-4 focus:ring-[#b7ff00]/15">
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[#111711] text-[23px]">{m.icono}</span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d9e0d6] bg-white text-lg font-black text-[#111711] transition group-hover:border-[#b7ff00] group-hover:bg-[#b7ff00]">→</span>
                </div>
                <h3 className="mt-5 text-[17px] font-black tracking-[-.02em] text-[#111711]">{m.titulo}</h3>
                <p className="mt-2 max-w-[95%] text-sm leading-5 text-[#697468]">{m.desc}</p>
                <div className="mt-auto pt-4"><div className="h-[3px] w-10 rounded-full bg-[#b7ff00] transition-all duration-200 group-hover:w-20" /></div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </DirectorPage>
  );
};

export default Configuracion;
