import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Cycle = 'monthly' | 'annual';
type PlanCode = 'formacion' | 'competencia' | 'alto_rendimiento';
type DocumentType = 'boleta' | 'factura';
type Plan = {
  code: PlanCode;
  name: string;
  priceClp: number;
  founderPriceClp: number;
  professorLimit: number;
  playerLimit: number | null;
  monthly: { netClp: number; grossClp: number };
  annual: { netClp: number; grossClp: number; regularNetClp: number; monthsIncluded: number; monthsCharged: number; equivalentMonthlyNetClp: number };
  founder: { netClp: number; grossClp: number; durationMonths: number };
};
type AddonQuote = { chargedNetClp: number; chargedGrossClp: number; regularNetClp: number };
type PlansPayload = {
  plans: Plan[];
  guardianAddon: { name: string; priceClp: number; grossClp: number; monthly: AddonQuote; annual: AddonQuote; features: string[] };
  currentGuardianLicense: { active: boolean; trialIncluded: boolean; endsAt?: string | null };
  founder: { available: boolean; remainingSlots: number; existingFounder: boolean; founderNumber?: number | null; guaranteeEndsAt?: string | null };
  currentSubscription?: { trial?: boolean; daysRemaining?: number; status?: string; reason?: string } | null;
};
type BillingProfile = {
  documento_tipo: DocumentType;
  rut: string;
  razon_social: string;
  giro?: string | null;
  direccion?: string | null;
  comuna?: string | null;
  ciudad?: string | null;
  email: string;
  contacto_nombre?: string | null;
};
type ChangeRequest = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';
  current_plan_code: PlanCode;
  current_billing_cycle: Cycle;
  current_guardian_license: boolean;
  requested_plan_code: PlanCode;
  requested_billing_cycle: Cycle;
  requested_guardian_license: boolean;
  reason?: string | null;
  effective_from?: string | null;
  requested_at: string;
  review_notes?: string | null;
};
type RenewalCharge = {
  id: string;
  concepto: string;
  total_clp: number;
  estado: string;
  fecha_vencimiento?: string | null;
  periodo_inicio?: string | null;
  billing_document_type?: DocumentType | null;
};
type ContractState = {
  locked: boolean;
  lockedAt?: string | null;
  academy: {
    id: string;
    nombre: string;
    plan: string;
    plan_codigo: PlanCode;
    subscription_status: string;
    billing_cycle: Cycle;
    billing_amount_clp: number;
    next_billing_date?: string | null;
    plan_price_clp: number;
    guardian_price_clp: number;
    licencia_apoderados: boolean;
    promotion_code?: string | null;
    promotion_ends_at?: string | null;
    founder_number?: number | null;
  };
  billingProfile?: BillingProfile | null;
  changeRequest?: ChangeRequest | null;
  pendingRenewal?: RenewalCharge | null;
};
type MpStatus = { capabilities: { platformCheckout: boolean } };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL') : 'Por definir';
const PLAN_LABELS: Record<PlanCode, string> = { formacion: 'Formación', competencia: 'Competencia', alto_rendimiento: 'Alto Rendimiento' };
const planFeatures: Record<PlanCode, string[]> = {
  formacion: ['Hasta 100 alumnos', '5 profesores', '1 sede y 1 rama', 'Matrícula, asistencia, finanzas y uniformes', 'Evaluaciones deportivas estándar'],
  competencia: ['Hasta 300 alumnos', '10 profesores', '2 sedes y 2 ramas', 'Campeonatos, eventos y resultados multideporte', 'Preparación de partidos y alertas', 'Criterios de evaluación personalizados'],
  alto_rendimiento: ['Alumnos sin límite · 30 profesores', 'Sedes y ramas sin límite', 'Perfil 360° y analítica longitudinal', 'Salud y disponibilidad deportiva', 'Seguimiento de lesiones, retorno y certificados'],
};
const emptyProfile: BillingProfile = {
  documento_tipo: 'factura',
  rut: '',
  razon_social: '',
  giro: '',
  direccion: '',
  comuna: '',
  ciudad: '',
  email: '',
  contacto_nombre: '',
};

function BillingProfileForm({ profile, onChange, compact = false }: { profile: BillingProfile; onChange: (next: BillingProfile) => void; compact?: boolean }) {
  const input = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm text-white outline-none transition focus:border-[#289E9D]/70';
  const set = (key: keyof BillingProfile, value: string) => onChange({ ...profile, [key]: value });
  return <div className={compact ? 'space-y-4' : 'space-y-5'}>
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => set('documento_tipo', 'boleta')} className={`rounded-xl border p-4 text-left ${profile.documento_tipo === 'boleta' ? 'border-[#289E9D] bg-[#289E9D]/10' : 'border-white/10 bg-[#0d1117]'}`}>
        <span className="font-black text-white">Boleta</span><span className="mt-1 block text-xs text-[#8995a4]">Documento para persona natural o cliente sin factura.</span>
      </button>
      <button type="button" onClick={() => set('documento_tipo', 'factura')} className={`rounded-xl border p-4 text-left ${profile.documento_tipo === 'factura' ? 'border-[#C8A96B] bg-[#C8A96B]/10' : 'border-white/10 bg-[#0d1117]'}`}>
        <span className="font-black text-white">Factura</span><span className="mt-1 block text-xs text-[#8995a4]">Documento tributario para la academia o sociedad.</span>
      </button>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs font-bold text-[#8995a4]">RUT<input value={profile.rut} onChange={(e) => set('rut', e.target.value)} className={`mt-1 ${input}`} placeholder="76.123.456-7" /></label>
      <label className="text-xs font-bold text-[#8995a4]">{profile.documento_tipo === 'factura' ? 'Razón social' : 'Nombre'}<input value={profile.razon_social} onChange={(e) => set('razon_social', e.target.value)} className={`mt-1 ${input}`} /></label>
      <label className="text-xs font-bold text-[#8995a4]">Correo para el documento<input type="email" value={profile.email} onChange={(e) => set('email', e.target.value)} className={`mt-1 ${input}`} /></label>
      <label className="text-xs font-bold text-[#8995a4]">Contacto<input value={profile.contacto_nombre || ''} onChange={(e) => set('contacto_nombre', e.target.value)} className={`mt-1 ${input}`} placeholder="Opcional" /></label>
      {profile.documento_tipo === 'factura' ? <>
        <label className="text-xs font-bold text-[#8995a4] md:col-span-2">Giro<input value={profile.giro || ''} onChange={(e) => set('giro', e.target.value)} className={`mt-1 ${input}`} /></label>
        <label className="text-xs font-bold text-[#8995a4] md:col-span-2">Dirección<input value={profile.direccion || ''} onChange={(e) => set('direccion', e.target.value)} className={`mt-1 ${input}`} /></label>
        <label className="text-xs font-bold text-[#8995a4]">Comuna<input value={profile.comuna || ''} onChange={(e) => set('comuna', e.target.value)} className={`mt-1 ${input}`} /></label>
        <label className="text-xs font-bold text-[#8995a4]">Ciudad<input value={profile.ciudad || ''} onChange={(e) => set('ciudad', e.target.value)} className={`mt-1 ${input}`} /></label>
      </> : null}
    </div>
  </div>;
}

export default function SubscriptionCommercialV2() {
  const [data, setData] = useState<PlansPayload | null>(null);
  const [contract, setContract] = useState<ContractState | null>(null);
  const [mp, setMp] = useState<MpStatus | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [founder, setFounder] = useState(false);
  const [guardians, setGuardians] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>('competencia');
  const [profile, setProfile] = useState<BillingProfile>(emptyProfile);
  const [loadingAction, setLoadingAction] = useState('');
  const [requestPlan, setRequestPlan] = useState<PlanCode>('competencia');
  const [requestCycle, setRequestCycle] = useState<Cycle>('monthly');
  const [requestGuardians, setRequestGuardians] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  const load = async () => {
    try {
      setError('');
      const [plans, status, contractResponse] = await Promise.all([
        api.get('/api/subscriptions/plans'),
        api.get('/api/mercadopago/status'),
        api.get('/api/mercadopago/platform-subscription/contract'),
      ]);
      const plansData = plans.data.data as PlansPayload;
      const contractData = contractResponse.data.data as ContractState;
      setData(plansData);
      setMp(status.data.data);
      setContract(contractData);
      setGuardians(Boolean(plansData.currentGuardianLicense?.active && !plansData.currentGuardianLicense?.trialIncluded));
      setProfile(contractData.billingProfile ? { ...emptyProfile, ...contractData.billingProfile } : emptyProfile);
      if (contractData.academy?.plan_codigo) {
        setRequestPlan(contractData.academy.plan_codigo);
        setRequestCycle(contractData.academy.billing_cycle === 'annual' ? 'annual' : 'monthly');
        setRequestGuardians(Boolean(contractData.academy.licencia_apoderados));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible cargar la contratación de Lestra.');
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (cycle === 'annual') setFounder(false); }, [cycle]);

  const selected = useMemo(() => data?.plans.find((plan) => plan.code === selectedPlan) || null, [data, selectedPlan]);
  const addonNet = useMemo(() => !data || !guardians ? 0 : (cycle === 'annual' ? data.guardianAddon.annual.chargedNetClp : data.guardianAddon.monthly.chargedNetClp), [data, guardians, cycle]);
  const baseNet = selected ? (founder ? selected.founder.netClp : cycle === 'annual' ? selected.annual.netClp : selected.monthly.netClp) : 0;
  const totalNet = baseNet + addonNet;
  const totalGross = Math.round(totalNet * 1.19);
  const checkoutReady = mp?.capabilities.platformCheckout === true;

  const initialCheckout = async () => {
    if (!selected) return;
    try {
      setLoadingAction('checkout'); setError(''); setSuccess('');
      const response = await api.post('/api/mercadopago/platform-subscription/plan', {
        plan_code: selected.code,
        billing_cycle: cycle,
        promotion_code: founder ? 'founder' : null,
        guardian_license: guardians,
        billing_profile: profile,
      });
      window.location.assign(response.data.data.checkoutUrl);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible preparar el pago.');
      setLoadingAction('');
    }
  };

  const saveProfile = async () => {
    try {
      setLoadingAction('profile'); setError(''); setSuccess('');
      await api.put('/api/mercadopago/platform-subscription/billing-profile', profile);
      setSuccess('Datos de facturación guardados. Se usarán en el próximo documento de Lestra.');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible guardar los datos de facturación.');
    } finally { setLoadingAction(''); }
  };

  const payRenewal = async () => {
    try {
      setLoadingAction('renewal'); setError(''); setSuccess('');
      await api.put('/api/mercadopago/platform-subscription/billing-profile', profile);
      const response = await api.post('/api/mercadopago/platform-subscription/renewal/checkout');
      window.location.assign(response.data.data.checkoutUrl);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible preparar la renovación.');
      setLoadingAction('');
    }
  };

  const submitChangeRequest = async () => {
    try {
      setLoadingAction('change'); setError(''); setSuccess('');
      await api.post('/api/mercadopago/platform-subscription/change-request', {
        plan_code: requestPlan,
        billing_cycle: requestCycle,
        guardian_license: requestGuardians,
        reason: requestReason,
      });
      setSuccess('Solicitud enviada a Lestra. Tu contrato actual sigue vigente hasta que el cambio sea aprobado y pagado en la próxima renovación.');
      setRequestReason('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'No fue posible enviar la solicitud.');
    } finally { setLoadingAction(''); }
  };

  if (!data || !contract) return <div className="mx-auto max-w-6xl py-20 text-center text-[#8995a4]">{error || 'Cargando contrato Lestra...'}</div>;

  if (contract.locked) {
    const current = contract.academy;
    const request = contract.changeRequest;
    const renewal = contract.pendingRenewal;
    return <div className="mx-auto max-w-7xl space-y-7 pb-16">
      <section className="rounded-[32px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.18),transparent_38%),linear-gradient(135deg,#172530,#101620)] p-7 sm:p-9">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-[#70e4df]"><LockClosedIcon className="h-4 w-4"/>Contrato Lestra Deportivo</p><h1 className="mt-2 text-4xl font-black text-white">Tu plan está contratado</h1><p className="mt-3 max-w-3xl leading-7 text-[#9aa6b5]">El plan no puede cambiarse directamente. Las modificaciones se solicitan a Lestra y, si son aprobadas, se aplican al pagar el siguiente ciclo.</p></div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4"><p className="text-xs font-black uppercase text-emerald-300">Contrato vigente</p><p className="mt-1 text-xl font-black text-white">{current.plan}</p></div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
      {success ? <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">{success}</div> : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6 lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Contrato actual</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div><p className="text-xs text-[#697586]">Plan</p><p className="mt-1 font-black text-white">{current.plan}</p></div>
            <div><p className="text-xs text-[#697586]">Modalidad</p><p className="mt-1 font-black text-white">{current.billing_cycle === 'annual' ? 'Anual' : 'Mensual'}</p></div>
            <div><p className="text-xs text-[#697586]">Apoderados PRO</p><p className="mt-1 font-black text-white">{current.licencia_apoderados ? 'Incluido' : 'No incluido'}</p></div>
            <div><p className="text-xs text-[#697586]">Próximo vencimiento</p><p className="mt-1 font-black text-white">{date(current.next_billing_date)}</p></div>
          </div>
          {current.promotion_code === 'founder' ? <div className="mt-5 rounded-xl border border-violet-400/25 bg-violet-500/10 p-4 text-sm text-violet-200"><SparklesIcon className="mr-2 inline h-5 w-5"/>Precio Fundador activo hasta {date(current.promotion_ends_at)}.</div> : null}
        </article>

        <article className="rounded-3xl border border-[#009ee3]/30 bg-[#009ee3]/10 p-6">
          <p className="text-xs font-black uppercase tracking-wider text-sky-300">Próximo pago</p>
          {renewal ? <><p className="mt-3 text-3xl font-black text-white">{money(renewal.total_clp)}</p><p className="mt-2 text-sm text-sky-100/70">Vence {date(renewal.fecha_vencimiento)} · se mantiene el contrato aprobado.</p><button disabled={!checkoutReady || loadingAction === 'renewal'} onClick={() => void payRenewal()} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-4 font-black text-white disabled:opacity-40"><CreditCardIcon className="h-5 w-5"/>{loadingAction === 'renewal' ? 'Conectando...' : 'Pagar renovación'}</button></> : <><p className="mt-3 text-2xl font-black text-white">{date(current.next_billing_date)}</p><p className="mt-2 text-sm text-sky-100/70">El botón de pago aparecerá automáticamente 7 días antes del vencimiento.</p></>}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6">
          <div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#C8A96B]"><DocumentTextIcon className="h-5 w-5"/>Documento tributario</p><h2 className="mt-2 text-2xl font-black text-white">Boleta o Factura</h2><p className="mt-1 text-sm text-[#8995a4]">Puedes actualizar estos datos antes del próximo pago.</p></div></div>
          <div className="mt-5"><BillingProfileForm profile={profile} onChange={setProfile} compact /></div>
          <button disabled={loadingAction === 'profile'} onClick={() => void saveProfile()} className="mt-5 rounded-xl border border-[#C8A96B]/40 bg-[#C8A96B]/10 px-5 py-3 font-black text-[#e7cf9a] disabled:opacity-40">{loadingAction === 'profile' ? 'Guardando...' : 'Guardar datos de facturación'}</button>
        </article>

        <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#70e4df]"><ArrowPathIcon className="h-5 w-5"/>Cambio contractual</p><h2 className="mt-2 text-2xl font-black text-white">Solicitar cambio</h2>
          {request ? <div className={`mt-5 rounded-2xl border p-5 ${request.status === 'approved' ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'}`}><p className={`text-xs font-black uppercase ${request.status === 'approved' ? 'text-emerald-300' : 'text-amber-300'}`}>{request.status === 'approved' ? 'Aprobado por Lestra' : 'En revisión por Lestra'}</p><p className="mt-2 text-lg font-black text-white">{PLAN_LABELS[request.current_plan_code]} → {PLAN_LABELS[request.requested_plan_code]}</p><p className="mt-2 text-sm text-[#c7d0da]">{request.requested_billing_cycle === 'annual' ? 'Anual' : 'Mensual'} · Apoderados PRO {request.requested_guardian_license ? 'incluido' : 'no incluido'} · vigencia prevista {date(request.effective_from)}.</p>{request.review_notes ? <p className="mt-3 text-sm text-[#9aa6b5]">Lestra: {request.review_notes}</p> : null}{request.status === 'approved' ? <p className="mt-3 text-sm font-bold text-emerald-200">El cambio se hará efectivo únicamente cuando se pague la renovación correspondiente.</p> : null}</div> : <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-[#8995a4]">Plan solicitado<select value={requestPlan} onChange={(e) => setRequestPlan(e.target.value as PlanCode)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm text-white"><option value="formacion">Formación</option><option value="competencia">Competencia</option><option value="alto_rendimiento">Alto Rendimiento</option></select></label><label className="text-xs font-bold text-[#8995a4]">Modalidad<select value={requestCycle} onChange={(e) => setRequestCycle(e.target.value as Cycle)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm text-white"><option value="monthly">Mensual</option><option value="annual">Anual</option></select></label></div>
            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1117] p-4"><span><b className="text-white">Apoderados PRO</b><span className="mt-1 block text-xs text-[#8995a4]">Solicitar incluir o retirar la licencia en el próximo ciclo.</span></span><input type="checkbox" checked={requestGuardians} onChange={(e) => setRequestGuardians(e.target.checked)} className="h-5 w-5 accent-[#289E9D]" /></label>
            <label className="text-xs font-bold text-[#8995a4]">Motivo<textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm text-white" placeholder="Ej.: necesitamos ampliar cupos y funciones competitivas." /></label>
            <button disabled={loadingAction === 'change'} onClick={() => void submitChangeRequest()} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#289E9D] px-4 font-black text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5"/>{loadingAction === 'change' ? 'Enviando...' : 'Enviar solicitud a Lestra'}</button>
          </div>}
        </article>
      </section>
      <p className="text-center text-xs text-[#697586]">Cada pago confirmado de Lestra se registra automáticamente como egreso de software en Finanzas de tu academia.</p>
    </div>;
  }

  return <div className="mx-auto max-w-7xl space-y-7 pb-16">
    <section className="rounded-[32px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.18),transparent_38%),linear-gradient(135deg,#172530,#101620)] p-7 sm:p-9">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Contratación Lestra Deportivo</p><h1 className="mt-2 text-4xl font-black text-white">Configura tu contrato</h1><p className="mt-3 max-w-3xl leading-7 text-[#9aa6b5]">Elige una sola vez tu plan, modalidad y documento tributario. Después del primer pago el contrato queda bloqueado; cualquier cambio futuro requiere autorización de Lestra.</p>{data.currentSubscription?.trial ? <p className="mt-4 inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-200">Prueba Full · {data.currentSubscription.daysRemaining ?? 0} días restantes</p> : null}
    </section>
    {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}
    {!checkoutReady ? <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-amber-200">Checkout Pro todavía necesita las credenciales de producción de Mercado Pago de Lestra.</div> : null}

    <section className="rounded-3xl border border-white/10 bg-[#151b25] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#289E9D] font-black text-white">1</span><div><h2 className="text-xl font-black text-white">Plan y ciclo</h2><p className="text-sm text-[#8995a4]">Esta elección quedará ligada al contrato una vez pagada.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3"><button onClick={() => setCycle('monthly')} className={`rounded-2xl border p-5 text-left ${cycle === 'monthly' ? 'border-[#289E9D] bg-[#289E9D]/10' : 'border-white/10 bg-[#0d1117]'}`}><b className="text-white">Mensual</b><p className="mt-1 text-sm text-[#8995a4]">Renovación mes a mes del mismo contrato.</p></button><button onClick={() => setCycle('annual')} className={`rounded-2xl border p-5 text-left ${cycle === 'annual' ? 'border-[#C8A96B] bg-[#C8A96B]/10' : 'border-white/10 bg-[#0d1117]'}`}><b className="text-white">Anual · 2 meses gratis</b><p className="mt-1 text-sm text-[#D8BE87]">12 meses pagando el equivalente a 10.</p></button><button disabled={cycle === 'annual' || !data.founder.available} onClick={() => setFounder(!founder)} className={`rounded-2xl border p-5 text-left disabled:opacity-35 ${founder ? 'border-violet-400 bg-violet-500/10' : 'border-white/10 bg-[#0d1117]'}`}><b className="flex items-center gap-2 text-white"><SparklesIcon className="h-5 w-5"/>Precio Fundador</b><p className="mt-1 text-sm text-[#8995a4]">{data.founder.remainingSlots} cupos disponibles · solo mensual.</p></button></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">{data.plans.map((plan) => { const base = founder ? plan.founder.netClp : cycle === 'annual' ? plan.annual.netClp : plan.monthly.netClp; return <button key={plan.code} type="button" onClick={() => setSelectedPlan(plan.code)} className={`rounded-3xl border p-6 text-left ${selectedPlan === plan.code ? 'border-[#289E9D] bg-[#289E9D]/10 ring-1 ring-[#289E9D]/30' : 'border-white/10 bg-[#0d1117]'}`}><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">{plan.code === 'competencia' ? 'Más elegido' : 'Plan'}</p><h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3><p className="mt-3 text-2xl font-black text-white">{money(base)} <span className="text-xs text-[#8995a4]">+ IVA{cycle === 'annual' ? '/año' : '/mes'}</span></p><ul className="mt-5 space-y-2">{planFeatures[plan.code].map((feature) => <li key={feature} className="flex gap-2 text-sm text-[#c7d0da]"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300"/>{feature}</li>)}</ul></button>; })}</div>
      <label className={`mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-5 ${guardians ? 'border-violet-400/35 bg-violet-500/10' : 'border-white/10 bg-[#0d1117]'}`}><span className="flex gap-3"><UserGroupIcon className="h-7 w-7 text-violet-300"/><span><b className="text-white">Apoderados PRO</b><span className="mt-1 block text-xs text-[#8995a4]">Complemento contractual para toda la academia · {cycle === 'annual' ? `${money(data.guardianAddon.annual.chargedNetClp)} + IVA/año` : `${money(data.guardianAddon.monthly.chargedNetClp)} + IVA/mes`}.</span></span></span><input type="checkbox" checked={guardians} onChange={(e) => setGuardians(e.target.checked)} className="h-5 w-5 accent-violet-500" /></label>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#151b25] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#C8A96B] font-black text-[#111820]">2</span><div><h2 className="text-xl font-black text-white">Boleta o Factura</h2><p className="text-sm text-[#8995a4]">Estos datos quedarán asociados al pago y al documento del ciclo.</p></div></div><div className="mt-5"><BillingProfileForm profile={profile} onChange={setProfile} /></div></section>

    <section className="rounded-3xl border border-[#009ee3]/30 bg-[linear-gradient(135deg,rgba(0,158,227,.12),rgba(21,27,37,.96))] p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#009ee3] font-black text-white">3</span><div><h2 className="text-xl font-black text-white">Confirmar y pagar</h2><p className="text-sm text-[#a9bac8]">Revisa antes de salir a Mercado Pago.</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-4"><div><p className="text-xs text-[#697586]">Plan</p><p className="font-black text-white">{selected?.name}</p></div><div><p className="text-xs text-[#697586]">Modalidad</p><p className="font-black text-white">{founder ? 'Precio Fundador' : cycle === 'annual' ? 'Anual' : 'Mensual'}</p></div><div><p className="text-xs text-[#697586]">Documento</p><p className="font-black capitalize text-white">{profile.documento_tipo}</p></div><div><p className="text-xs text-[#697586]">Total con IVA</p><p className="text-2xl font-black text-white">{money(totalGross)}</p></div></div><div className="mt-5 rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-[#a9bac8]"><LockClosedIcon className="mr-2 inline h-5 w-5 text-[#70e4df]"/>Al aprobarse el pago, este plan queda como contrato vigente. El siguiente ciclo solo permitirá pagar la renovación; para cambiar de plan tendrás que solicitar autorización a Lestra.</div><button disabled={!checkoutReady || loadingAction === 'checkout'} onClick={() => void initialCheckout()} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#009ee3] px-5 text-lg font-black text-white disabled:opacity-40"><CreditCardIcon className="h-6 w-6"/>{loadingAction === 'checkout' ? 'Conectando con Mercado Pago...' : `Contratar y pagar ${money(totalGross)}`}</button></section>
    <p className="text-center text-xs text-[#697586]">Valores netos + IVA. Mercado Pago confirma la operación mediante webhook; al aprobarse, el gasto se registra automáticamente en Finanzas.</p>
  </div>;
}
