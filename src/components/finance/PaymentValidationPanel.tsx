import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import {
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorPanel,
} from '../director/DirectorModule';

export type ReportedPayment = {
  id: string;
  monto: number;
  metodo_pago: string;
  fecha_pago_informada: string;
  comprobante_ref?: string | null;
  observaciones?: string | null;
  estado: string;
  created_at: string;
  motivo_rechazo?: string | null;
  jugadores?: { id: string; nombre: string } | null;
  tutores?: { id: string; nombre?: string | null; nombre_completo?: string | null; email?: string | null; telefono?: string | null } | null;
  cobros?: { id: string; concepto: string; monto: number; monto_pagado: number; estado: string; fecha_vencimiento?: string | null } | null;
  cobro_cuotas?: { id: string; numero: number; total_cuotas: number; monto: number; monto_pagado: number; fecha_vencimiento: string; estado: string } | null;
};

type Props = {
  rows: ReportedPayment[];
  filter: string;
  loading: boolean;
  busyId?: string | null;
  onFilter: (value: string) => void;
  onValidate: (id: string) => void;
  onReject: (id: string, reason: string) => void;
};

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const statusClass = (status: string) => status === 'Validado'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : status === 'Rechazado'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';

export default function PaymentValidationPanel({ rows, filter, loading, busyId, onFilter, onValidate, onReject }: Props) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const submitReject = (id: string) => {
    if (!reason.trim()) return;
    onReject(id, reason.trim());
    setRejecting(null);
    setReason('');
  };

  return <section className="space-y-3">
    <DirectorPanel className="border-amber-200 bg-amber-50/40 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-800">Control de caja</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Pagos informados por validar</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#596456]">Una transferencia informada <strong>no modifica la deuda</strong>. Solo “Validar” crea el ingreso real y descuenta el saldo.</p>
        </div>
        <label className="min-w-[180px]">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Mostrar</span>
          <select value={filter} onChange={(event) => onFilter(event.target.value)} className={DIRECTOR_FIELD}><option value="Pendiente">Pendientes</option><option value="Validado">Validados</option><option value="Rechazado">Rechazados</option><option value="Todos">Todos</option></select>
        </label>
      </div>
    </DirectorPanel>

    <DirectorPanel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[#e1e6de] bg-[#f7f9f5] text-[10px] uppercase tracking-wider text-[#697468]"><tr><th className="px-4 py-3">Alumno / apoderado</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Transferencia</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3 text-right">Decisión</th></tr></thead>
          <tbody className="divide-y divide-[#e6ebe3]">
            {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-[#697468]">Cargando pagos informados…</td></tr> : rows.map((row) => <tr key={row.id} className="align-top transition hover:bg-[#fafbf9]">
              <td className="px-4 py-4"><p className="font-black text-[#111711]">{row.jugadores?.nombre || 'Alumno'}</p><p className="mt-1 text-xs text-[#697468]">{row.tutores?.nombre_completo || row.tutores?.nombre || 'Apoderado no identificado'}</p><p className="text-[11px] text-[#7a8478]">Informado {new Date(row.created_at).toLocaleString('es-CL')}</p></td>
              <td className="px-4 py-4"><p className="font-bold text-[#111711]">{row.cobros?.concepto || 'Cobro'}</p>{row.cobro_cuotas ? <p className="mt-1 text-xs font-black text-[#617200]">Cuota {row.cobro_cuotas.numero}/{row.cobro_cuotas.total_cuotas} · vence {row.cobro_cuotas.fecha_vencimiento}</p> : null}</td>
              <td className="px-4 py-4"><p className="text-lg font-black text-amber-800">{money(row.monto)}</p><p className="text-xs text-[#697468]">Fecha declarada: {row.fecha_pago_informada}</p></td>
              <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${statusClass(row.estado)}`}>{row.estado}</span>{row.motivo_rechazo ? <p className="mt-2 max-w-xs text-xs leading-5 text-rose-700">{row.motivo_rechazo}</p> : null}</td>
              <td className="px-4 py-4"><p className="max-w-xs break-all text-xs font-semibold text-[#596456]">{row.comprobante_ref || 'Sin referencia'}</p>{row.observaciones ? <p className="mt-1 max-w-xs text-xs leading-5 text-[#697468]">{row.observaciones}</p> : null}</td>
              <td className="px-4 py-4"><div className="flex justify-end gap-2">{row.estado === 'Pendiente' ? <><button type="button" disabled={busyId === row.id} onClick={() => onValidate(row.id)} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-[#9bc900] bg-[#b7ff00] px-3 text-xs font-black text-[#111711] transition hover:bg-[#c5ff35] disabled:opacity-40"><CheckCircleIcon className="h-4 w-4" />Validar</button><button type="button" disabled={busyId === row.id} onClick={() => { setRejecting(row.id); setReason(''); }} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-800 transition hover:bg-rose-50 disabled:opacity-40"><XCircleIcon className="h-4 w-4" />Rechazar</button></> : null}</div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && !rows.length ? <div className="p-10 text-center text-sm font-semibold text-[#697468]">No hay pagos en este estado.</div> : null}
    </DirectorPanel>

    {rejecting ? <DirectorPanel className="border-rose-200 bg-rose-50/40 p-4 sm:p-5">
      <p className="text-sm font-black text-rose-800">Motivo del rechazo</p>
      <p className="mt-1 text-xs leading-5 text-[#697468]">La deuda permanecerá intacta y el motivo quedará registrado en el historial.</p>
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} className={`${DIRECTOR_FIELD} mt-3 min-h-24 py-3`} placeholder="Ej.: monto no coincide, transferencia no encontrada, comprobante ilegible…" />
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => submitReject(rejecting)} disabled={!reason.trim() || busyId === rejecting} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-700 bg-rose-700 px-4 text-xs font-black text-white transition hover:bg-rose-800 disabled:opacity-40">Confirmar rechazo</button><button type="button" onClick={() => { setRejecting(null); setReason(''); }} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button></div>
    </DirectorPanel> : null}
  </section>;
}
