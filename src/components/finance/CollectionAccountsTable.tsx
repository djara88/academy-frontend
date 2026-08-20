import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export type FinanceQuota = {
  id: string;
  numero: number;
  total_cuotas: number;
  monto: number;
  monto_pagado: number;
  saldo: number;
  fecha_vencimiento: string;
  estado: string;
};

export type FinanceCharge = {
  id: string;
  concepto: string;
  tipo_concepto?: string | null;
  monto: number;
  monto_pagado: number;
  saldo: number;
  estado: string;
  fecha_vencimiento?: string | null;
  cuotas?: FinanceQuota[];
};

export type CollectionAccount = {
  id: string;
  nombre: string;
  tutor_id?: string | null;
  tutor?: { id: string; nombre: string; email?: string | null; telefono?: string | null } | null;
  saldo_total: number;
  saldo_vencido: number;
  proximo_vencimiento?: string | null;
  estado_cuenta: 'vencido' | 'pendiente' | 'al_dia';
  cobros: FinanceCharge[];
};

export type AccountMeta = { page: number; page_size: number; total: number; pages: number };

type Props = {
  accounts: CollectionAccount[];
  meta: AccountMeta;
  loading: boolean;
  search: string;
  status: string;
  pageSize: number;
  selectedTutorIds: Set<string>;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (value: number) => void;
  onPageSize: (value: number) => void;
  onSelection: (value: Set<string>) => void;
  onPayment: (charge: FinanceCharge) => void;
  onReminder: (tutorIds: string[], onlyOverdue: boolean) => void;
};

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const badge = (status: CollectionAccount['estado_cuenta']) => status === 'vencido'
  ? 'bg-red-500/10 text-red-300 border-red-400/20'
  : status === 'pendiente'
    ? 'bg-amber-500/10 text-amber-300 border-amber-400/20'
    : 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20';
const label = (status: CollectionAccount['estado_cuenta']) => status === 'vencido' ? 'Vencido' : status === 'pendiente' ? 'Pendiente' : 'Al día';

export default function CollectionAccountsTable(props: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const visibleTutorIds = useMemo(() => [...new Set(props.accounts.filter((row) => row.tutor_id && row.saldo_total > 0).map((row) => String(row.tutor_id)))], [props.accounts]);
  const allVisibleSelected = visibleTutorIds.length > 0 && visibleTutorIds.every((id) => props.selectedTutorIds.has(id));

  const toggleVisible = () => {
    const next = new Set(props.selectedTutorIds);
    if (allVisibleSelected) visibleTutorIds.forEach((id) => next.delete(id));
    else visibleTutorIds.forEach((id) => next.add(id));
    props.onSelection(next);
  };

  const toggleTutor = (id?: string | null) => {
    if (!id) return;
    const next = new Set(props.selectedTutorIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    props.onSelection(next);
  };

  return <section className="space-y-4">
    <div className="rounded-2xl border border-white/10 bg-[#151b25] p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_140px_auto] lg:items-center">
        <input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Buscar alumno, apoderado, correo o teléfono" className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]" />
        <select value={props.status} onChange={(event) => props.onStatus(event.target.value)} className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white">
          <option value="todos">Todos los estados</option><option value="vencido">Con deuda vencida</option><option value="pendiente">Pendiente no vencido</option><option value="al_dia">Al día</option>
        </select>
        <select value={props.pageSize} onChange={(event) => props.onPageSize(Number(event.target.value))} className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white">
          <option value={25}>25 por página</option><option value={50}>50 por página</option><option value={100}>100 por página</option>
        </select>
        <button type="button" onClick={() => props.onReminder([...props.selectedTutorIds], false)} disabled={!props.selectedTutorIds.size} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Enviar a seleccionados ({props.selectedTutorIds.size})</button>
      </div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151b25]">
      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-[#0d1117] text-[10px] uppercase tracking-wider text-[#697586]"><tr>
            <th className="w-12 px-4 py-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Seleccionar apoderados visibles" /></th>
            <th className="px-4 py-3">Alumno / apoderado</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Pendiente</th><th className="px-4 py-3 text-right">Vencido</th><th className="px-4 py-3">Próximo vencimiento</th><th className="px-4 py-3 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-white/10">
            {props.loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-[#8995a4]">Cargando cuentas corrientes...</td></tr> : props.accounts.map((account) => {
              const isExpanded = expanded === account.id;
              const selected = Boolean(account.tutor_id && props.selectedTutorIds.has(String(account.tutor_id)));
              return <tr key={account.id} className="align-top">
                <td className="px-4 py-4"><input type="checkbox" checked={selected} disabled={!account.tutor_id || account.saldo_total <= 0} onChange={() => toggleTutor(account.tutor_id)} aria-label={`Seleccionar ${account.nombre}`} /></td>
                <td className="px-4 py-4"><p className="font-black text-white">{account.nombre}</p><p className="mt-1 text-xs text-[#8995a4]">{account.tutor?.nombre || 'Sin apoderado principal'}</p><p className="text-[11px] text-[#697586]">{account.tutor?.email || account.tutor?.telefono || 'Sin contacto de cobranza'}</p></td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${badge(account.estado_cuenta)}`}>{label(account.estado_cuenta)}</span></td>
                <td className="px-4 py-4 text-right font-black text-amber-300">{money(account.saldo_total)}</td>
                <td className="px-4 py-4 text-right font-black text-red-300">{money(account.saldo_vencido)}</td>
                <td className="px-4 py-4 text-[#b6c0cc]">{account.proximo_vencimiento || '—'}</td>
                <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => account.tutor_id && props.onReminder([String(account.tutor_id)], account.saldo_vencido > 0)} disabled={!account.tutor_id || account.saldo_total <= 0} title="Enviar estado de cuenta" className="rounded-lg border border-[#289E9D]/30 p-2 text-[#70e4df] disabled:opacity-30"><EnvelopeIcon className="h-4 w-4" /></button><button type="button" onClick={() => setExpanded(isExpanded ? null : account.id)} className="rounded-lg border border-white/10 p-2 text-[#b6c0cc]">{isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}</button></div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {!props.loading && !props.accounts.length ? <div className="p-10 text-center text-sm text-[#697586]">No hay cuentas que coincidan con los filtros.</div> : null}
    </div>

    {expanded ? (() => {
      const account = props.accounts.find((row) => row.id === expanded);
      if (!account) return null;
      return <div className="rounded-2xl border border-[#289E9D]/20 bg-[#101620] p-4 sm:p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Detalle de cuenta</p><h3 className="mt-1 text-lg font-black text-white">{account.nombre}</h3></div><button type="button" onClick={() => setExpanded(null)} className="text-xs font-black text-[#8995a4]">Cerrar</button></div><div className="mt-4 space-y-3">{account.cobros.filter((charge) => charge.estado !== 'Anulado').map((charge) => <article key={charge.id} className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black text-white">{charge.concepto}</p><p className="mt-1 text-xs text-[#697586]">{charge.tipo_concepto || 'Cobro'} · total {money(charge.monto)} · pagado {money(charge.monto_pagado)}</p></div>{charge.saldo > 0 ? <button type="button" onClick={() => props.onPayment(charge)} className="rounded-lg border border-[#289E9D]/30 px-3 py-2 text-xs font-black text-[#70e4df]">Registrar abono</button> : <span className="text-xs font-black text-emerald-300">Pagado</span>}</div>{charge.cuotas?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{charge.cuotas.map((quota) => <div key={quota.id} className="rounded-lg border border-white/10 bg-[#151b25] p-3"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">Cuota {quota.numero}/{quota.total_cuotas}</p><span className={`text-[10px] font-black ${quota.saldo <= 0 ? 'text-emerald-300' : quota.fecha_vencimiento < new Date().toISOString().slice(0, 10) ? 'text-red-300' : 'text-amber-300'}`}>{quota.saldo <= 0 ? 'Pagada' : money(quota.saldo)}</span></div><p className="mt-1 text-[11px] text-[#697586]">Vence {quota.fecha_vencimiento}</p></div>)}</div> : <p className="mt-3 text-xs text-[#8995a4]">Vencimiento: {charge.fecha_vencimiento || 'Sin fecha'} · saldo: {money(charge.saldo)}</p>}</article>)}</div></div>;
    })() : null}

    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#151b25] p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#8995a4]">{props.meta.total} alumno(s) · página {props.meta.page}{props.meta.pages ? ` de ${props.meta.pages}` : ''}</p><div className="flex gap-2"><button type="button" disabled={props.meta.page <= 1} onClick={() => props.onPage(props.meta.page - 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-[#b6c0cc] disabled:opacity-30">Anterior</button><button type="button" disabled={!props.meta.pages || props.meta.page >= props.meta.pages} onClick={() => props.onPage(props.meta.page + 1)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-[#b6c0cc] disabled:opacity-30">Siguiente</button></div></div>
  </section>;
}
