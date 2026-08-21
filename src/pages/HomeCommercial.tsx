import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  CheckCircleIcon,
  CreditCardIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';

type Mode = 'monthly' | 'annual' | 'founder';
type Price = { netClp: number; grossClp: number };
type Plan = {
  code: string; name: string; priceClp: number; professorLimit: number; playerLimit: number | null;
  monthly: Price;
  annual: Price & { equivalentMonthlyNetClp: number; monthsIncluded: number; monthsCharged: number };
  founder: Price & { durationMonths: number };
};
type PublicCatalog = {
  plans: Plan[];
  guardianAddon?: {
    name: string; priceClp: number; trialIncluded: boolean;
    monthly: { chargedNetClp: number; chargedGrossClp: number };
    annual: { chargedNetClp: number; chargedGrossClp: number };
  };
  founder: { available: boolean; remainingSlots: number; totalSlots: number };
};

const fallbackPlans: Plan[] = [
  { code: 'formacion', name: 'Formación', priceClp: 44990, professorLimit: 5, playerLimit: 100, monthly: { netClp: 44990, grossClp: 53538 }, annual: { netClp: 449900, grossClp: 535381, equivalentMonthlyNetClp: 37492, monthsIncluded: 12, monthsCharged: 10 }, founder: { netClp: 39990, grossClp: 47588, durationMonths: 12 } },
  { code: 'competencia', name: 'Competencia', priceClp: 99990, professorLimit: 10, playerLimit: 300, monthly: { netClp: 99990, grossClp: 118988 }, annual: { netClp: 999900, grossClp: 1189881, equivalentMonthlyNetClp: 83325, monthsIncluded: 12, monthsCharged: 10 }, founder: { netClp: 79990, grossClp: 95188, durationMonths: 12 } },
  { code: 'alto_rendimiento', name: 'Alto Rendimiento', priceClp: 149990, professorLimit: 30, playerLimit: null, monthly: { netClp: 149990, grossClp: 178488 }, annual: { netClp: 1499900, grossClp: 1784881, equivalentMonthlyNetClp: 124992, monthsIncluded: 12, monthsCharged: 10 }, founder: { netClp: 119990, grossClp: 142788, durationMonths: 12 } },
];
const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
const publicPageFeature = 'Página propia con inscripciones y pagos incluida';
const planFeatures: Record<string, string[]> = {
  formacion: ['100 alumnos · 5 profesores', '1 sede · 1 rama', publicPageFeature, 'Matrícula, asistencia, finanzas y uniformes', 'Evaluaciones deportivas estándar', 'Amistosos programables', 'Exportación básica y avisos operacionales'],
  competencia: ['300 alumnos · 10 profesores', 'Hasta 2 sedes y 2 ramas', publicPageFeature, 'Torneos oficiales, eventos y rendimiento', 'Preparación de partidos y alertas', 'Criterios de evaluación personalizados', 'Grupos WhatsApp y exportaciones deportivas'],
  alto_rendimiento: ['Alumnos sin límite · 30 profesores', 'Sedes y ramas sin límite', publicPageFeature, 'Perfil 360° y analítica longitudinal', 'Salud y disponibilidad deportiva', 'Lesiones, retorno y certificados deportivos'],
};

export default function HomeCommercial() {
  const [mode, setMode] = useState<Mode>('monthly');
  const { data } = useQuery({ queryKey: ['public-plan-catalog'], queryFn: async () => (await api.get('/api/public/plans')).data.data as PublicCatalog, staleTime: 60_000, retry: 1 });
  const plans = data?.plans?.length ? data.plans : fallbackPlans;
  const founderAvailable = data?.founder?.available ?? true;
  const effectiveMode: Mode = mode === 'founder' && !founderAvailable ? 'monthly' : mode;
  const guardianNet = data?.guardianAddon?.priceClp ?? 15000;
  const founderText = useMemo(() => data?.founder ? `${data.founder.remainingSlots} de ${data.founder.totalSlots} cupos disponibles` : 'Primeras 10 academias', [data]);

  return <div className="min-h-screen overflow-hidden bg-[#070B14] text-white selection:bg-[#3157FF] selection:text-white">
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#070B14]/90 px-4 py-3 backdrop-blur-xl sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Logo className="h-11 max-w-[190px]"/><div className="hidden gap-7 text-sm font-bold text-[#9dacbb] md:flex"><a href="#producto" className="hover:text-white">Producto</a><a href="#pagina-propia" className="hover:text-white">Página propia</a><a href="#planes" className="hover:text-white">Planes</a><a href="#familias" className="hover:text-white">Apoderados PRO</a><a href="#seguridad" className="hover:text-white">Seguridad</a></div><div className="flex gap-2"><Link to="/login" className="rounded-xl px-4 py-2 text-sm font-black text-[#d4dde7] hover:bg-white/5">Entrar</Link><Link to="/registro" className="rounded-xl bg-[#3157FF] px-4 py-2.5 text-sm font-black">Probar 15 días</Link></div></div></nav>

    <main>
      <header className="relative px-5 pb-24 pt-20 sm:pt-28"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(49,87,255,.22),transparent_28%),radial-gradient(circle_at_85%_12%,rgba(139,92,246,.16),transparent_25%)]"/><div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]"><div><span className="inline-flex items-center gap-2 rounded-full border border-[#B8FF3D]/20 bg-[#B8FF3D]/10 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-[#B8FF3D]"><SparklesIcon className="h-4 w-4"/>15 días Full · sin tarjeta</span><h1 className="mt-7 text-5xl font-black leading-[.94] tracking-[-.045em] sm:text-6xl xl:text-[76px]">Gestión que mueve<span className="mt-2 block bg-gradient-to-r from-[#B8FF3D] via-[#6C7CFF] to-[#B8FF3D] bg-clip-text text-transparent">el deporte.</span></h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#a7b4c3]">La operación completa de tu academia o club, conectada en una plataforma multideporte: matrícula, asistencia, finanzas, sedes, disciplinas, competencia y rendimiento.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/registro" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#3157FF] px-7 font-black shadow-[0_18px_45px_rgba(49,87,255,.22)]">Crear mi academia <ArrowRightIcon className="h-5 w-5"/></Link><a href="#planes" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 px-7 font-black">Ver planes</a></div><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#8492a3]">{['Página propia incluida en todos los planes', 'Prueba Full con Apoderados PRO', 'Un alumno puede tener varias disciplinas'].map((item)=><span key={item} className="inline-flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-[#B8FF3D]"/>{item}</span>)}</div></div>
      <div className="relative"><div className="absolute -inset-8 rounded-[48px] bg-gradient-to-br from-[#3157FF]/20 via-transparent to-violet-500/15 blur-3xl"/><div className="relative rounded-[34px] border border-white/10 bg-[#0F172A] p-6 shadow-[0_35px_100px_rgba(0,0,0,.42)]"><p className="text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Centro de operación</p><h2 className="mt-2 text-2xl font-black">Una ficha. Varias disciplinas.</h2><div className="mt-6 grid gap-3 sm:grid-cols-2">{[['Fútbol','SUB-11 · $25.000/mes'],['Tenis','Infantil · $30.000/mes'],['Finanzas','Cobros por disciplina'],['Familia','Una sola cuenta']].map(([title,value])=><div key={title} className="rounded-2xl border border-white/8 bg-[#0B1220] p-4"><p className="text-xs text-[#7f8d9e]">{title}</p><p className="mt-1 font-black">{value}</p></div>)}</div><div className="mt-5 rounded-2xl border border-[#B8FF3D]/20 bg-[#B8FF3D]/5 p-4"><p className="text-xs font-black uppercase tracking-wider text-[#B8FF3D]">Tu vitrina digital</p><p className="mt-2 text-sm leading-6 text-[#d7e1ea]">Cada academia puede publicar su propia página en Lestra con disciplinas, categorías, sedes, horarios, fotos, inscripciones y acceso seguro a pagos.</p></div></div></div></div></header>

      <section id="producto" className="border-y border-white/8 bg-white/[.015] px-5 py-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Operación conectada</p><h2 className="mt-3 max-w-3xl text-3xl font-black sm:text-4xl">Menos planillas separadas. Más control de la academia.</h2><div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{[
        {icon:BuildingOffice2Icon,title:'Multisede y multideporte',copy:'Sedes, ramas y categorías con una ficha única por alumno.'},
        {icon:CreditCardIcon,title:'Finanzas por disciplina',copy:'Matrículas, mensualidades, abonos, morosidad e ingresos vinculados a cada inscripción.'},
        {icon:TrophyIcon,title:'Competencia',copy:'Amistosos desde Formación; torneos oficiales, citaciones y rendimiento desde Competencia.'},
        {icon:ChartBarSquareIcon,title:'Rendimiento 360°',copy:'Competencia captura métricas; Alto Rendimiento conecta evolución, PB/SB, salud y disponibilidad deportiva.'},
      ].map(({icon:Icon,title,copy})=><article key={title} className="rounded-3xl border border-white/10 bg-[#0F172A] p-6"><Icon className="h-7 w-7 text-[#B8FF3D]"/><h3 className="mt-4 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#93a1b1]">{copy}</p></article>)}</div></div></section>

      <section id="pagina-propia" className="px-5 py-20"><div className="mx-auto grid max-w-7xl gap-8 rounded-[34px] border border-[#B8FF3D]/20 bg-[radial-gradient(circle_at_top_right,rgba(184,255,61,.12),transparent_38%),#0F172A] p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr]"><div className="flex flex-col justify-center"><GlobeAltIcon className="h-10 w-10 text-[#B8FF3D]"/><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Incluida desde Formación</p><h2 className="mt-3 text-4xl font-black">Tu academia también tiene su propia página.</h2><p className="mt-4 leading-7 text-[#a7b4c3]">No es un extra ni un plan superior. Formación, Competencia y Alto Rendimiento incluyen una página pública propia dentro de Lestra para convertir visitas en solicitudes y pagos.</p></div><div className="grid gap-3 sm:grid-cols-2">{[
        ['Enlace propio','Una URL pública para compartir directamente desde RRSS, WhatsApp o campañas.'],
        ['Inscripciones online','Las familias pueden consultar disciplinas y enviar solicitudes sin crear cobros automáticos.'],
        ['Pagos conectados','Acceso al portal de consulta y pago con verificación del contacto registrado.'],
        ['Tu identidad','Logo, colores, descripción, redes sociales, WhatsApp y galería de hasta 6 fotos.'],
        ['Oferta deportiva','Muestra disciplinas, ramas, categorías, sedes, días y horarios de entrenamiento.'],
        ['Incluida en los 3 planes','La vitrina digital de la academia no se bloquea por nivel de suscripción.'],
      ].map(([title,copy])=><div key={title} className="rounded-2xl border border-white/10 bg-[#0B1220] p-5"><CheckCircleIcon className="h-5 w-5 text-[#B8FF3D]"/><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#93a1b1]">{copy}</p></div>)}</div></div></section>

      <section id="familias" className="px-5 pb-20"><div className="mx-auto grid max-w-7xl gap-8 rounded-[34px] border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.2),transparent_38%),#0F172A] p-7 sm:p-10 lg:grid-cols-[1fr_.75fr]"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Complemento opcional</p><h2 className="mt-3 text-4xl font-black">Apoderados PRO</h2><p className="mt-4 max-w-2xl leading-7 text-[#a7b4c3]">Portal familiar para toda la academia: estado de cuenta, medios de pago, chat, privacidad y solicitudes de nuevas disciplinas. No se cobra por cada padre.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{['Una licencia para todas las familias','Incluido durante la prueba Full','Solicitud de nueva disciplina','Dirección mantiene aprobación y valores'].map((item)=><div key={item} className="flex gap-2 rounded-xl border border-white/10 bg-[#0B1220] p-3 text-sm"><CheckCircleIcon className="h-5 w-5 shrink-0 text-violet-300"/>{item}</div>)}</div></div><div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-[#0B1220] p-6 text-center"><UserGroupIcon className="mx-auto h-9 w-9 text-violet-300"/><p className="mt-4 text-4xl font-black text-white">{money(guardianNet)}</p><p className="mt-1 text-sm font-bold text-[#8995a4]">+ IVA / mes por academia</p><p className="mt-4 text-xs text-[#B8FF3D]">Anual: 12 meses pagando 10</p></div></div></section>

      <section id="planes" className="border-y border-white/8 bg-[#0B1220] px-5 py-20"><div className="mx-auto max-w-7xl"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#B8FF3D]">Planes</p><h2 className="mt-3 text-4xl font-black">Elige el nivel deportivo que necesitas.</h2><p className="mt-3 text-[#93a1b1]">Valores netos + IVA. <strong className="text-white">Todos los planes incluyen la página propia de tu academia.</strong> Apoderados PRO se contrata por separado.</p></div><div className="flex flex-wrap gap-2">{([['monthly','Mensual'],['annual','Anual · 2 meses gratis'],['founder','Fundador']] as [Mode,string][]).map(([value,label])=><button key={value} disabled={value==='founder'&&!founderAvailable} onClick={()=>setMode(value)} className={`rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-35 ${effectiveMode===value?'border-[#3157FF] bg-[#3157FF]/15 text-[#B8FF3D]':'border-white/10 bg-[#0F172A] text-[#a7b4c3]'}`}>{label}</button>)}</div></div>{effectiveMode==='founder'?<p className="mt-4 text-sm font-bold text-violet-300">{founderText} · precio garantizado 12 meses para el plan base</p>:null}
        <div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map((plan)=>{const price=effectiveMode==='annual'?plan.annual.netClp:effectiveMode==='founder'?plan.founder.netClp:plan.monthly.netClp;return <article key={plan.code} className={`rounded-3xl border bg-[#0F172A] p-6 ${plan.code==='competencia'?'border-[#3157FF]/50 shadow-[0_20px_70px_rgba(49,87,255,.08)]':'border-white/10'}`}><p className="text-xs font-black uppercase tracking-wider text-[#B8FF3D]">{plan.code==='competencia'?'Más elegido':'Plan base'}</p><h3 className="mt-2 text-2xl font-black">{plan.name}</h3><p className="mt-5 text-3xl font-black">{money(price)} <span className="text-xs text-[#8995a4]">+ IVA{effectiveMode==='annual'?'/año':'/mes'}</span></p>{effectiveMode==='annual'?<p className="mt-1 text-xs text-[#B8FF3D]">12 meses pagando 10</p>:effectiveMode==='founder'?<p className="mt-1 text-xs text-violet-300">Precio Fundador por 12 meses</p>:null}<ul className="mt-6 space-y-3">{(planFeatures[plan.code]||[]).map((feature)=><li key={feature} className="flex gap-2 text-sm text-[#c6d0db]"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300"/>{feature}</li>)}</ul><Link to="/registro" className="mt-7 flex min-h-12 items-center justify-center rounded-xl bg-[#3157FF] px-4 font-black">Probar Full 15 días</Link></article>})}</div></div></section>

      <section id="seguridad" className="px-5 py-20"><div className="mx-auto max-w-7xl"><div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><div><ShieldCheckIcon className="h-9 w-9 text-[#B8FF3D]"/><h2 className="mt-4 text-4xl font-black">Seguridad pensada para datos deportivos y familiares.</h2><p className="mt-4 leading-7 text-[#93a1b1]">Separación por academia, roles diferenciados, consentimiento y trazabilidad. Mercado Pago procesa pagos externos; Lestra no almacena tarjetas.</p></div><div className="grid gap-3 sm:grid-cols-2">{['Aislamiento multiacademia','Roles Director, profesor y apoderado','Datos familiares detrás de licencia y permisos','Solicitudes deportivas auditables'].map((item)=><div key={item} className="rounded-2xl border border-white/10 bg-[#0F172A] p-5"><CheckCircleIcon className="h-5 w-5 text-emerald-300"/><p className="mt-3 font-black">{item}</p></div>)}</div></div></div></section>

      <section className="px-5 pb-24"><div className="mx-auto max-w-5xl rounded-[34px] border border-[#3157FF]/25 bg-gradient-to-br from-[#15343a] to-[#0F172A] p-8 text-center sm:p-12"><h2 className="text-4xl font-black">Prueba la operación completa antes de decidir.</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-[#a7b4c3]">15 días Full incluyen temporalmente Apoderados PRO. La página propia de tu academia permanece incluida en cualquiera de los tres planes que elijas.</p><Link to="/registro" className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-[#3157FF] px-8 font-black">Crear mi academia <ArrowRightIcon className="h-5 w-5"/></Link></div></section>
    </main>

    <footer className="border-t border-white/8 px-5 py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#697586] sm:flex-row sm:items-center sm:justify-between"><Logo className="h-8 max-w-[145px] opacity-80"/><p>© 2026 Lestra · Gestión integral para academias deportivas</p></div></footer>
  </div>;
}
