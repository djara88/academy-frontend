import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BanknotesIcon, CalendarDaysIcon, CreditCardIcon } from '@heroicons/react/24/outline';
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
const keyOf = (item: StatementItem) => `${item.chargeId}:${item.quotaId || ''}`;

export default function GuardianFinanceStatement() {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['guardian-finance-installments'],
    queryFn: async () => (await api.get('/api/apoderados/me/inscripciones-deportivas/finanzas')).data.data as FinanceStatement,
  });

  const selected = useMemo(() => (data?.conceptos || []).filter((item) => selectedKeys.includes(keyOf(item))), [data?.conceptos, selectedKeys]);
  const selectedTotal = selected.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const onlineEnabled = data?.metodos_pago?.acepta_pago_online === true;

  const toggle = (item: StatementItem) => {
    const key = keyOf(item);
    setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
    setPayError('');
  };

  const toggleAll = () => {
    if (!data?.conceptos.length) return;
    const all = data.conceptos.map(keyOf);
    setSelectedKeys((current) => current.length === all.length ? [] : all);
    setPayError('');
  };

  const payOnline = async () => {
    if (!selected.length) return setPayError('Selecciona al menos una cuota o concepto para pagar.');
    setPaying(true);
    setPayError('');
    try {
      const tokenResponse = await api.post('/api/apoderados/me/pagos/token');
      const token = tokenResponse.data?.data?.token;
      if (!token) throw new Error('No fue posible crear una sesión de pago segura.');
      const checkoutResponse = await api.post(`/api/mercadopago/academy/checkout/${encodeURIComponent(token)}`, {
        items: selected.map((item) => ({ cobro_id: item.chargeId, cuota_id: item.quotaId || null })),
      });
      const checkoutUrl = checkoutResponse.data?.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error('Mercado Pago no devolvió el enlace de pago.');
      window.location.assign(checkoutUrl);
    } catch (paymentError: any) {
      setPayError(paymentError?.response?.data?.error || paymentError?.message || 'No fue posible preparar el pago con Mercado Pago.');
      setPaying(false);
    }
  };

  if (isLoading) return <section className="rounded-[24px] border border-[#dfe5dc] bg-white p-6 text-sm font-bold text-[#697468]">Cargando calendario de pagos...</section>;
  if (error || !data) return <section className="rounded-[24px] border border-red-200 bg-red-50 p-5 text-sm font-bold text-red-700">No fue posible cargar el detalle de cuotas.</section>;

  return <section className="overflow-hidden rounded-[28px] border border-[#dfe5dc] bg-white shadow-[0_16px_44px_rgba(20,29,21,.06)]">
    <div className="border-b border-[#e5e9e2] bg-[radial-gradient(circle_at_top_right,rgba(202,255,0,.18),transparent_38%),#f8faf5] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-[#111711]"><BanknotesIcon className="h-6 w-6 text-[#caff00]" /></div>
          <div><p className="text-[11px] font-black uppercase tracking-[.16em] text-[#789600]">Detalle financiero</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Tus pagos y cuotas</h2><p className="mt-1 text-sm text-[#697468]">Revisa vencimientos y paga directamente desde tu portal.</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[16px] border border-[#dfe5dc] bg-white px-4 py-3 text-right"><p className="text-[10px] font-black uppercase text-[#7c867b]">Pendiente</p><p className="mt-1 text-lg font-black text-[#111711]">{money(data.saldo_total)}</p></div>
          <div className={`rounded-[16px] border px-4 py-3 text-right ${data.saldo_vencido > 0 ? 'border-red-200 bg-red-50' : 'border-[#dfe5dc] bg-white'}`}><p className="text-[10px] font-black uppercase text-[#7c867b]">Vencido</p><p className={`mt-1 text-lg font-black ${data.saldo_vencido > 0 ? 'text-red-700' : 'text-[#111711]'}`}>{money(data.saldo_vencido)}</p></div>
        </div>
      </div>
    </div>

    <div className="p-5 sm:p-6">
      {onlineEnabled && data.conceptos.length ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#dfe5dc] bg-[#f8faf6] px-4 py-3"><div><p className="text-xs font-black uppercase tracking-[.12em] text-[#789600]">Mercado Pago activo</p><p className="mt-1 text-xs text-[#697468]">Selecciona exactamente qué cuotas quieres pagar.</p></div><button type="button" onClick={toggleAll} className="rounded-xl border border-[#cfd7cb] bg-white px-3 py-2 text-xs font-black text-[#111711]">{selectedKeys.length === data.conceptos.length ? 'Quitar selección' : 'Seleccionar todo'}</button></div> : null}

      <div className="space-y-2">{data.conceptos.length ? data.conceptos.map((item) => {
        const selectedItem = selectedKeys.includes(keyOf(item));
        return <article key={keyOf(item)} className={`rounded-[18px] border p-4 transition ${selectedItem ? 'border-[#9fcf00] bg-[#f4fadf]' : item.overdue ? 'border-red-200 bg-red-50/60' : 'border-[#e1e6df] bg-[#fbfcfa]'}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {onlineEnabled ? <input aria-label={`Seleccionar ${item.label}`} type="checkbox" checked={selectedItem} onChange={() => toggle(item)} className="mt-1 h-5 w-5 shrink-0 accent-[#9fcf00]" /> : null}
              <div className="min-w-0"><p className="font-black text-[#111711]">{item.label}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1 text-[#697468]"><CalendarDaysIcon className="h-4 w-4" />Vence {item.dueDate || 'sin fecha'}</span>{item.installment ? <span className="rounded-full bg-[#edf5d6] px-2 py-1 font-black text-[#587100]">{item.installment}</span> : null}{item.overdue ? <span className="rounded-full bg-red-100 px-2 py-1 font-black text-red-700">Vencida</span> : null}</div></div>
            </div>
            <p className={`text-lg font-black ${item.overdue ? 'text-red-700' : 'text-[#111711]'}`}>{money(item.amount)}</p>
          </div>
        </article>;
      }) : <div className="rounded-[18px] border border-[#cde995] bg-[#f3fadf] p-7 text-center"><p className="font-black text-[#4f6900]">Cuenta al día</p><p className="mt-1 text-sm text-[#697468]">No tienes cuotas pendientes registradas.</p></div>}</div>

      {onlineEnabled && selected.length ? <div className="mt-5 rounded-[20px] border border-[#111711] bg-[#111711] p-4 sm:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#caff00]">{selected.length} concepto(s) seleccionados</p><p className="mt-1 text-2xl font-black text-white">Total {money(selectedTotal)}</p></div><button type="button" disabled={paying} onClick={() => void payOnline()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#caff00] px-5 text-sm font-black text-[#111711] transition hover:bg-[#b9e937] disabled:opacity-50"><CreditCardIcon className="h-5 w-5" />{paying ? 'Preparando Mercado Pago…' : 'Pagar con Mercado Pago'}</button></div></div> : null}
      {payError ? <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{payError}</div> : null}

      {data.metodos_pago && data.saldo_total > 0 ? <div className="mt-5 border-t border-[#e5e9e2] pt-5"><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#7c867b]">Otras formas habilitadas</p><div className="mt-3 flex flex-wrap gap-2">{data.metodos_pago.acepta_efectivo ? <span className="rounded-lg border border-[#dfe5dc] bg-[#f8faf6] px-3 py-2 text-xs font-black text-[#4f594f]">💵 Efectivo</span> : null}{data.metodos_pago.acepta_transferencia ? <span className="rounded-lg border border-[#dfe5dc] bg-[#f8faf6] px-3 py-2 text-xs font-black text-[#4f594f]">🏦 Transferencia · {data.metodos_pago.transferencia_banco || 'datos en academia'}</span> : null}{onlineEnabled ? <span className="rounded-lg border border-[#cde995] bg-[#f3fadf] px-3 py-2 text-xs font-black text-[#4f6900]">💳 Mercado Pago conectado</span> : null}</div><p className="mt-3 text-[11px] leading-5 text-[#7c867b]">Los fondos llegan a la cuenta Mercado Pago de la academia. Una transferencia informada solo se descuenta después de la validación de Dirección.</p></div> : null}
    </div>
  </section>;
}
