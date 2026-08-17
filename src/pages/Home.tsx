import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
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
type GuardianQuote = {
  chargedNetClp: number;
  chargedGrossClp: number;
  monthlyEquivalentNetClp: number;
};
type MarketingPlan = {
  code: string;
  name: string;
  monthly: PriceBlock;
  annual: PriceBlock & { equivalentMonthlyNetClp: number };
  founder: PriceBlock & { durationMonths: number };
};
type PublicCatalog = {
  plans: MarketingPlan[];
  guardianAddon?: {
    name: string;
    priceClp: number;
    monthly: GuardianQuote;
    annual: GuardianQuote;
    trialIncluded: boolean;
  };
  founder: { available: boolean; remainingSlots: number; totalSlots: number };
};
type MarketingIcon = typeof UserGroupIcon;

const fallbackPlans: MarketingPlan[] = [
  {
    code: 'formacion',
    name: 'Formación',
    monthly: { netClp: 59000, grossClp: 70210 },
    annual: { netClp: 590000, grossClp: 702100, equivalentMonthlyNetClp: 49167 },
    founder: { netClp: 49000, grossClp: 58310, durationMonths: 12 },
  },
  {
    code: 'competencia',
    name: 'Competencia',
    monthly: { netClp: 99000, grossClp: 117810 },
    annual: { netClp: 990000, grossClp: 1178100, equivalentMonthlyNetClp: 82500 },
    founder: { netClp: 79000, grossClp: 94010, durationMonths: 12 },
  },
  {
    code: 'alto_rendimiento',
    name: 'Alto Rendimiento',
    monthly: { netClp: 149000, grossClp: 177310 },
    annual: { netClp: 1490000, grossClp: 1773100, equivalentMonthlyNetClp: 124167 },
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
      'Radar multideporte con criterios estándar',
      'WhatsApp individual, asistencias y gestión operativa',
    ],
  },
  competencia: {
    eyebrow: 'Automatización y rendimiento',
    limit: '300 alumnos · 10 profesores · hasta 2 sedes/ramas',
    features: [
      'Todo Formación',
      'Criterios de evaluación personalizados por rama',
      'Grupos WhatsApp, alertas y exportaciones',
      'Dashboards y cobranza avanzada',
    ],
  },
  alto_rendimiento: {
    eyebrow: 'Organización deportiva',
    limit: 'Alumnos ilimitados · 30 profesores · multi-sede avanzada',
    features: [
      'Todo Competencia',
      'Metodología propia y analítica avanzada',
      'Branding y automatizaciones avanzadas',
      'Onboarding, migración y soporte preferencial',
    ],
  },
};

const capabilities: { icon: MarketingIcon; title: string; copy: string }[] = [
  { icon: UserGroupIcon, title: 'Matrícula y comunidad', copy: 'Alumnos, profesores, categorías, documentos y pre-matrícula en un solo flujo.' },
  { icon: CreditCardIcon, title: 'Finanzas conectadas', copy: 'Matrículas, mensualidades, morosidad, ingresos, egresos y cobranza.' },
  { icon: ChatBubbleLeftRightIcon, title: 'Comunicación integrada', copy: 'WhatsApp individual desde Formación y grupos desde Competencia.' },
  { icon: TrophyIcon, title: 'Partidos y torneos', copy: 'Competencia, citaciones, preparación y torneos en la misma plataforma.' },
  { icon: ChartBarSquareIcon, title: 'Rendimiento multideporte', copy: 'Radar deportivo desde Formación y metodología propia desde Competencia.' },
  { icon: ShieldCheckIcon, title: 'Privacidad y trazabilidad', copy: 'Consentimientos, solicitudes de derechos y aislamiento entre academias.' },
];

const sports = [
  ['Fútbol', 'Control · Pase · Remate · 1 vs 1'],
  ['Básquetbol', 'Manejo · Tiro · Defensa · Rebote'],
  ['Tenis', 'Saque · Derecha · Revés · Movilidad'],
  ['Vóleibol', 'Saque · Recepción · Ataque · Bloqueo'],
  ['Natación', 'Técnica · Salida · Virajes · Respiración'],
  ['Atletismo', 'Técnica · Velocidad · Potencia · Consistencia'],
] as const;

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value || 0);

export default function Home() {
  const [offerMode, setOfferMode] = useState<OfferMode>('monthly');
  const { data: catalog } = useQuery({
    queryKey: ['public-plan-catalog'],
    queryFn: async () => (await api.get('/api/public/plans')).data.data as PublicCatalog,
    staleTime: 60_000,
    retry: 1,
  });

  const plans = catalog?.plans?.length ? catalog.plans : fallbackPlans;
  const guardianMonthly = catalog?.guardianAddon?.monthly?.chargedNetClp ?? 15000;
  const guardianAnnual = catalog?.guardianAddon?.annual?.chargedNetClp ?? 150000;
  const guardianGrossMonthly = catalog?.guardianAddon?.monthly?.chargedGrossClp ?? 17850;
  const founderAvailable = catalog ? catalog.founder.available : true;
  const effectiveMode: OfferMode = offerMode === 'founder' && !founderAvailable ? 'monthly' : offerMode;
  const founderMessage = useMemo(() => {
    if (!catalog) return 'Precio especial para las primeras 10 academias';
    if (!catalog.founder.available) return 'Cupos Fundador agotados';
    return `${catalog.founder.remainingSlots} de ${catalog.founder.totalSlots} cupos disponibles`;
  }, [catalog]);

  return (
    <div className="min-h-screen bg-[#081018] text-white selection:bg-[#289E9D] selection:text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#081018]/90 px-4 py-3 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Logo className="h-10 max-w-[145px] sm:h-12 sm:max-w-[220px]" />
          <div className="hidden items-center gap-6 text-sm font-bold text-[#9dacbb] lg:flex">
            <a href="#producto" className="hover:text-white">Producto</a>
            <a href="#multideporte" className="hover:text-white">Multideporte</a>
            <a href="#apoderados-pro" className="hover:text-white">Apoderados PRO</a>
            <a href="#planes" className="hover:text-white">Planes</a>
            <a href="#seguridad" className="hover:text-white">Seguridad</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="rounded-xl px-3 py-2 text-xs font-black text-[#d4dde7] hover:bg-white/5 sm:text-sm">Entrar</Link>
            <Link to="/registro" className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-xs font-black shadow-[0_0_28px_rgba(40,158,157,0.25)] hover:bg-[#35b8b5] sm:px-5 sm:text-sm">Probar 15 días</Link>
          </div>
        </div>
      </nav>

      <main>
        <header className="relative overflow-hidden px-5 pb-24 pt-16 sm:pt-24 lg:pb-32">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(40,158,157,0.22),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(139,92,246,0.14),transparent_24%)]" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#70e4df]">
                <SparklesIcon className="h-4 w-4" />
                15 días Full · Apoderados PRO incluido en la prueba
              </div>
              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl xl:text-[78px]">
                Toda tu academia.
                <span className="mt-2 block bg-gradient-to-r from-[#70e4df] via-[#38bdb8] to-[#d8be87] bg-clip-text text-transparent">Una sola operación.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#a7b4c3] sm:text-xl">
                Syncademia conecta matrícula, asistencia, finanzas, WhatsApp, torneos y rendimiento deportivo. El portal familiar se activa aparte con Apoderados PRO cuando tu academia lo necesita.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/registro" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#289E9D] px-7 py-3 font-black shadow-[0_18px_45px_rgba(40,158,157,0.22)] hover:bg-[#35b8b5]">
                  Crear mi academia <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <a href="#apoderados-pro" className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] px-7 py-3 font-black text-violet-100 hover:border-violet-300/45">
                  Ver Apoderados PRO
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#8492a3]">
                {['Sin tarjeta para probar', 'Torneos en todos los planes', 'WhatsApp individual incluido', 'Portal familiar opcional'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-[#48d8d0]" />{item}</span>
                ))}
              </div>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-[#111a24] p-5 shadow-[0_35px_100px_rgba(0,0,0,0.42)] sm:p-6">
              <div className="flex items-center justify-between border-b border-white/8 pb-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.19em] text-[#70e4df]">Centro de operación</p>
                  <p className="mt-1 text-xl font-black">Tu academia conectada</p>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">Vista de ejemplo</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-[#0b131c] p-4">
                  <BuildingOffice2Icon className="h-6 w-6 text-[#70e4df]" />
                  <p className="mt-3 text-xs text-[#7f8d9e]">Estructura</p>
                  <p className="font-black">Sedes + ramas</p>
                  <p className="mt-3 text-sm text-[#a7b4c3]">Providencia · Fútbol<br />Maipú · Tenis</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-[#0b131c] p-4">
                  <ChartBarSquareIcon className="h-6 w-6 text-[#D8BE87]" />
                  <p className="mt-3 text-xs text-[#7f8d9e]">Rendimiento</p>
                  <p className="font-black">Radar por disciplina</p>
                  <div className="mt-4 h-12 rounded-xl bg-[radial-gradient(circle,rgba(40,158,157,0.2),transparent_65%)]" />
                </div>
                <div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.04] p-4 sm:col-span-2">
                  <UserGroupIcon className="h-6 w-6 text-violet-300" />
                  <p className="mt-3 text-xs text-[#7f8d9e]">Complemento familiar</p>
                  <p className="font-black">Apoderados PRO</p>
                  <p className="mt-2 text-sm text-[#a7b4c3]">Una licencia para todas las familias autorizadas de la academia.</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section id="producto" className="border-y border-white/8 bg-[#0d1620] px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">El sistema operativo de tu academia</p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Menos planillas. Más control.</h2>
              </div>
              <p className="text-lg leading-8 text-[#91a0b2]">La dirección administra el negocio, los profesores trabajan en terreno y las familias pueden tener su portal privado mediante Apoderados PRO.</p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="rounded-[26px] border border-white/8 bg-[#09121b] p-6 hover:border-[#289E9D]/40">
                  <Icon className="h-7 w-7 text-[#70e4df]" />
                  <h3 className="mt-5 text-xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-[#8f9dad]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="multideporte" className="px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D8BE87]">Multideporte de verdad</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Un alumno puede vivir varias disciplinas sin duplicar su ficha.</h2>
              <p className="mt-6 text-lg leading-8 text-[#95a3b3]">Cada inscripción mantiene su rama, categoría, mensualidad y seguimiento deportivo. La ficha personal y el apoderado siguen siendo únicos.</p>
              <div className="mt-8 space-y-3">
                {['Radar multideporte desde Formación', 'Criterios propios desde Competencia', 'Inscripciones y cobros separados por disciplina'].map((item) => (
                  <div key={item} className="flex gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#48d8d0]" /><p className="text-[#c6d0da]">{item}</p></div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sports.map(([sport, metrics]) => (
                <article key={sport} className="rounded-[24px] border border-white/8 bg-[#0d1620] p-5">
                  <p className="text-lg font-black">{sport}</p>
                  <p className="mt-3 text-sm leading-6 text-[#91a0b2]">{metrics}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="apoderados-pro" className="border-y border-violet-300/10 bg-[#0d1220] px-5 py-24 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                <UserGroupIcon className="h-4 w-4" /> Complemento opcional
              </div>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Apoderados PRO.<span className="block text-violet-200">Una licencia para todas las familias.</span></h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#a3adbc]">La academia paga una licencia única. No hay cobro por cada padre o tutor habilitado.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {['Portal privado de cada familia', 'Estado de cuenta y documentos', 'Comunicaciones y privacidad', 'Solicitud de otra disciplina'].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-black/15 p-4">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                    <span className="text-sm font-bold text-[#e1e5eb]">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-7 text-sm leading-6 text-[#8492a3]">La prueba Full de 15 días lo incluye para que puedas evaluar el portal antes de contratarlo.</p>
            </div>

            <div className="rounded-[30px] border border-violet-300/20 bg-[#09111c] p-6 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Precio por academia</p>
              <div className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-5">
                <p className="text-sm font-bold text-[#9ca8b7]">Mensual</p>
                <p className="mt-2 text-4xl font-black">{money(guardianMonthly)} <span className="text-sm text-[#8492a3]">+ IVA/mes</span></p>
                <p className="mt-2 text-sm text-violet-200">{money(guardianGrossMonthly)} IVA incluido</p>
              </div>
              <div className="mt-3 rounded-2xl border border-[#C8A96B]/25 bg-[#C8A96B]/[0.06] p-5">
                <p className="text-sm font-bold text-[#D8BE87]">Anual · 2 meses gratis</p>
                <p className="mt-2 text-3xl font-black">{money(guardianAnnual)} <span className="text-sm text-[#8492a3]">+ IVA/año</span></p>
                <p className="mt-2 text-sm text-[#D8BE87]">12 meses pagando 10</p>
              </div>
              <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-sm leading-6 text-[#9aa6b5]">
                Las solicitudes de nuevas disciplinas no crean cobros automáticamente. Dirección define categoría, matrícula, abono y mensualidad antes de aprobar.
              </div>
              <Link to="/registro" className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3.5 font-black hover:bg-violet-400">
                Probar Apoderados PRO 15 días <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        <section id="planes" className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">Planes transparentes</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Elige capacidad, no funciones familiares obligatorias.</h2>
              <p className="mt-5 text-lg leading-8 text-[#91a0b2]">Apoderados PRO no infla tu plan base. Lo agregas solo si quieres habilitar el portal privado para las familias.</p>
            </div>

            <div className="mx-auto mt-10 grid max-w-3xl gap-2 rounded-3xl border border-white/10 bg-[#0d1620] p-2 sm:grid-cols-3">
              <button type="button" onClick={() => setOfferMode('monthly')} className={`rounded-2xl px-4 py-4 text-left ${effectiveMode === 'monthly' ? 'bg-[#289E9D]' : 'text-white/65 hover:bg-white/[0.04]'}`}>
                <span className="block font-black">Mensual</span><span className="mt-1 block text-xs opacity-75">Mes a mes</span>
              </button>
              <button type="button" onClick={() => setOfferMode('annual')} className={`rounded-2xl px-4 py-4 text-left ${effectiveMode === 'annual' ? 'bg-[#289E9D]' : 'text-white/65 hover:bg-white/[0.04]'}`}>
                <span className="block font-black">Anual · 2 meses gratis</span><span className="mt-1 block text-xs opacity-75">Paga 10 · usa 12</span>
              </button>
              <button type="button" disabled={!founderAvailable} onClick={() => founderAvailable && setOfferMode('founder')} className={`rounded-2xl px-4 py-4 text-left ${effectiveMode === 'founder' ? 'bg-[#C8A96B] text-[#111923]' : founderAvailable ? 'text-[#D8BE87] hover:bg-[#C8A96B]/8' : 'cursor-not-allowed text-white/30'}`}>
                <span className="block font-black">Precio Fundador</span><span className="mt-1 block text-xs opacity-75">{founderMessage}</span>
              </button>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => {
                const copy = planCopy[plan.code];
                const featured = plan.code === 'competencia';
                const pricing = effectiveMode === 'annual' ? plan.annual : effectiveMode === 'founder' ? plan.founder : plan.monthly;
                return (
                  <article key={plan.code} className={`flex flex-col rounded-[30px] border p-7 ${featured ? 'border-[#48d8d0]/70 bg-[#10212a] shadow-[0_28px_80px_rgba(40,158,157,0.14)]' : 'border-white/10 bg-[#0d1620]'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7b8b9c]">{copy?.eyebrow}</p>
                    <h3 className="mt-2 text-2xl font-black">{plan.name}</h3>
                    <p className="mt-6 text-4xl font-black text-[#70e4df]">{money(pricing.netClp)}</p>
                    <p className="mt-1 text-xs font-bold text-[#7f8e9f]">{effectiveMode === 'annual' ? '+ IVA / año' : '+ IVA / mes'}</p>
                    {effectiveMode === 'annual' && <p className="mt-3 text-sm font-bold text-[#D8BE87]">Equivale a {money(plan.annual.equivalentMonthlyNetClp)}/mes</p>}
                    {effectiveMode === 'founder' && <p className="mt-3 text-sm font-bold text-[#D8BE87]">Precio protegido durante 12 meses</p>}
                    <p className="mt-5 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-2 text-xs font-bold text-[#a8b4c1]">{copy?.limit}</p>
                    <ul className="mt-6 flex-1 space-y-3">
                      {copy?.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm leading-6 text-[#d6dee7]"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#48d8d0]" />{feature}</li>)}
                    </ul>
                    <div className="mt-6 rounded-xl border border-violet-300/15 bg-violet-300/[0.04] px-3 py-2 text-xs font-bold text-violet-200">Apoderados PRO se contrata por separado.</div>
                    <Link to="/registro" className={`mt-5 rounded-2xl px-5 py-3.5 text-center font-black ${featured ? 'bg-[#289E9D] hover:bg-[#35b8b5]' : 'border border-white/15 hover:border-[#289E9D]/70'}`}>Probar Full primero</Link>
                  </article>
                );
              })}
            </div>
            <p className="mt-5 text-center text-xs text-[#68778a]">Precios netos en pesos chilenos. Se agrega IVA. Pago anual y Precio Fundador no se acumulan.</p>
          </div>
        </section>

        <section id="seguridad" className="border-y border-white/8 bg-[#0d1620] px-5 py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <LockClosedIcon className="h-10 w-10 text-emerald-300" />
              <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Seguridad y privacidad</p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em]">La información de una academia no pertenece a otra.</h2>
              <p className="mt-5 leading-7 text-[#91a0b2]">Controles de acceso, aislamiento lógico, consentimientos y trazabilidad para datos deportivos, financieros y familiares.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [ShieldCheckIcon, 'Aislamiento multiacademia', 'Cada operación se resuelve dentro de la organización autenticada.'],
                [DevicePhoneMobileIcon, 'Roles separados', 'Dirección, profesores y apoderados tienen experiencias distintas.'],
                [CreditCardIcon, 'Pagos externos', 'Mercado Pago procesa el pago; Syncademia no almacena tarjetas.'],
                [MapPinIcon, 'Estructura trazable', 'Sedes y ramas mantienen el contexto de cada operación.'],
              ].map(([Icon, title, copy]) => {
                const CardIcon = Icon as MarketingIcon;
                return <article key={String(title)} className="rounded-2xl border border-white/8 bg-[#09121b] p-5"><CardIcon className="h-6 w-6 text-emerald-300" /><h3 className="mt-5 font-black">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[#8493a5]">{String(copy)}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-24 lg:py-32">
          <div className="mx-auto max-w-5xl rounded-[38px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_50%_0%,rgba(40,158,157,0.24),transparent_48%),#0b131c] px-6 py-16 text-center sm:px-12">
            <SparklesIcon className="mx-auto h-11 w-11 text-[#70e4df]" />
            <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-[#70e4df]">15 días Full</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Prueba la operación completa antes de pagar.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#9daab8]">Durante la prueba tendrás las capacidades Full y Apoderados PRO habilitado. Después eliges tu plan base y si mantienes el complemento familiar.</p>
            <Link to="/registro" className="mt-9 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3 font-black text-[#0c1520]">Comenzar prueba Full <ArrowRightIcon className="h-5 w-5" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/8 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo className="h-10 max-w-[170px]" />
            <p className="mt-4 max-w-md text-sm leading-6 text-[#718095]">Gestión integral para academias deportivas: operación, finanzas, rendimiento y comunidad.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-[#7d8b9c]">
            <a href="#producto" className="hover:text-white">Producto</a>
            <a href="#multideporte" className="hover:text-white">Multideporte</a>
            <a href="#apoderados-pro" className="hover:text-white">Apoderados PRO</a>
            <a href="#planes" className="hover:text-white">Planes</a>
            <Link to="/login" className="hover:text-white">Acceso</Link>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/6 pt-6 text-xs text-[#59687a]">© 2026 {BRAND.name}. {BRAND.tagline}.</div>
      </footer>
    </div>
  );
}
