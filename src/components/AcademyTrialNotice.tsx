import { Link } from 'react-router-dom';
import { BRAND } from '../config/brand';

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
  return <div className={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${critical ? 'border-amber-400/35 bg-amber-500/10' : 'border-[#289E9D]/35 bg-[#289E9D]/10'}`}>
    <div><p className={`text-xs font-black uppercase tracking-[0.16em] ${critical ? 'text-amber-300' : 'text-[#70e4df]'}`}>Prueba Full · todos los módulos habilitados</p><p className="mt-1 text-sm font-bold text-white">{subscription.remainingDays === 0 ? `Vence en ${subscription.remainingHours} horas` : `${subscription.remainingDays} días restantes`} · Explora {BRAND.name} sin restricciones.</p></div>
    {canManage ? <Link to="/suscripcion" className="min-h-10 shrink-0 rounded-xl bg-white px-4 py-2 text-center text-sm font-black text-[#17202b] hover:bg-[#dffaf8]">Ver planes</Link> : <span className="text-xs font-bold text-[#dffaf8]">La dirección administra la licencia</span>}
  </div>;
};

export const AcademyBlocked = ({ subscription, canManage = true }: { subscription?: Subscription | null; canManage?: boolean }) => (
  <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center p-5">
    <section className="w-full rounded-[30px] border border-amber-400/30 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_38%),#151b25] p-8 text-center sm:p-12">
      <div className="text-5xl">⏳</div><p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-amber-300">Acceso pausado</p>
      <h1 className="mt-2 text-3xl font-black text-white">Tu período Full de 15 días finalizó</h1>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-[#aab4c0]">Tus datos continúan seguros. Selecciona un plan para recuperar inmediatamente el acceso de tu academia.</p>
      {subscription?.reason ? <p className="mt-3 text-sm text-amber-200">{subscription.reason}</p> : null}
      {canManage ? <Link to="/suscripcion" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#289E9D] px-7 py-3 font-black text-white hover:bg-[#207f7e]">Activar {BRAND.name}</Link> : <p className="mt-8 font-black text-[#70e4df]">Solicita a la dirección de tu academia que active la licencia.</p>}
    </section>
  </div>
);
