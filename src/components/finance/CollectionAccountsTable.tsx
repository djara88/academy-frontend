import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorPanel,
} from '../director/DirectorModule';

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
  ? 'border-rose-200 bg-rose-50 text-rose-800'
  : status === 'pendiente'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
const label = (status: CollectionAccount['estado_cuenta']) => status === 'vencido' ? 'Vencido' : status === 'pendiente' ? 'Pendiente' : 'Al día';
const today = () => new Date().toISOString().slice(0, 10);

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

  const expandedAccount = expanded ? props.accounts.find((row) => row.id === expanded) || null : null;

  return <section className="space-y-3">
    <DirectorPanel className="p-3 sm:p-4">
      <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_140px_auto] lg:items-end">
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Buscar cuenta</span>
          <input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Alumno, apoderado, correo o teléfono" className={DIRECTOR_FIELD} />
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Estado</span>
          <select value={props.status} onChange={(event) => props.onStatus(event.target.value)} className={DIRECTOR_FIELD}>
            <option value="todos">Todos</option><option value="vencido">Deuda vencida</option><option value="pendiente">Pendiente</option><option value="al_dia">Al día</option>
          </select>
        </label>
        <label>
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Filas</span>
          <select value={props.pageSize} onChange={(event) => props.onPageSize(Number(event.target.value))} className={DIRECTOR_FIELD}>
            <option value={25}>25 por página</option><option value={50}>50 por página</option><option value={100}>100 por página</option>
          </select>
        </label>
        <button type="button" onClick={() => props.onReminder([...props.selectedTutorIds], false)} disabled={!props.selectedTutorIds.size} className={DIRECTOR_BUTTON}>Enviar a seleccionados ({props.selectedTutorIds.size})</button>
      </div>
    </DirectorPanel>

    <DirectorPanel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[#e1e6de] bg-[#f7f9f5] text-[10px] uppercase tracking-wider text-[#697468]"><tr>
            <th className="w-12 px-4 py-3"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={allVisibleSelected} onChange={toggleVisible} aria-label="Seleccionar apoderados visibles" /></th>
            <th className="px-4 py-3">Alumno / apoderado</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Pendiente</th><th className="px-4 py-3 text-right">Vencido</th><th className="px-4 py-3">Próximo vencimiento</th><th className="px-4 py-3 text-right">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-[#e6ebe3]">
            {props.loading ? <tr><td colSpan={7} className="px-4 py-10 text-center font-semibold text-[#697468]">Cargando cuentas corrientes…</td></tr> : props.accounts.map((account) => {
              const isExpanded = expanded === account.id;
              const selected = Boolean(account.tutor_id && props.selectedTutorIds.has(String(account.tutor_id)));
              return <tr key={account.id} className="align-top transition hover:bg-[#fafbf9]">
                <td className="px-4 py-4"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={selected} disabled={!account.tutor_id || account.saldo_total <= 0} onChange={() => toggleTutor(account.tutor_id)} aria-label={`Seleccionar ${account.nombre}`} /></td>
                <td className="px-4 py-4"><p className="font-black text-[#111711]">{account.nombre}</p><p className="mt-1 text-xs text-[#697468]">{account.tutor?.nombre || 'Sin apoderado principal'}</p><p className="text-[11px] text-[#7a8478]">{account.tutor?.email || account.tutor?.telefono || 'Sin contacto de cobranza'}</p></td>
                <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${badge(account.estado_cuenta)}`}>{label(account.estado_cuenta)}</span></td>
                <td className="px-4 py-4 text-right font-black text-amber-700">{money(account.saldo_total)}</td>
                <td className="px-4 py-4 text-right font-black text-rose-700">{money(account.saldo_vencido)}</td>
                <td className="px-4 py-4 text-[#596456]">{account.proximo_vencimiento || '—'}</td>
                <td className="px-4 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => account.tutor_id && props.onReminder([String(account.tutor_id)], account.saldo_vencido > 0)} disabled={!account.tutor_id || account.saldo_total <= 0} title="Enviar estado de cuenta" className="grid h-9 w-9 place-items-center rounded-lg border border-[#cfd8cb] bg-white text-[#617200] transition hover:bg-[#f4f8ea] disabled:opacity-30"><EnvelopeIcon className="h-4 w-4" /></button><button type="button" onClick={() => setExpanded(isExpanded ? null : account.id)} aria-expanded={isExpanded} className="grid h-9 w-9 place-items-center rounded-lg border border-[#d7ded4] bg-white text-[#596456] transition hover:bg-[#f7f9f5]">{isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}</button></div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {!props.loading && !props.accounts.length ? <div className="p-10 text-center text-sm font-semibold text-[#697468]">No hay cuentas que coincidan con los filtros.</div> : null}
    </DirectorPanel>

    {expandedAccount ? <DirectorPanel className="overflow-hidden border-[#cfe39f]">
      <header className="flex items-center justify-between gap-3 border-b border-[#e2e7df] bg-[#f7faed] p-4 sm:p-5"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#6d8700]">Detalle de cuenta</p><h3 className="mt-1 text-lg font-black text-[#111711]">{expandedAccount.nombre}</h3></div><button type="button" onClick={() => setExpanded(null)} className={DIRECTOR_BUTTON_GHOST}>Cerrar</button></header>
      <div className="grid gap-2 p-3 sm:p-4">{expandedAccount.cobros.filter((charge) => charge.estado !== 'Anulado').map((charge) => <article key={charge.id} className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black text-[#111711]">{charge.concepto}</p><p className="mt-1 text-xs text-[#697468]">{charge.tipo_concepto || 'Cobro'} · total {money(charge.monto)} · pagado {money(charge.monto_pagado)}</p></div>{charge.saldo > 0 ? <button type="button" onClick={() => props.onPayment(charge)} className={`${DIRECTOR_BUTTON} min-h-10 px-3 text-xs`}>Registrar abono</button> : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">Pagado</span>}</div>
        {charge.cuotas?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{charge.cuotas.map((quota) => <div key={quota.id} className="rounded-xl border border-[#e0e5dd] bg-white p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-[#111711]">Cuota {quota.numero}/{quota.total_cuotas}</p><span className={`text-[10px] font-black ${quota.saldo <= 0 ? 'text-emerald-700' : quota.fecha_vencimiento < today() ? 'text-rose-700' : 'text-amber-700'}`}>{quota.saldo <= 0 ? 'Pagada' : money(quota.saldo)}</span></div><p className="mt-1 text-[11px] text-[#697468]">Vence {quota.fecha_vencimiento}</p></div>)}</div> : <p className="mt-3 text-xs text-[#697468]">Vencimiento: {charge.fecha_vencimiento || 'Sin fecha'} · saldo: {money(charge.saldo)}</p>}
      </article>)}</div>
    </DirectorPanel> : null}

    <DirectorPanel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"><p className="text-xs font-semibold text-[#697468]">{props.meta.total} alumno(s) · página {props.meta.page}{props.meta.pages ? ` de ${props.meta.pages}` : ''}</p><div className="flex gap-2"><button type="button" disabled={props.meta.page <= 1} onClick={() => props.onPage(props.meta.page - 1)} className={DIRECTOR_BUTTON_GHOST}>Anterior</button><button type="button" disabled={!props.meta.pages || props.meta.page >= props.meta.pages} onClick={() => props.onPage(props.meta.page + 1)} className={DIRECTOR_BUTTON_GHOST}>Siguiente</button></div></DirectorPanel>
  </section>;
}
