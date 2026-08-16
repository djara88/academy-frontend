import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  BuildingOffice2Icon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  LockClosedIcon,
  MapPinIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrophyIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';
import { BRAND } from '../config/brand';

type OfferMode = 'monthly' | 'annual' | 'founder';
type PriceBlock = { netClp: number; grossClp: number };
type MarketingPlan = {
  code: string;
  name: string;
  priceClp: number;
  professorLimit: number;
  playerLimit: number | null;
  monthly: PriceBlock;
  annual: PriceBlock & {
    regularNetClp: number;
    monthsIncluded: number;
    monthsCharged: number;
    equivalentMonthlyNetClp: number;
  };
  founder: PriceBlock & { durationMonths: number };
};
type PublicCatalog = {
  plans: MarketingPlan[];
  founder: { available: boolean; remainingSlots: number; totalSlots: number };
  billingRules: {
    annualMonthsCharged: number;
    annualMonthsIncluded: number;
    founderDurationMonths: number;
    discountsStackable: boolean;
  };
};
type MarketingIcon = typeof UserGroupIcon;

const fallbackPlans: MarketingPlan[] = [
  {
    code: 'formacion', name: 'Formación', priceClp: 59000, professorLimit: 3, playerLimit: 100,
    monthly: { netClp: 59000, grossClp: 70210 },
    annual: { netClp: 590000, grossClp: 702100, regularNetClp: 708000, monthsIncluded: 12, monthsCharged: 10, equivalentMonthlyNetClp: 49167 },
    founder: { netClp: 49000, grossClp: 58310, durationMonths: 12 },
  },
  {
    code: 'competencia', name: 'Competencia', priceClp: 99000, professorLimit: 10, playerLimit: 300,
    monthly: { netClp: 99000, grossClp: 117810 },
    annual: { netClp: 990000, grossClp: 1178100, regularNetClp: 1188000, monthsIncluded: 12, monthsCharged: 10, equivalentMonthlyNetClp: 82500 },
    founder: { netClp: 79000, grossClp: 94010, durationMonths: 12 },
  },
  {
    code: 'alto_rendimiento', name: 'Alto Rendimiento', priceClp: 149000, professorLimit: 30, playerLimit: null,
    monthly: { netClp: 149000, grossClp: 177310 },
    annual: { netClp: 1490000, grossClp: 1773100, regularNetClp: 1788000, monthsIncluded: 12, monthsCharged: 10, equivalentMonthlyNetClp: 124167 },
    founder: { netClp: 119000, grossClp: 141610, durationMonths: 12 },
  },
];

const planCopy: Record<string, { eyebrow: string; limit: string; features: string[] }> = {
  formacion: {
    eyebrow: 'Operación profesional',
    limit: '100 alumnos · 3 profesores · 1 sede · 1 rama',
    features: [
      'Matrícula y pre-matrícula digital',
      'Finanzas, mensualidades, partidos y torneos',
      'Radar multideporte con criterios estándar Syncademia',
      'Portal familiar, WhatsApp, asistencias y privacidad',
    ],
  },
  competencia: {
    eyebrow: 'Automatización y rendimiento',
    limit: '300 alumnos · 10 profesores · hasta 2 sedes/ramas',
    features: [
      'Todo Formación',
      'Criterios de evaluación personalizados por rama',
      'Grupos WhatsApp, alertas y exportaciones',
      'Dashboards y reportes de cobranza avanzados',
    ],
  },
  alto_rendimiento: {
    eyebrow: 'Organización deportiva',
    limit: 'Alumnos ilimitados · 30 profesores · multi-sede avanzada',
    features: [
      'Todo Competencia',
      'Metodología propia + analítica deportiva avanzada',
      'Branding, campañas y automatizaciones avanzadas',
      'Onboarding, migración asistida y soporte preferencial',
    ],
  },
};

const sports = [
  ['Fútbol', 'Control · Pase · Remate · 1 vs 1'],
  ['Básquetbol', 'Manejo · Tiro · Defensa · Rebote'],
  ['Tenis', 'Saque · Derecha · Revés · Movilidad'],
  ['Vóleibol', 'Saque · Recepción · Ataque · Bloqueo'],
  ['Natación', 'Técnica · Salida · Virajes · Respiración'],
  ['Atletismo', 'Técnica · Velocidad · Potencia · Consistencia'],
] as const;

const capabilityCards: { icon: MarketingIcon; title: string; copy: string }[] = [
  { icon: UserGroupIcon, title: 'Matrícula y comunidad', copy: 'Pre-matrícula, firma familiar, jugadores, apoderados, profesores, categorías y documentos premium.' },
  { icon: CreditCardIcon, title: 'Finanzas conectadas', copy: 'Matrícula, mensualidades automáticas, morosidad, vencimientos, ingresos, egresos y reportes de cobranza.' },
  { icon: ChatBubbleLeftRightIcon, title: 'Comunicación integrada', copy: 'WhatsApp individual desde el plan de entrada y grupos/automatizaciones desde Competencia.' },
  { icon: TrophyIcon, title: 'Competencia y torneos', copy: 'Partidos, citaciones, preparación deportiva y torneos incluidos en todos los planes.' },
  { icon: ChartBarSquareIcon, title: 'Rendimiento multideporte', copy: 'Radar desde Formación; desde Competencia, la dirección puede definir y versionar sus propios criterios por rama.' },
  { icon: ShieldCheckIcon, title: 'Privacidad operativa', copy: 'Consentimientos, solicitudes de rectificación/eliminación, trazabilidad y separación entre academias.' },
];

const structureCards: { icon: MarketingIcon; title: string; value: string }[] = [
  { icon: MapPinIcon, title: 'Sede', value: 'Providencia' },
  { icon: BuildingOffice2Icon, title: 'Ramas', value: 'Fútbol · Básquetbol' },
  { icon: UserGroupIcon, title: 'Categorías', value: 'Por rama y operación' },
];

const securityCards: { icon: MarketingIcon; title: string; copy: string }[] = [
  { icon: ShieldCheckIcon, title: 'Aislamiento multiacademia', copy: 'Las operaciones se resuelven dentro del contexto de la organización autenticada.' },
  { icon: LockClosedIcon, title: 'Roles y permisos', copy: 'Dirección, profesores, apoderados y superadministración tienen experiencias separadas.' },
  { icon: DevicePhoneMobileIcon, title: 'Privacidad familiar', copy: 'Consentimientos, información sensible y solicitudes de derechos tienen flujos específicos.' },
  { icon: CreditCardIcon, title: 'Pagos externos', copy: 'Mercado Pago procesa el pago; Syncademia no almacena tarjetas ni claves bancarias.' },
];

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value || 0);

const Home = () => {
  const [offerMode, setOfferMode] = useState<OfferMode>('monthly');
  const { data: catalog } = useQuery({
    queryKey: ['public-plan-catalog'],
    queryFn: async () => (await api.get('/api/public/plans')).data.data as PublicCatalog,
    staleTime: 60_000,
    retry: 1,
  });

  const plans = catalog?.plans?.length ? catalog.plans : fallbackPlans;
  const founderAvailable = catalog ? catalog.founder.available : true;
  const effectiveMode: OfferMode = offerMode === 'founder' && !founderAvailable ? 'monthly' : offerMode;
  const founderMessage = useMemo(() => {
    if (!catalog) return 'Precio especial para las primeras 10 academias';
    if (!catalog.founder.available) return 'Los 10 cupos Fundador ya fueron asignados';
    return `${catalog.founder.remainingSlots} de ${catalog.founder.totalSlots} cupos Fundador disponibles`;
  }, [catalog]);

  return (
    <div className="min-h-screen scroll-smooth overflow-hidden bg-[#081018] text-white selection:bg-[#289E9D] selection:text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#081018]/88 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Logo className="h-10 max-w-[135px] shrink-0 sm:h-12 sm:max-w-[220px]" />
          <div className="hidden items-center gap-7 text-sm font-bold text-[#9dacbb] lg:flex">
            <a href="#producto" className="transition hover:text-white">Producto</a>
            <a href="#multideporte" className="transition hover:text-white">Multideporte</a>
            <a href="#planes" className="transition hover:text-white">Planes</a>
            <a href="#seguridad" className="transition hover:text-white">Seguridad</a>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-xl px-3 py-2 text-xs font-black text-[#d4dde7] transition hover:bg-white/5 hover:text-white sm:text-sm">Entrar</Link>
            <Link to="/registro" className="whitespace-nowrap rounded-xl bg-[#289E9D] px-3.5 py-2.5 text-xs font-black text-white shadow-[0_0_28px_rgba(40,158,157,0.25)] transition hover:bg-[#35b8b5] sm:px-5 sm:text-sm">Probar 15 días</Link>
          </div>
        </div>
      </nav>

      <main>
        <header className="relative px-5 pb-24 pt-16 sm:pt-24 lg:pb-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(40,158,157,0.22),transparent_27%),radial-gradient(circle_at_82%_18%,rgba(200,169,107,0.12),transparent_23%),linear-gradient(180deg,rgba(8,16,24,0),#081018_86%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.03fr_0.97fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#70e4df]"><SparklesIcon className="h-4 w-4" /> 15 días Full · experiencia completa</div>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl xl:text-[78px]">Toda tu academia.<span className="mt-2 block bg-gradient-to-r from-[#70e4df] via-[#38bdb8] to-[#d8be87] bg-clip-text text-transparent">Una sola operación.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#a7b4c3] sm:text-xl">Syncademia conecta matrícula, asistencia, finanzas, familias, WhatsApp, torneos y rendimiento deportivo en una plataforma preparada para una sede o una organización multideporte.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/registro" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#289E9D] px-7 py-3 font-black text-white shadow-[0_18px_45px_rgba(40,158,157,0.22)] transition hover:-translate-y-0.5 hover:bg-[#35b8b5]">Crear mi academia <ArrowRightIcon className="h-5 w-5" /></Link>
                <a href="#producto" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.025] px-7 py-3 font-black text-white transition hover:border-[#48d8d0]/45 hover:bg-white/5">Ver cómo funciona</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#8492a3]">{['Sin tarjeta para probar', 'Torneos en todos los planes', 'WhatsApp individual incluido'].map((item) => <span key={item} className="inline-flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-[#48d8d0]" />{item}</span>)}</div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-br from-[#289E9D]/20 via-transparent to-[#C8A96B]/12 blur-3xl" />
              <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#111a24] p-4 shadow-[0_35px_100px_rgba(0,0,0,0.42)] sm:p-6">
                <div className="flex items-center justify-between border-b border-white/8 pb-5"><div><p className="text-[11px] font-black uppercase tracking-[0.19em] text-[#70e4df]">Centro de operación</p><p className="mt-1 text-xl font-black">Tu academia, conectada de punta a punta</p></div><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">Vista de ejemplo</span></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-[#0b131c] p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-cyan-300/10 p-2 text-cyan-200"><BuildingOffice2Icon className="h-5 w-5" /></div><div><p className="text-xs text-[#7f8d9e]">Estructura</p><p className="font-black">Sedes + ramas</p></div></div><div className="mt-4 space-y-2 text-xs text-[#a7b4c3]"><p className="rounded-lg bg-white/[0.04] px-3 py-2">Providencia · Fútbol</p><p className="rounded-lg bg-white/[0.04] px-3 py-2">Maipú · Tenis</p></div></div>
                  <div className="rounded-2xl border border-white/8 bg-[#0b131c] p-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#C8A96B]/10 p-2 text-[#D8BE87]"><ChartBarSquareIcon className="h-5 w-5" /></div><div><p className="text-xs text-[#7f8d9e]">Rendimiento</p><p className="font-black">Radar por disciplina</p></div></div><div className="mt-4 flex h-[78px] items-center justify-center rounded-xl border border-white/5 bg-[radial-gradient(circle,rgba(40,158,157,0.18),transparent_58%)]"><div className="relative h-14 w-14 rotate-45 border border-[#48d8d0]/45"><div className="absolute inset-2 border border-[#C8A96B]/50" /><div className="absolute inset-[18px] bg-[#289E9D]/55" /></div></div></div>
                  <div className="rounded-2xl border border-white/8 bg-[#0b131c] p-4 sm:col-span-2"><div className="flex items-center justify-between gap-4"><div><p className="text-xs text-[#7f8d9e]">Flujo operativo</p><p className="mt-1 font-black">Matrícula → mensualidades → asistencia → comunicación</p></div><ArrowTrendingUpIcon className="h-6 w-6 shrink-0 text-[#48d8d0]" /></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{['Matrícula', 'Cobranza', 'Asistencia', 'Familias'].map((step, index) => <div key={step} className="rounded-xl border border-white/6 bg-white/[0.035] p-3"><p className="text-[10px] font-black text-[#48d8d0]">0{index + 1}</p><p className="mt-1 text-xs font-bold text-[#d9e1e9]">{step}</p></div>)}</div></div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="border-y border-white/8 bg-[#0d1620] px-5 py-8"><div className="mx-auto grid max-w-7xl gap-4 text-center text-sm font-bold text-[#9fabb9] sm:grid-cols-2 lg:grid-cols-4">{[['Multiacademia', 'Aislamiento por organización'], ['Multisede', 'Una o múltiples ubicaciones'], ['Multideporte', 'Perfiles y métricas por disciplina'], ['Responsive', 'Dirección, profesor y familia']].map(([title, copy]) => <div key={title} className="rounded-2xl px-4 py-3"><p className="text-white">{title}</p><p className="mt-1 text-xs font-medium text-[#738195]">{copy}</p></div>)}</div></section>

        <section id="producto" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">El sistema operativo de tu academia</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">Menos planillas, menos chats sueltos. Más control.</h2></div><p className="max-w-2xl text-lg leading-8 text-[#91a0b2]">Cada dato entra una vez y alimenta el resto de la operación. La dirección ve el negocio, los profesores trabajan en terreno y las familias reciben la información que les corresponde.</p></div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{capabilityCards.map(({ icon: Icon, title, copy }) => <article key={title} className="group rounded-[26px] border border-white/8 bg-[#0e1721] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#289E9D]/45 hover:bg-[#111d28]"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/8 text-[#70e4df]"><Icon className="h-6 w-6" /></div><h3 className="mt-6 text-xl font-black">{title}</h3><p className="mt-3 leading-7 text-[#8f9dad]">{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="multideporte" className="border-y border-white/8 bg-[#0d1620] px-5 py-24 lg:py-32"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#D8BE87]">Multideporte de verdad</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">El radar se adapta al deporte. Y tu metodología puede adaptarlo aún más.</h2><p className="mt-6 text-lg leading-8 text-[#95a3b3]">Formación parte con perfiles multideporte listos para usar. Desde Competencia, el director puede definir entre 3 y 10 criterios propios para cada rama; cada cambio queda versionado para no mezclar evoluciones incompatibles.</p><div className="mt-8 space-y-3">{['Radar multideporte incluido desde Formación', 'Criterios propios por rama desde Competencia', 'Historial versionado para no comparar metodologías incompatibles'].map((item) => <div key={item} className="flex gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#48d8d0]" /><p className="text-[#c6d0da]">{item}</p></div>)}</div></div><div className="grid gap-3 sm:grid-cols-2">{sports.map(([sport, metrics], index) => <div key={sport} className={`rounded-[24px] border p-5 ${index === 2 ? 'border-[#D8BE87]/35 bg-[#D8BE87]/8' : 'border-white/8 bg-[#09121b]'}`}><div className="flex items-center justify-between gap-3"><p className="text-lg font-black">{sport}</p><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#7f8e9f]">Perfil estándar</span></div><p className="mt-4 text-sm leading-6 text-[#91a0b2]">{metrics}</p></div>)}</div></div></section>

        <section className="px-5 py-24 lg:py-32"><div className="mx-auto max-w-7xl"><div className="rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.18),transparent_34%),#0e1721] p-6 sm:p-10 lg:p-14"><div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">Crece sin cambiar de sistema</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em]">De una sede a una organización deportiva.</h2><p className="mt-5 leading-7 text-[#92a0b0]">Sedes y ramas forman parte del modelo operativo. Cada alumno, categoría, cobro, entrenamiento, evaluación, partido y torneo puede quedar vinculado a su estructura correspondiente.</p></div><div className="grid gap-3 sm:grid-cols-3">{structureCards.map(({ icon: Icon, title, value }) => <div key={title} className="rounded-2xl border border-white/8 bg-[#09121b]/85 p-5"><Icon className="h-6 w-6 text-[#70e4df]" /><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-[#708095]">{title}</p><p className="mt-2 font-black">{value}</p></div>)}</div></div></div></div></section>

        <section className="border-y border-white/8 bg-[#0d1620] px-5 py-24"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">Una plataforma, tres experiencias</p><h2 className="mt-4 text-4xl font-black tracking-[-0.035em]">Cada persona ve lo que necesita para actuar.</h2></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{[['Dirección', 'Dashboard, estructura, finanzas, profesores, comunicaciones, rendimiento y control del plan.', 'Control ejecutivo'], ['Profesor', 'Categorías asignadas, asistencia en terreno, jugadores, preparación y seguimiento deportivo.', 'Trabajo en cancha'], ['Apoderado', 'Jugadores vinculados, citaciones, asistencia, estado de cuenta, comunicaciones y documentos.', 'Experiencia familiar']].map(([title, copy, label], index) => <article key={title} className="rounded-[28px] border border-white/8 bg-[#09121b] p-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#708095]">0{index + 1} · {label}</p><h3 className="mt-5 text-2xl font-black">{title}</h3><p className="mt-4 leading-7 text-[#8f9dad]">{copy}</p></article>)}</div></div></section>

        <section id="planes" className="px-5 py-24 lg:py-32"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">Planes transparentes</p><h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">El software funciona bien desde Formación.</h2><p className="mt-5 text-lg leading-8 text-[#91a0b2]">Subes de plan por capacidad, automatización y profundidad deportiva; el radar ya funciona en Formación y la metodología personalizada empieza en Competencia.</p></div>
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-[#0d1620] p-2"><div className="grid gap-2 sm:grid-cols-3"><button type="button" onClick={() => setOfferMode('monthly')} className={`rounded-2xl px-4 py-4 text-left transition ${effectiveMode === 'monthly' ? 'bg-[#289E9D] text-white shadow-lg' : 'text-white/65 hover:bg-white/[0.04]'}`}><span className="block font-black">Mensual</span><span className="mt-1 block text-xs opacity-75">Flexibilidad mes a mes</span></button><button type="button" onClick={() => setOfferMode('annual')} className={`rounded-2xl px-4 py-4 text-left transition ${effectiveMode === 'annual' ? 'bg-[#289E9D] text-white shadow-lg' : 'text-white/65 hover:bg-white/[0.04]'}`}><span className="block font-black">Anual · 2 meses gratis</span><span className="mt-1 block text-xs opacity-75">Paga 10 · usa 12</span></button><button type="button" disabled={!founderAvailable} onClick={() => founderAvailable && setOfferMode('founder')} className={`rounded-2xl px-4 py-4 text-left transition ${effectiveMode === 'founder' ? 'bg-[#C8A96B] text-[#111923] shadow-lg' : founderAvailable ? 'text-[#D8BE87] hover:bg-[#C8A96B]/8' : 'cursor-not-allowed text-white/30'}`}><span className="block font-black">Precio Fundador</span><span className="mt-1 block text-xs opacity-75">{founderMessage}</span></button></div></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map((plan) => { const featured = plan.code === 'competencia'; const copy = planCopy[plan.code]; const pricing = effectiveMode === 'annual' ? plan.annual : effectiveMode === 'founder' ? plan.founder : plan.monthly; const mainValue = pricing.netClp; const suffix = effectiveMode === 'annual' ? '+ IVA / año' : '+ IVA / mes'; return <article key={plan.code} className={`relative flex flex-col overflow-hidden rounded-[30px] border p-7 transition duration-300 hover:-translate-y-1 ${featured ? 'border-[#48d8d0]/70 bg-[linear-gradient(180deg,#13272d,#0f1b24)] shadow-[0_28px_80px_rgba(40,158,157,0.16)]' : 'border-white/10 bg-[#0d1620] hover:border-white/20'}`}>{featured ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#48d8d0] via-cyan-300 to-[#D8BE87]" /> : null}{featured ? <span className="absolute right-5 top-5 rounded-full bg-[#289E9D] px-3 py-1 text-[10px] font-black uppercase tracking-wide">Recomendado</span> : null}<p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7b8b9c]">{copy?.eyebrow}</p><h3 className="mt-2 text-2xl font-black">{plan.name}</h3><div className="mt-6"><p><span className="text-4xl font-black tracking-[-0.035em] text-[#70e4df]">{money(mainValue)}</span></p><p className="mt-1 text-xs font-bold text-[#7f8e9f]">{suffix}</p>{effectiveMode === 'annual' ? <p className="mt-3 text-sm font-bold text-[#D8BE87]">Equivale a {money(plan.annual.equivalentMonthlyNetClp)}/mes · 12 meses</p> : null}{effectiveMode === 'founder' ? <p className="mt-3 text-sm font-bold text-[#D8BE87]">Precio protegido durante los primeros 12 meses</p> : null}</div><p className="mt-5 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2 text-xs font-bold text-[#a8b4c1]">{copy?.limit}</p><ul className="mt-6 flex-1 space-y-3">{copy?.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm leading-6 text-[#d6dee7]"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#48d8d0]" />{feature}</li>)}</ul><Link to="/registro" className={`mt-8 rounded-2xl px-5 py-3.5 text-center font-black transition ${featured ? 'bg-[#289E9D] text-white hover:bg-[#35b8b5]' : 'border border-white/15 text-white hover:border-[#289E9D]/70 hover:bg-white/[0.03]'}`}>Probar Full primero</Link></article>; })}</div><p className="mt-5 text-center text-xs text-[#68778a]">Precios netos en pesos chilenos. Se agrega IVA. Pago anual y Precio Fundador no se acumulan.</p></div></section>

        <section id="seguridad" className="border-y border-white/8 bg-[#0d1620] px-5 py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-300/8 text-emerald-300"><LockClosedIcon className="h-6 w-6" /></div><p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Seguridad y privacidad</p><h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em]">La información de una academia no pertenece a otra.</h2><p className="mt-5 leading-7 text-[#91a0b2]">Syncademia opera como SaaS multiacademia, con controles de acceso, aislamiento lógico, consentimientos y trazabilidad para datos de jugadores y familias.</p></div><div className="grid gap-4 sm:grid-cols-2">{securityCards.map(({ icon: Icon, title, copy }) => <div key={title} className="rounded-2xl border border-white/8 bg-[#09121b] p-5"><Icon className="h-6 w-6 text-emerald-300" /><h3 className="mt-5 font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#8493a5]">{copy}</p></div>)}</div></div></section>

        <section className="px-5 py-24 lg:py-32"><div className="mx-auto flex max-w-5xl flex-col items-center overflow-hidden rounded-[38px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_50%_0%,rgba(40,158,157,0.24),transparent_48%),linear-gradient(145deg,#101c26,#0b131c)] px-6 py-16 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] sm:px-12"><SparklesIcon className="h-11 w-11 text-[#70e4df]" /><p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#70e4df]">15 días Full</p><h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">No pruebes una versión recortada. Prueba la operación completa.</h2><p className="mt-6 max-w-2xl text-lg leading-8 text-[#9daab8]">Activa Syncademia con todas las capacidades de Alto Rendimiento —incluida la definición de criterios propios— y comprueba qué cambia en tu academia antes de elegir un plan.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/registro" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 font-black text-[#0c1520] transition hover:-translate-y-0.5">Comenzar prueba Full <ArrowRightIcon className="h-5 w-5" /></Link><Link to="/login" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/15 px-7 py-3 font-black text-white transition hover:bg-white/5">Ya tengo una cuenta</Link></div></div></section>
      </main>

      <footer className="border-t border-white/8 px-5 py-10"><div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between"><div><Logo className="h-10 max-w-[170px]" /><p className="mt-4 max-w-md text-sm leading-6 text-[#718095]">Gestión integral para academias deportivas: operación, comunidad, finanzas y rendimiento en un solo ecosistema.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[#7d8b9c]"><a href="#producto" className="hover:text-white">Producto</a><a href="#multideporte" className="hover:text-white">Multideporte</a><a href="#planes" className="hover:text-white">Planes</a><Link to="/login" className="hover:text-white">Acceso</Link></div></div><div className="mx-auto mt-8 max-w-7xl border-t border-white/6 pt-6 text-xs text-[#59687a]">© 2026 {BRAND.name}. {BRAND.tagline}.</div></footer>
    </div>
  );
};

export default Home;
