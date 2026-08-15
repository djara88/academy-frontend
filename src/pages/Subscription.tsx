import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Plan = {
  code: string;
  name: string;
  priceClp: number;
  professorLimit: number;
  playerLimit: number | null;
  grossClp: number;
};

type Payload = {
  plans: Plan[];
  guardianAddon: { priceClp: number; grossClp: number };
  gateway: { provider: string; configured: boolean; manualVerification?: boolean };
  currentSubscription?: { trial?: boolean; remainingDays?: number };
};

type CheckoutOrder = {
  chargeId: string;
  checkoutUrl: string;
  amountClp: number;
  planName: string;
  guardianLicense: boolean;
  manualVerification: boolean;
  expiresAt: string;
};

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
}).format(value || 0);

const featureMap: Record<string, string[]> = {
  formacion: ['Operación diaria completa', 'Finanzas, uniformes y partidos', 'Hasta 100 jugadores', 'Hasta 3 profesores'],
  competencia: ['Todo Formación', 'Torneos y preparación de partidos', 'Evaluaciones, alertas y exportaciones', '300 jugadores · 10 profesores'],
  alto_rendimiento: ['Todo Competencia', 'Ficha médica y analítica avanzada', 'Marca personalizada', 'Jugadores sin límite · 30 profesores'],
};

const Subscription = () => {
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const [guardians, setGuardians] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [payerName, setPayerName] = useState('');
  const [reference, setReference] = useState('');
  const [informing, setInforming] = useState(false);
  const [checking, setChecking] = useState(false);
  const [orderState, setOrderState] = useState<'ready' | 'notified' | 'paid'>('ready');

  const { data, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => (await api.get('/api/subscriptions/plans')).data.data as Payload,
  });

  const prepareCheckout = async (plan: Plan) => {
    setPaying(plan.code);
    try {
      const response = await api.post('/api/subscriptions/checkout', {
        plan_code: plan.code,
        guardian_license: guardians,
      });
      setOrder(response.data.data as CheckoutOrder);
      setOrderState('ready');
      setPayerName('');
      setReference('');
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible preparar el pago.', { title: 'Contratar Syncademia' });
    } finally {
      setPaying(null);
    }
  };

  const copyAmount = async () => {
    if (!order) return;
    await navigator.clipboard.writeText(String(order.amountClp));
    await notify(`Monto copiado: ${money(order.amountClp)}`, { title: 'Mercado Pago' });
  };

  const informPayment = async () => {
    if (!order) return;
    setInforming(true);
    try {
      await api.patch(`/api/subscriptions/payment-notice/${order.chargeId}`, {
        payer_name: payerName,
        reference,
      });
      setOrderState('notified');
      await notify('Pago informado. Revisaremos el abono y activaremos tu licencia apenas sea validado.', { title: 'Pago recibido' });
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible informar el pago.', { title: 'Mercado Pago' });
    } finally {
      setInforming(false);
    }
  };

  const checkPayment = async () => {
    if (!order) return;
    setChecking(true);
    try {
      const response = await api.get(`/api/subscriptions/payment-status?chargeId=${encodeURIComponent(order.chargeId)}`);
      const paid = response.data.data.estado === 'pagado';
      if (paid) {
        setOrderState('paid');
        await queryClient.invalidateQueries({ queryKey: ['mi-plan'] });
        await queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
        await notify('Tu pago fue validado y la licencia ya está activa.', { title: 'Syncademia activado' });
      } else {
        setOrderState('notified');
        await notify('El pago sigue pendiente de validación. Tu solicitud ya está registrada.', { title: 'Validación pendiente' });
      }
    } catch (err: any) {
      await notify(err.response?.data?.error || 'No fue posible revisar el pago.', { title: 'Mercado Pago' });
    } finally {
      setChecking(false);
    }
  };

  if (isLoading || !data) {
    return <div className="py-20 text-center text-[#91a0b2]">Preparando planes...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-[32px] border border-cyan-300/15 bg-[radial-gradient(circle_at_top_left,rgba(40,158,157,0.24),transparent_38%),linear-gradient(135deg,#121923,#10141d)] px-6 py-10 text-center sm:px-10">
        <div className="absolute right-6 top-6 hidden rounded-full border border-cyan-300/15 bg-cyan-300/5 px-3 py-1 text-xs font-black text-cyan-200 sm:block">
          Pago seguro · Mercado Pago
        </div>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <SparklesIcon className="h-6 w-6" />
        </div>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-[#48d8d0]">Tu siguiente etapa</p>
        <h1 className="mt-3 text-4xl font-black text-white sm:text-5xl">Elige el nivel de gestión ideal</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[#9aa6b5]">
          Precios mensuales en pesos chilenos + IVA. El pago corresponde únicamente a la licencia de Syncademia; nunca procesamos el dinero de tus apoderados.
        </p>
      </header>

      <label className="mx-auto flex max-w-xl cursor-pointer items-center justify-between gap-4 rounded-2xl border border-violet-400/25 bg-violet-500/10 p-5 transition hover:border-violet-300/40">
        <div>
          <p className="font-black text-violet-200">Añadir Apoderados PRO</p>
          <p className="mt-1 text-sm text-violet-200/70">{money(data.guardianAddon.priceClp)} + IVA · {money(data.guardianAddon.grossClp)} total</p>
        </div>
        <input type="checkbox" checked={guardians} onChange={(e) => setGuardians(e.target.checked)} className="h-6 w-6 accent-violet-500" />
      </label>

      <section className="grid gap-5 lg:grid-cols-3">
        {data.plans.map((plan) => {
          const total = plan.grossClp + (guardians ? data.guardianAddon.grossClp : 0);
          const featured = plan.code === 'competencia';
          return (
            <article key={plan.code} className={`group relative flex flex-col overflow-hidden rounded-[28px] border p-6 transition duration-300 hover:-translate-y-1 ${featured ? 'border-[#48d8d0]/80 bg-[linear-gradient(180deg,#192932,#151d25)] shadow-[0_24px_70px_rgba(40,158,157,0.20)]' : 'border-white/10 bg-[#151b25] hover:border-white/20'}`}>
              {featured ? <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#48d8d0] via-cyan-300 to-violet-400" /> : null}
              {featured ? <span className="absolute right-5 top-5 rounded-full bg-[#289E9D] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">Recomendado</span> : null}
              <h2 className="text-2xl font-black text-white">{plan.name}</h2>
              <div className="mt-5">
                <span className="text-4xl font-black text-[#70e4df]">{money(plan.priceClp)}</span>
                <span className="text-sm text-[#91a0b2]"> + IVA / mes</span>
                <p className="mt-2 text-sm font-bold text-white/80">Total a pagar: {money(total)}</p>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {featureMap[plan.code].map((feature) => <li key={feature} className="flex gap-2 text-sm text-[#d6dde5]"><CheckCircleIcon className="h-5 w-5 shrink-0 text-[#48d8d0]" />{feature}</li>)}
              </ul>
              <button disabled={paying !== null || !data.gateway.configured} onClick={() => void prepareCheckout(plan)} className="btn-primary mt-7 min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50">
                {paying === plan.code ? 'Preparando pago...' : data.gateway.configured ? `Elegir ${plan.name}` : 'Pago online en configuración'}
              </button>
            </article>
          );
        })}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5">
        <ShieldCheckIcon className="h-7 w-7 shrink-0 text-emerald-300" />
        <p className="text-sm leading-6 text-emerald-100">
          El pago se realiza directamente en Mercado Pago. Syncademia no almacena tarjetas, claves bancarias ni datos financieros sensibles. La licencia se activa únicamente después de validar el abono.
        </p>
      </div>

      {order ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#070b12]/90 p-4 backdrop-blur-md">
          <div className="relative my-8 w-full max-w-2xl overflow-hidden rounded-[32px] border border-cyan-300/20 bg-[#111923] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#289E9D] via-cyan-300 to-[#5f6fff]" />
            <button onClick={() => setOrder(null)} className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
              <XMarkIcon className="h-5 w-5" />
            </button>

            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#009ee3]/15 text-[#52c7ff]">
                  <CreditCardIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#52c7ff]">Checkout Mercado Pago</p>
                  <h2 className="text-2xl font-black text-white">{order.planName}{order.guardianLicense ? ' + Apoderados PRO' : ''}</h2>
                </div>
              </div>

              {orderState === 'paid' ? (
                <div className="mt-7 rounded-3xl border border-emerald-400/25 bg-emerald-500/10 p-7 text-center">
                  <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-300" />
                  <h3 className="mt-4 text-2xl font-black text-white">Licencia activada</h3>
                  <p className="mt-2 text-sm text-emerald-100/75">El pago fue validado correctamente. Ya puedes usar el plan contratado.</p>
                  <button onClick={() => setOrder(null)} className="btn-primary mt-6 px-8">Continuar en Syncademia</button>
                </div>
              ) : (
                <>
                  <div className="mt-7 rounded-3xl border border-white/10 bg-black/20 p-6 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Monto exacto a ingresar en Mercado Pago</p>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <strong className="text-4xl font-black text-white sm:text-5xl">{money(order.amountClp)}</strong>
                      <button onClick={() => void copyAmount()} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white" title="Copiar monto">
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-white/45">Orden Syncademia #{order.chargeId.slice(0, 8).toUpperCase()}</p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {[
                      ['1', 'Abre Mercado Pago', 'Se abrirá en una pestaña nueva.'],
                      ['2', `Ingresa ${money(order.amountClp)}`, 'Usa exactamente el monto mostrado.'],
                      ['3', 'Informa tu pago', 'Lo validamos y activamos tu licencia.'],
                    ].map(([step, title, detail]) => (
                      <div key={step} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#009ee3]/15 text-xs font-black text-[#52c7ff]">{step}</span>
                        <p className="mt-3 text-sm font-black text-white">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-white/45">{detail}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => window.open(order.checkoutUrl, '_blank', 'noopener,noreferrer')} className="mt-6 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#009ee3] px-6 text-base font-black text-white shadow-[0_16px_45px_rgba(0,158,227,0.25)] transition hover:-translate-y-0.5 hover:bg-[#00aef0]">
                    Pagar con Mercado Pago <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </button>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-violet-300" /><h3 className="font-black text-white">¿Ya pagaste?</h3></div>
                    <p className="mt-1 text-sm text-white/50">Déjanos un dato para encontrar tu operación más rápido. La referencia es opcional.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Nombre del pagador" maxLength={120} className="w-full" />
                      <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Referencia / operación (opcional)" maxLength={120} className="w-full" />
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button disabled={informing} onClick={() => void informPayment()} className="btn-primary flex-1 disabled:opacity-50">{informing ? 'Informando...' : orderState === 'notified' ? 'Pago informado ✓' : 'Informar que ya pagué'}</button>
                      <button disabled={checking} onClick={() => void checkPayment()} className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white transition hover:bg-white/5 disabled:opacity-50">{checking ? 'Revisando...' : 'Revisar activación'}</button>
                    </div>
                  </div>

                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
                    <ShieldCheckIcon className="h-5 w-5 shrink-0 text-emerald-300" />
                    <p className="text-xs leading-5 text-emerald-100/65">Tu pago se procesa fuera de Syncademia en el sitio seguro de Mercado Pago. Nunca te pediremos la contraseña de tu banco ni los datos completos de tu tarjeta.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Subscription;
