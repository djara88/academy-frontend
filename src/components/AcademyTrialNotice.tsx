import { Link } from 'react-router-dom';

type Subscription = {
  status: string;
  blocked: boolean;
  trial: boolean;
  trialEndsAt?: string | null;
  remainingDays?: number | null;
  remainingHours?: number | null;
  urgency?: string | null;
  reason?: string | null;
};

export const AcademyTrialNotice = ({ subscription, canManage = true }: { subscription?: Subscription | null; canManage?: boolean }) => {
  if (!subscription?.trial || subscription.blocked) return null;
  const critical = ['critical', 'high'].includes(subscription.urgency || '');
  const timeLeft = subscription.remainingDays === 0
    ? `Te quedan ${subscription.remainingHours ?? 0} horas de prueba.`
    : `Te quedan ${subscription.remainingDays ?? 0} días de prueba.`;

  return <div className={`lestra-trial-notice mb-5 flex flex-col gap-3 rounded-[22px] border bg-white px-5 py-4 shadow-[0_12px_34px_rgba(25,35,25,.045)] sm:flex-row sm:items-center sm:justify-between ${critical ? 'border-amber-300/70' : 'border-[#d3dad0]'}`}>
    <div>
      <p className={`text-xs font-black uppercase tracking-[0.16em] ${critical ? 'text-amber-700' : 'text-[#647d00]'}`}>Prueba activa</p>
      <p className="mt-1 text-sm font-black text-[#172018]">{timeLeft} <span className="font-semibold text-[#8a9489]">Puedes usar todas las funciones.</span></p>
    </div>
    {canManage ? <Link to="/suscripcion" className="min-h-10 shrink-0 rounded-xl border border-[#d3dad0] bg-white px-4 py-2 text-center text-sm font-black text-[#172018] transition hover:border-[#b9e937] hover:bg-[#f5f9e9]">Elegir plan</Link> : <span className="text-xs font-bold text-[#697469]">La dirección se encarga del plan</span>}
  </div>;
};

export const AcademyBlocked = ({ subscription, canManage = true }: { subscription?: Subscription | null; canManage?: boolean }) => (
  <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center p-5">
    <section className="relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(202,255,0,.14),transparent_31%),linear-gradient(135deg,#0b110d,#172018)] p-8 text-center shadow-[0_30px_90px_rgba(12,18,13,.24)] sm:p-12">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#caff00] text-3xl text-[#0b110d]">⏳</div>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-[#caff00]">Prueba finalizada</p>
      <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Tu información sigue aquí</h1>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-[#c7d0c8]">La prueba terminó, pero no perdiste nada. Elige un plan para seguir trabajando con tu academia.</p>
      {subscription?.reason ? <p className="mt-3 text-sm text-[#dce3dc]">{subscription.reason}</p> : null}
      {canManage ? <Link to="/suscripcion" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#caff00] px-7 py-3 font-black text-[#0b110d] transition hover:bg-[#b9e937]">Elegir plan y continuar</Link> : <p className="mt-8 font-black text-[#caff00]">Pide a la dirección que active un plan para continuar.</p>}
    </section>
  </div>
);
