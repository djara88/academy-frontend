import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircleIcon, CreditCardIcon, ShieldCheckIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Cycle = 'monthly' | 'annual';
type Quote = { chargedNetClp: number; chargedGrossClp: number; regularNetClp: number; billingPeriodMonths: number };
type Data = {
  guardianAddon: { name: string; priceClp: number; grossClp: number; trialIncluded: boolean; monthly: Quote; annual: Quote; features: string[] };
  currentGuardianLicense: { active: boolean; trialIncluded: boolean; endsAt?: string | null };
  gateway: { configured: boolean; provider: string };
};
type Order = { chargeId: string; checkoutUrl: string; amountClp: number; netAmountClp: number; expiresAt: string };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

export default function ApoderadosPro() {
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [payer, setPayer] = useState('');
  const [reference, setReference] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['guardian-addon-catalog'], queryFn: async () => (await api.get('/api/subscriptions/plans')).data.data as Data });

  if (isLoading || !data) return <div className="py-20 text-center text-[#8995a4]">Cargando Apoderados PRO...</div>;
  const active = data.currentGuardianLicense.active;

  const checkout = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/subscriptions/guardian-addon/checkout', { billing_cycle: cycle });
      setOrder(response.data.data as Order);
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible preparar el pago.', { title: 'Apoderados PRO' });
    } finally { setLoading(false); }
  };

  const inform = async () => {
    if (!order) return;
    try {
      await api.patch(`/api/subscriptions/payment-notice/${order.chargeId}`, { payer_name: payer, reference });
      await notify('Pago informado. La licencia se activará al validar el abono.', { title: 'Pago registrado' });
    } catch (err: any) { await notify(err.response?.data?.error || 'No fue posible informar el pago.'); }
  };

  const check = async () => {
    if (!order) return;
    setChecking(true);
    try {
      const response = await api.get(`/api/subscriptions/payment-status?chargeId=${encodeURIComponent(order.chargeId)}`);
      if (response.data.data.estado === 'pagado') {
        await queryClient.invalidateQueries({ queryKey: ['guardian-addon-catalog'] });
        await queryClient.invalidateQueries({ queryKey: ['mi-plan'] });
        setOrder(null);
        await notify('Apoderados PRO ya está activo para toda tu academia.', { title: 'Licencia activada' });
      } else await notify('El pago todavía está pendiente de validación.', { title: 'Validación pendiente' });
    } catch (err: any) { await notify(err.response?.data?.error || 'No fue posible revisar el pago.'); }
    finally { setChecking(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 pb-14">
    <section className="overflow-hidden rounded-[32px] border border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.22),transparent_36%),linear-gradient(135deg,#171827,#101620)] p-7 sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">Complemento opcional</p><h1 className="mt-2 text-4xl font-black text-white">Apoderados PRO</h1><p className="mt-3 max-w-2xl leading-7 text-[#a4afbd]">Una licencia para toda la academia. Entrega a las familias su portal privado, estado de cuenta, comunicaciones, privacidad y solicitud de nuevas disciplinas sin duplicar alumnos.</p></div><div className="rounded-2xl border border-white/10 bg-[#0d1117]/80 p-4 text-right"><p className="text-xs uppercase tracking-wider text-[#8995a4]">Desde</p><p className="text-3xl font-black text-violet-200">{money(data.guardianAddon.priceClp)} <span className="text-xs font-bold text-[#8995a4]">+ IVA/mes</span></p><p className="mt-1 text-xs text-[#8995a4]">por academia · no por apoderado</p></div></div>
    </section>

    {data.currentGuardianLicense.trialIncluded ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100"><b>Incluido en tu prueba Full.</b> Puedes usar todas las funciones familiares ahora. La contratación se realiza al activar tu plan.</div> : active ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5 text-emerald-100"><b>Licencia activa.</b>{data.currentGuardianLicense.endsAt ? ` Vigente hasta ${new Date(`${data.currentGuardianLicense.endsAt}T12:00:00`).toLocaleDateString('es-CL')}.` : ''} Todos los apoderados habilitados de la academia quedan cubiertos.</div> : null}

    <section className="grid gap-5 md:grid-cols-2">
      <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><UserGroupIcon className="h-8 w-8 text-violet-300"/><h2 className="mt-4 text-xl font-black">Qué habilita</h2><ul className="mt-4 space-y-3">{data.guardianAddon.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-[#d4dbe4]"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300"/>{feature}</li>)}</ul><div className="mt-5 rounded-xl border border-white/10 bg-[#0d1117] p-4 text-sm text-[#9aa6b5]">La dirección conserva el control: una solicitud de nueva disciplina no genera cobros hasta que la academia la aprueba y define sus valores.</div></article>
      <article className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><CreditCardIcon className="h-8 w-8 text-[#70e4df]"/><h2 className="mt-4 text-xl font-black">Elige vigencia</h2><div className="mt-4 grid gap-3"><button onClick={() => setCycle('monthly')} className={`rounded-2xl border p-4 text-left ${cycle==='monthly'?'border-[#289E9D] bg-[#289E9D]/10':'border-white/10 bg-[#0d1117]'}`}><b>Mensual</b><p className="mt-1 text-2xl font-black text-white">{money(data.guardianAddon.monthly.chargedNetClp)} <span className="text-xs text-[#8995a4]">+ IVA</span></p></button><button onClick={() => setCycle('annual')} className={`rounded-2xl border p-4 text-left ${cycle==='annual'?'border-[#C8A96B] bg-[#C8A96B]/10':'border-white/10 bg-[#0d1117]'}`}><b>Anual · 2 meses gratis</b><p className="mt-1 text-2xl font-black text-white">{money(data.guardianAddon.annual.chargedNetClp)} <span className="text-xs text-[#8995a4]">+ IVA/año</span></p><p className="mt-1 text-xs text-[#D8BE87]">12 meses de licencia pagando 10</p></button></div>{!active && !data.currentGuardianLicense.trialIncluded ? <button disabled={loading || !data.gateway.configured} onClick={() => void checkout()} className="mt-5 min-h-12 w-full rounded-xl bg-violet-500 px-5 font-black text-white disabled:opacity-40">{loading ? 'Preparando...' : `Contratar ${cycle === 'annual' ? 'anual' : 'mensual'}`}</button> : null}</article>
    </section>

    <section className="flex gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-5 text-sm leading-6 text-sky-100"><ShieldCheckIcon className="h-6 w-6 shrink-0"/>Mercado Pago procesa el pago. Lestra no almacena tarjetas ni claves bancarias. La licencia se activa después de validar el abono.</section>

    {order ? <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur"><div className="w-full max-w-xl rounded-3xl border border-violet-400/25 bg-[#151b25] p-6"><h2 className="text-2xl font-black">Pagar Apoderados PRO</h2><p className="mt-2 text-[#9aa6b5]">Monto exacto con IVA: <b className="text-white">{money(order.amountClp)}</b></p><a href={order.checkoutUrl} target="_blank" rel="noreferrer" className="mt-5 block rounded-xl bg-[#009ee3] px-5 py-3 text-center font-black text-white">Abrir Mercado Pago</a><div className="mt-5 grid gap-3 sm:grid-cols-2"><input value={payer} onChange={(e)=>setPayer(e.target.value)} placeholder="Nombre del pagador" className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3"/><input value={reference} onChange={(e)=>setReference(e.target.value)} placeholder="Referencia opcional" className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3"/></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><button onClick={() => void inform()} className="rounded-xl border border-white/10 px-4 py-3 font-black">Ya pagué</button><button disabled={checking} onClick={() => void check()} className="rounded-xl bg-emerald-500 px-4 py-3 font-black text-emerald-950">{checking?'Revisando...':'Revisar activación'}</button></div><button onClick={()=>setOrder(null)} className="mt-4 w-full text-sm text-[#8995a4]">Cerrar</button></div></div> : null}
  </div>;
}
