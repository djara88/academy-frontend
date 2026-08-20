import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircleIcon, CreditCardIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Cycle = 'monthly' | 'annual';
type Quote = { chargedNetClp: number; chargedGrossClp: number; regularNetClp: number; billingPeriodMonths: number };
type Catalog = {
  guardianAddon: { name: string; priceClp: number; grossClp: number; trialIncluded: boolean; monthly: Quote; annual: Quote; features: string[] };
  currentGuardianLicense: { active: boolean; trialIncluded: boolean; endsAt?: string | null };
};
type MpStatus = { capabilities: { platformCheckout: boolean } };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

export default function ApoderadosProV2() {
  const { notify } = useAppDialog();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [loading, setLoading] = useState(false);
  const { data: catalog, isLoading } = useQuery({
    queryKey: ['guardian-addon-catalog-v2'],
    queryFn: async () => (await api.get('/api/subscriptions/plans')).data.data as Catalog,
  });
  const { data: mp } = useQuery({
    queryKey: ['mercadopago-platform-status'],
    queryFn: async () => (await api.get('/api/mercadopago/status')).data.data as MpStatus,
  });

  if (isLoading || !catalog) return <div className="py-20 text-center text-[#8995a4]">Cargando Apoderados PRO...</div>;
  const active = catalog.currentGuardianLicense.active;
  const quote = cycle === 'annual' ? catalog.guardianAddon.annual : catalog.guardianAddon.monthly;
  const checkoutReady = mp?.capabilities.platformCheckout === true;

  const checkout = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/mercadopago/platform-subscription/guardian-addon', { billing_cycle: cycle });
      window.location.assign(response.data.data.checkoutUrl);
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible preparar el pago.', { title: 'Apoderados PRO' });
      setLoading(false);
    }
  };

  return <div className="mx-auto max-w-5xl space-y-6 pb-14">
    <section className="overflow-hidden rounded-[32px] border border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.22),transparent_36%),linear-gradient(135deg,#171827,#101620)] p-7 sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Complemento opcional</p><h1 className="mt-2 text-4xl font-black text-white">Apoderados PRO</h1><p className="mt-3 max-w-2xl leading-7 text-[#a4afbd]">Una licencia para toda la academia. Portal familiar, estado de cuenta, comunicaciones, privacidad y solicitudes deportivas.</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#0d1117]/80 p-4 text-right"><p className="text-xs uppercase tracking-wider text-[#8995a4]">Desde</p><p className="text-3xl font-black text-violet-200">{money(catalog.guardianAddon.priceClp)} <span className="text-xs font-bold text-[#8995a4]">+ IVA/mes</span></p><p className="mt-1 text-xs text-[#8995a4]">por academia · no por apoderado</p></div>
      </div>
    </section>

    {catalog.currentGuardianLicense.trialIncluded ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100"><b>Incluido en tu prueba Full.</b> No necesitas contratarlo mientras dure la prueba.</div> : active ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100"><b>Licencia activa.</b>{catalog.currentGuardianLicense.endsAt ? ` Vigente hasta ${new Date(`${catalog.currentGuardianLicense.endsAt}T12:00:00`).toLocaleDateString('es-CL')}.` : ''}</div> : null}
    {!checkoutReady ? <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-200">Checkout Pro todavía necesita las credenciales de producción de Mercado Pago de Lestra. No habilitaremos un enlace manual como reemplazo.</div> : null}

    <section className="grid gap-5 md:grid-cols-2">
      <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><UserGroupIcon className="h-8 w-8 text-violet-300"/><h2 className="mt-4 text-xl font-black text-white">Qué habilita</h2><ul className="mt-4 space-y-3">{catalog.guardianAddon.features.map(feature => <li key={feature} className="flex gap-2 text-sm text-[#d4dbe4]"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300"/>{feature}</li>)}</ul></article>
      <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><CreditCardIcon className="h-8 w-8 text-[#70e4df]"/><h2 className="mt-4 text-xl font-black text-white">Elige vigencia</h2><div className="mt-4 grid gap-3"><button onClick={() => setCycle('monthly')} className={`rounded-2xl border p-4 text-left ${cycle === 'monthly' ? 'border-[#289E9D] bg-[#289E9D]/10' : 'border-white/10 bg-[#0d1117]'}`}><b className="text-white">Mensual</b><p className="mt-1 text-2xl font-black text-white">{money(catalog.guardianAddon.monthly.chargedNetClp)} <span className="text-xs text-[#8995a4]">+ IVA</span></p></button><button onClick={() => setCycle('annual')} className={`rounded-2xl border p-4 text-left ${cycle === 'annual' ? 'border-[#C8A96B] bg-[#C8A96B]/10' : 'border-white/10 bg-[#0d1117]'}`}><b className="text-white">Anual · 2 meses gratis</b><p className="mt-1 text-2xl font-black text-white">{money(catalog.guardianAddon.annual.chargedNetClp)} <span className="text-xs text-[#8995a4]">+ IVA/año</span></p></button></div>{!active && !catalog.currentGuardianLicense.trialIncluded ? <button disabled={loading || !checkoutReady} onClick={() => void checkout()} className="mt-5 min-h-12 w-full rounded-xl bg-[#009ee3] px-5 font-black text-white disabled:opacity-40">{loading ? 'Conectando con Mercado Pago...' : `Pagar ${money(quote.chargedGrossClp)}`}</button> : null}</article>
    </section>

    <section className="flex gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5 text-sm leading-6 text-sky-100"><ShieldCheckIcon className="h-6 w-6 shrink-0"/><span>Mercado Pago procesa el monto exacto. Cuando confirma el pago mediante webhook, Lestra activa Apoderados PRO automáticamente. No existe botón “Ya pagué” ni validación manual.</span></section>
  </div>;
}
