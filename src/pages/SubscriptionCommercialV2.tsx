import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';

type DocumentType = 'boleta' | 'factura';
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


type Contract = {
  locked: boolean;
  academy: { next_billing_date?: string; subscription_status: string };
  pendingRenewal?: { total_clp: number };
  billingProfile?: BillingProfile;
};

export default function SubscriptionCommercialV2() {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const state = useQuery({ queryKey: ['lestra-commercial-contract'], queryFn: async () => {
    const offer = await api.get('/api/subscriptions/plans');
    const checkoutEnabled = offer.data.data.checkoutEnabled === true;
    if (!checkoutEnabled) return { checkoutEnabled, contract: null };
    const contract = await api.get('/api/mercadopago/platform-subscription/contract');
    return { checkoutEnabled, contract: contract.data.data as Contract };
  } });
  const contract = state.data?.contract;
  const renewal = contract?.pendingRenewal;
  const billing = profile || contract?.billingProfile || emptyProfile;
  const payable = state.data?.checkoutEnabled && (!contract?.locked || renewal?.total_clp === 19990);
  const pay = async () => {
    if (!payable || busy) return;
    setBusy(true);
    setError('');
    try {
      if (contract?.locked) await api.put('/api/mercadopago/platform-subscription/billing-profile', billing);
      const response = await api.post('/api/mercadopago/platform-subscription/' + (contract?.locked ? 'renewal/checkout' : 'plan'), {
        plan_code: 'alto_rendimiento', billing_cycle: 'monthly', guardian_license: true, billing_profile: billing,
      });
      window.location.assign(response.data.data.checkoutUrl);
    } catch (cause) {
      const failure = cause as { response?: { data?: { error?: string } } };
      setError(failure.response?.data?.error || 'No se pudo preparar el pago. Intenta nuevamente.');
      setBusy(false);
    }
  };
  return <section className="mx-auto max-w-3xl space-y-5 rounded-2xl bg-slate-950 p-6 text-white">
    <p className="font-bold text-lime-300">Suscripción de la academia</p>
    <h1 className="text-3xl font-black">Lestra Deportivo</h1>
    <p><strong className="text-3xl">$19.990</strong> CLP al mes · IVA incluido</p>
    <p>Gestión deportiva, finanzas, competencias, página pública y acceso para profesores y apoderados.</p>
    {state.isPending && <p role="status">Consultando tu suscripción…</p>}
    {state.isError && <p role="alert">No pudimos consultar tu suscripción. <button onClick={() => void state.refetch()} className="underline">Reintentar</button></p>}
    {contract?.locked && <p>Próxima renovación: {contract.academy.next_billing_date || 'por confirmar'}.</p>}
    {payable && <><BillingProfileForm profile={billing} onChange={setProfile} /><button disabled={busy} onClick={() => void pay()} className="rounded-xl bg-lime-300 px-5 py-3 font-bold text-slate-950">{busy ? 'Preparando pago…' : 'Pagar $19.990'}</button></>}
    {state.data && !state.data.checkoutEnabled && <p>La contratación se coordina con nuestro equipo. <a className="underline" href="mailto:contacto@lestra.app?subject=Contratar%20Lestra%20Deportivo">Solicitar contratación</a></p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
