import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { BillingProfileForm } from './SubscriptionCommercialV2';
import { DirectorPage } from '../components/director/DirectorModule';

type BillingProfile = {
  documento_tipo: 'boleta' | 'factura'; rut: string; razon_social: string;
  giro?: string | null; direccion?: string | null; comuna?: string | null;
  ciudad?: string | null; email: string; contacto_nombre?: string | null;
};
type Status = {
  checkoutEnabled: boolean;
  contract: { academy: {
    plan: string; subscription_status: string; licencia_apoderados: boolean;
    guardian_license_ends_at?: string | null;
  }; billingProfile?: BillingProfile | null };
};
const blank: BillingProfile = { documento_tipo: 'factura', rut: '', razon_social: '', email: '' };

export default function GuardianLicenseBoard() {
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const state = useQuery<Status>({ queryKey: ['lestra-guardian-addon'], queryFn: async () => {
    const [offer, contract] = await Promise.all([
      api.get('/api/subscriptions/plans'),
      api.get('/api/mercadopago/platform-subscription/contract'),
    ]);
    return { checkoutEnabled: offer.data.data.checkoutEnabled === true, contract: contract.data.data };
  } });
  const academy = state.data?.contract?.academy;
  const expiry = academy?.guardian_license_ends_at;
  const active = academy?.licencia_apoderados === true && (!expiry || expiry.slice(0, 10) >= new Date().toISOString().slice(0, 10));
  const hasPlan = academy?.plan === 'Lestra Deportivo' && academy.subscription_status === 'active';
  const billing = profile || state.data?.contract?.billingProfile || blank;
  const checkoutEnabled = state.data?.checkoutEnabled === true;
  const pay = async () => {
    if (!checkoutEnabled || !hasPlan || active || busy) return;
    setBusy(true); setError('');
    try {
      const response = await api.post('/api/mercadopago/platform-subscription/guardian-addon', { billing_profile: billing });
      window.location.assign(response.data.data.checkoutUrl);
    } catch (cause: any) {
      setError(cause.response?.data?.error || 'No fue posible preparar la contratación.');
      setBusy(false);
    }
  };

  return <DirectorPage className="max-w-4xl">
    <section className="rounded-[26px] border border-[#d9e0d6] bg-white p-6 text-[#151a16] shadow-sm sm:p-9">
      <p className="text-xs font-black uppercase tracking-[.15em] text-[#536B19]">Complemento opcional</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Portal de apoderados</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#596657]">Conecta a las familias con la información y el seguimiento deportivo de sus hijos. Se contrata de forma independiente del plan Lestra Deportivo.</p>
      <div className="mt-7 rounded-2xl border border-[#dae8bd] bg-[#f3f9e7] p-6"><p className="text-4xl font-black">$15.000 <span className="text-lg">+ IVA</span></p><p className="mt-1 text-sm font-medium text-[#58664b]">Mensuales · Total $17.850 · Adicionales al plan de la academia</p></div>
      {state.isLoading && <p className="mt-6" role="status">Comprobando tu licencia…</p>}
      {state.isError && <p className="mt-6 text-red-700" role="alert">No se pudo consultar tu licencia. <button type="button" onClick={() => void state.refetch()} className="font-bold underline">Reintentar</button></p>}
      {active && <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4"><p className="font-black text-green-800">Tu portal está habilitado.</p><p className="mt-1 text-sm text-green-700">{expiry ? `Licencia vigente hasta el ${expiry.slice(0, 10)}.` : 'Licencia activa.'}</p><Link className="mt-3 inline-flex font-bold underline" to="/apoderados">Administrar accesos familiares</Link></div>}
      {!active && state.data && !hasPlan && <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Para contratar el portal primero debes tener activo Lestra Deportivo. <Link to="/suscripcion" className="font-bold underline">Ver plan de la academia</Link></p>}
      {!active && hasPlan && !checkoutEnabled && <div className="mt-6"><p className="text-sm text-[#596657]">Solicita la contratación de este complemento a nuestro equipo.</p><a className="mt-3 inline-flex rounded-xl bg-[#A3C63A] px-5 py-3 font-black text-[#151a16]" href="mailto:contacto@lestra.app?subject=Contratar%20Portal%20de%20Apoderados">Solicitar portal de apoderados</a></div>}
      {!active && hasPlan && checkoutEnabled && <div className="mt-7"><p className="mb-4 font-black">Datos de contratación</p><BillingProfileForm profile={billing} onChange={setProfile} /><button type="button" disabled={busy} onClick={() => void pay()} className="mt-5 rounded-xl bg-[#A3C63A] px-6 py-3 font-black text-[#151a16] disabled:opacity-60">{busy ? 'Preparando pago…' : 'Contratar por $17.850'}</button></div>}
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    </section>
  </DirectorPage>;
}
