import { useQuery } from '@tanstack/react-query';
import { BanknotesIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type StatementItem = {
  chargeId: string;
  quotaId?: string | null;
  label: string;
  amount: number;
  installment?: string | null;
  dueDate?: string | null;
  overdue?: boolean;
};
type FinanceStatement = {
  saldo_total: number;
  saldo_vencido: number;
  conceptos: StatementItem[];
  metodos_pago?: {
    acepta_efectivo?: boolean;
    acepta_transferencia?: boolean;
    acepta_pago_online?: boolean;
    transferencia_banco?: string | null;
    transferencia_tipo_cuenta?: string | null;
    transferencia_numero?: string | null;
    transferencia_rut?: string | null;
    transferencia_correo?: string | null;
    link_pago_online?: string | null;
  } | null;
};

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0);
const validUrl = (value?: string | null) => { try { const url = new URL(value || ''); return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null; } catch { return null; } };

export default function GuardianFinanceStatement() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['guardian-finance-installments'],
    queryFn: async () => (await api.get('/api/apoderados/me/inscripciones-deportivas/finanzas')).data.data as FinanceStatement,
  });

  if (isLoading) return <section className="rounded-3xl border border-white/10 bg-[#151b25] p-6 text-sm text-[#8995a4]">Cargando calendario de pagos...</section>;
  if (error || !data) return <section className="rounded-3xl border border-red-400/20 bg-red-500/5 p-5 text-sm text-red-200">No fue posible cargar el detalle de cuotas.</section>;

  return <section className="rounded-3xl border border-[#289E9D]/20 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.12),transparent_38%),#151b25] p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#289E9D]/15 p-2.5"><BanknotesIcon className="h-6 w-6 text-[#70e4df]" /></div><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Detalle financiero</p><h2 className="mt-1 text-xl font-black text-white">Calendario real de cuotas</h2><p className="mt-1 text-sm text-[#8995a4]">Cada cuota muestra su propio vencimiento y saldo pendiente.</p></div></div><div className="grid grid-cols-2 gap-2 text-right"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Pendiente</p><p className="mt-1 text-lg font-black text-amber-300">{money(data.saldo_total)}</p></div><div className="rounded-xl border border-red-400/15 bg-red-500/5 p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Vencido</p><p className="mt-1 text-lg font-black text-red-300">{money(data.saldo_vencido)}</p></div></div></div>

    <div className="mt-5 space-y-2">{data.conceptos.length ? data.conceptos.map((item) => <article key={`${item.chargeId}-${item.quotaId || 'single'}`} className={`rounded-2xl border p-4 ${item.overdue ? 'border-red-400/20 bg-red-500/5' : 'border-white/10 bg-[#101620]'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-white">{item.label}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 text-[#8995a4]"><CalendarDaysIcon className="h-4 w-4" />Vence {item.dueDate || 'sin fecha'}</span>{item.installment ? <span className="rounded-full bg-[#289E9D]/10 px-2 py-1 font-black text-[#70e4df]">{item.installment}</span> : null}{item.overdue ? <span className="rounded-full bg-red-500/10 px-2 py-1 font-black text-red-300">Vencida</span> : null}</div></div><p className={`text-lg font-black ${item.overdue ? 'text-red-300' : 'text-amber-300'}`}>{money(item.amount)}</p></div></article>) : <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-6 text-center"><p className="font-black text-emerald-300">Cuenta al día</p><p className="mt-1 text-sm text-[#8995a4]">No tienes cuotas pendientes registradas.</p></div>}</div>

    {data.metodos_pago && data.saldo_total > 0 ? <div className="mt-5 border-t border-white/10 pt-5"><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Formas habilitadas por la academia</p><div className="mt-3 flex flex-wrap gap-2">{data.metodos_pago.acepta_efectivo ? <span className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-xs font-black text-[#b6c0cc]">💵 Efectivo</span> : null}{data.metodos_pago.acepta_transferencia ? <span className="rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-xs font-black text-[#b6c0cc]">🏦 Transferencia · {data.metodos_pago.transferencia_banco || 'datos en academia'}</span> : null}{data.metodos_pago.acepta_pago_online && validUrl(data.metodos_pago.link_pago_online) ? <a href={validUrl(data.metodos_pago.link_pago_online) || '#'} target="_blank" rel="noreferrer" className="rounded-lg bg-violet-500 px-3 py-2 text-xs font-black text-white">💳 Pago en línea</a> : null}</div><p className="mt-3 text-[11px] leading-5 text-[#697586]">Los fondos pertenecen a la academia. Una transferencia informada solo se descuenta después de la validación de Dirección.</p></div> : null}
  </section>;
}
