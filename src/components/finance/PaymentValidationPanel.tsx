import { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

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

export default function PaymentValidationPanel({ rows, filter, loading, busyId, onFilter, onValidate, onReject }: Props) {
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const submitReject = (id: string) => {
    if (!reason.trim()) return;
    onReject(id, reason.trim());
    setRejecting(null);
    setReason('');
  };

  return <section className="space-y-4">
    <div className="rounded-2xl border border-amber-400/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.10),transparent_40%),#151b25] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-amber-300">Control de caja</p><h2 className="mt-1 text-xl font-black text-white">Pagos informados por validar</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8995a4]">Informar una transferencia no modifica la deuda. Solo al presionar <strong className="text-white">Validar</strong> se crea un pago real en el libro contable.</p></div><select value={filter} onChange={(event) => onFilter(event.target.value)} className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white"><option value="Pendiente">Pendientes</option><option value="Validado">Validados</option><option value="Rechazado">Rechazados</option><option value="Todos">Todos</option></select></div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151b25]">
      <div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase tracking-wider text-[#697586]"><tr><th className="px-4 py-3">Alumno / apoderado</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Transferencia</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Referencia</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead><tbody className="divide-y divide-white/10">
        {loading ? <tr><td colSpan={6} className="px-4 py-10 text-center text-[#8995a4]">Cargando pagos informados...</td></tr> : rows.map((row) => <tr key={row.id} className="align-top"><td className="px-4 py-4"><p className="font-black text-white">{row.jugadores?.nombre || 'Alumno'}</p><p className="mt-1 text-xs text-[#8995a4]">{row.tutores?.nombre_completo || row.tutores?.nombre || 'Apoderado no identificado'}</p><p className="text-[11px] text-[#697586]">{new Date(row.created_at).toLocaleString('es-CL')}</p></td><td className="px-4 py-4"><p className="font-bold text-white">{row.cobros?.concepto || 'Cobro'}</p>{row.cobro_cuotas ? <p className="mt-1 text-xs font-black text-[#70e4df]">Cuota {row.cobro_cuotas.numero}/{row.cobro_cuotas.total_cuotas} · vence {row.cobro_cuotas.fecha_vencimiento}</p> : null}</td><td className="px-4 py-4"><p className="text-lg font-black text-amber-300">{money(row.monto)}</p><p className="text-xs text-[#8995a4]">Informada: {row.fecha_pago_informada}</p></td><td className="px-4 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${row.estado === 'Validado' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300' : row.estado === 'Rechazado' ? 'border-red-400/20 bg-red-500/10 text-red-300' : 'border-amber-400/20 bg-amber-500/10 text-amber-300'}`}>{row.estado}</span>{row.motivo_rechazo ? <p className="mt-2 max-w-xs text-xs text-red-200/80">{row.motivo_rechazo}</p> : null}</td><td className="px-4 py-4"><p className="max-w-xs break-all text-xs text-[#b6c0cc]">{row.comprobante_ref || 'Sin referencia'}</p>{row.observaciones ? <p className="mt-1 max-w-xs text-xs text-[#697586]">{row.observaciones}</p> : null}</td><td className="px-4 py-4"><div className="flex justify-end gap-2">{row.estado === 'Pendiente' ? <><button type="button" disabled={busyId === row.id} onClick={() => onValidate(row.id)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-300 disabled:opacity-40"><CheckCircleIcon className="h-4 w-4" />Validar</button><button type="button" disabled={busyId === row.id} onClick={() => { setRejecting(row.id); setReason(''); }} className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40"><XCircleIcon className="h-4 w-4" />Rechazar</button></> : null}</div></td></tr>)}
      </tbody></table></div>
      {!loading && !rows.length ? <div className="p-10 text-center text-sm text-[#697586]">No hay pagos en este estado.</div> : null}
    </div>

    {rejecting ? <div className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5"><p className="font-black text-red-200">Motivo del rechazo</p><p className="mt-1 text-xs text-[#8995a4]">La deuda permanecerá intacta y este motivo quedará en el historial.</p><textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl border border-red-400/20 bg-[#0d1117] p-3 text-sm text-white outline-none" placeholder="Ej.: monto no coincide, transferencia no encontrada, comprobante ilegible..." /><div className="mt-3 flex gap-2"><button type="button" onClick={() => submitReject(rejecting)} disabled={!reason.trim() || busyId === rejecting} className="rounded-xl bg-red-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Confirmar rechazo</button><button type="button" onClick={() => { setRejecting(null); setReason(''); }} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-[#b6c0cc]">Cancelar</button></div></div> : null}
  </section>;
}
