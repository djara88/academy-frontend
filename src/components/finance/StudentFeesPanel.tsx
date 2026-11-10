import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../../api/axiosConfig';
import {
  DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD,
  DirectorPanel,
} from '../director/DirectorModule';

type FeeKind = 'mensualidad' | 'matricula';
type FeeRow = {
  id: string;
  jugador_id: string;
  rama_id: string;
  sede_id: string;
  alumno: string;
  rama: string;
  sede: string;
  disciplina: string;
  estado: string;
  es_principal: boolean;
  monto_matricula: number;
  monto_mensualidad: number;
};
type FeeAudit = {
  id: string;
  tipo: FeeKind;
  monto_anterior: number;
  monto_nuevo: number;
  motivo: string;
  creado_en: string;
  cobro_ajustado_id: string | null;
};
type Edit = { row: FeeRow; tipo: FeeKind };
const formatMoney = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const errorMessage = (error: any, fallback: string) => error?.response?.data?.error || fallback;

export default function StudentFeesPanel({ branchId, onAdjusted }: { branchId: string; onAdjusted: () => void }) {
  const [rows, setRows] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Edit | null>(null);
  const [amount, setAmount] = useState('0');
  const [reason, setReason] = useState('');
  const [adjustCurrentCharge, setAdjustCurrentCharge] = useState(false);
  const [history, setHistory] = useState<FeeAudit[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setVerified(false);
    setError('');
    try {
      const response = await api.get('/api/finanzas/tarifas');
      if (!Array.isArray(response.data?.data)) throw new Error('Respuesta de tarifas no verificable.');
      setRows(response.data.data as FeeRow[]);
      setVerified(true);
    } catch (requestError) {
      setRows([]);
      setError(errorMessage(requestError, 'No fue posible consultar las tarifas. Reintenta la operación.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    return rows.filter((row) => (!branchId || row.rama_id === branchId)
      && (!term || `${row.alumno} ${row.disciplina} ${row.rama} ${row.sede}`.toLocaleLowerCase('es').includes(term)));
  }, [branchId, rows, search]);

  const open = async (row: FeeRow, tipo: FeeKind) => {
    setEdit({ row, tipo });
    setAmount(String(tipo === 'mensualidad' ? row.monto_mensualidad : row.monto_matricula));
    setReason('');
    setAdjustCurrentCharge(tipo === 'matricula');
    setFeedback('');
    setHistory([]);
    setHistoryError('');
    try {
      const response = await api.get('/api/finanzas/tarifas/historial', { params: { inscripcion_id: row.id } });
      if (!Array.isArray(response.data?.data)) throw new Error('Historial no disponible.');
      setHistory(response.data.data as FeeAudit[]);
    } catch (requestError) {
      setHistoryError(errorMessage(requestError, 'No se pudo consultar el historial de ajustes.'));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!edit || busy) return;
    const next = Number(amount);
    const previous = edit.tipo === 'mensualidad' ? Number(edit.row.monto_mensualidad) : Number(edit.row.monto_matricula);
    if (!Number.isSafeInteger(next) || next < 0 || next > 10_000_000 || next === previous) {
      setFeedback('Indica un monto válido, distinto al actual, entre $0 y $10.000.000.');
      return;
    }
    if (reason.trim().length < 8) {
      setFeedback('Explica el motivo de la excepción en al menos 8 caracteres.');
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      const response = await api.post('/api/finanzas/tarifas/ajustar', {
        jugador_id: edit.row.jugador_id,
        inscripcion_id: edit.row.id,
        tipo: edit.tipo,
        monto_anterior: previous,
        monto_nuevo: next,
        motivo: reason.trim(),
        aplicar_cobro_actual: adjustCurrentCharge,
      });
      const changedCharge = response.data?.data?.cobro_ajustado === true;
      setEdit(null);
      await load();
      onAdjusted();
      setFeedback(changedCharge
        ? 'Tarifa y cobro pendiente actualizados correctamente. Se conserva el historial de pagos.'
        : 'Tarifa actualizada para los próximos cobros. Los cobros anteriores no se modificaron.');
    } catch (requestError) {
      setFeedback(errorMessage(requestError, 'No fue posible modificar la tarifa. No se realizó ningún ajuste confirmado.'));
    } finally {
      setBusy(false);
    }
  };

  return <div className="space-y-4">
    <DirectorPanel className="p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div><h2 className="text-xl font-black text-[#111711]">Tarifas y excepciones por alumno</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#626d61]">Consulta la mensualidad y la matrícula vigentes por inscripción deportiva. Registra rebajas o modificaciones justificadas sin eliminar los pagos ya efectuados.</p></div>
        <button type="button" onClick={() => void load()} className={DIRECTOR_BUTTON_GHOST} disabled={loading}>Actualizar</button>
      </div>
      <label className="mt-5 block max-w-lg"><span className="mb-1.5 block text-xs font-black text-[#596456]">Buscar alumno, disciplina o sede</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} className={DIRECTOR_FIELD} placeholder="Nombre del alumno" /></label>
    </DirectorPanel>

    {feedback && !edit ? <div role="status" className="rounded-xl border border-[#cadbb9] bg-[#f0f8e6] p-4 text-sm font-semibold text-[#21321a]">{feedback}</div> : null}
    {loading ? <DirectorPanel className="p-8 text-center text-sm font-bold text-[#626d61]" role="status">Consultando tarifas de inscripciones…</DirectorPanel>
      : !verified ? <DirectorPanel className="p-6" role="alert"><p className="font-bold text-rose-800">{error || 'No se pudo verificar la información.'}</p><button type="button" onClick={() => void load()} className={`${DIRECTOR_BUTTON_DARK} mt-3`}>Reintentar</button></DirectorPanel>
        : <DirectorPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#e0e7dc] bg-[#f7f9f5] text-[11px] uppercase text-[#586557]"><tr>
                <th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Inscripción</th>
                <th className="px-4 py-3 text-right">Matrícula</th><th className="px-4 py-3 text-right">Mensualidad</th>
                <th className="px-4 py-3 text-right">Editar</th>
              </tr></thead>
              <tbody className="divide-y divide-[#e6ebe3]">
                {visible.map((row) => <tr key={row.id} className="hover:bg-[#fafbf9]">
                  <td className="px-4 py-4 font-black text-[#111711]">{row.alumno}{row.es_principal ? <span className="ml-2 rounded-full bg-[#e7f2d5] px-2 py-1 text-[10px] font-bold text-[#436327]">Principal</span> : null}</td>
                  <td className="px-4 py-4 text-[#596456]"><span className="block font-semibold">{row.disciplina || row.rama}</span><span className="block text-xs">{row.sede}</span></td>
                  <td className="px-4 py-4 text-right font-bold tabular-nums text-[#111711]">{formatMoney(row.monto_matricula)}</td>
                  <td className="px-4 py-4 text-right font-black tabular-nums text-emerald-800">{formatMoney(row.monto_mensualidad)}</td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2">
                    <button type="button" className="rounded-lg border border-[#cdd7c8] px-3 py-2 text-xs font-black text-[#111711] hover:bg-[#f2f7ea]" onClick={() => void open(row, 'matricula')}>Matrícula</button>
                    <button type="button" className="rounded-lg border border-[#cdd7c8] px-3 py-2 text-xs font-black text-[#111711] hover:bg-[#f2f7ea]" onClick={() => void open(row, 'mensualidad')}>Mensualidad</button>
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!visible.length && <p className="p-8 text-center text-sm font-semibold text-[#626d61]">No hay inscripciones activas para este filtro.</p>}
          <p className="border-t border-[#e0e7dc] px-4 py-3 text-xs text-[#697468]">Las tarifas son por inscripción; un alumno que practica dos disciplinas puede tener mensualidades distintas. Los importes históricos pagados no se reescriben.</p>
        </DirectorPanel>}

    {edit ? <div role="dialog" aria-modal="true" aria-label="Ajustar tarifa individual" className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/65 p-4">
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#d5ded1] bg-white p-5 shadow-2xl sm:p-6">
        <h3 className="text-xl font-black text-[#111711]">Modificar {edit.tipo === 'mensualidad' ? 'mensualidad' : 'matrícula'}</h3>
        <p className="mt-1 text-sm text-[#596456]">{edit.row.alumno} · {edit.row.disciplina || edit.row.rama} · {edit.row.sede}</p>
        <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f4f7ef] p-3"><p className="text-xs font-bold uppercase text-[#697468]">Importe vigente</p><p className="mt-1 text-xl font-black text-[#111711]">{formatMoney(edit.tipo === 'mensualidad' ? edit.row.monto_mensualidad : edit.row.monto_matricula)}</p></div>
            <label><span className="mb-1 block text-xs font-black text-[#596456]">Nuevo importe CLP</span><input type="number" min="0" max="10000000" step="1" required value={amount} onChange={(event) => setAmount(event.target.value)} className={DIRECTOR_FIELD} /></label>
          </div>
          <label className="block"><span className="mb-1 block text-xs font-black text-[#596456]">Motivo obligatorio de la excepción</span>
            <textarea minLength={8} maxLength={500} required value={reason} onChange={(event) => setReason(event.target.value)} className={`${DIRECTOR_FIELD} min-h-24 py-3`} placeholder="Por ejemplo: beca parcial aprobada hasta fin de año" /></label>
          <label className="flex items-start gap-3 rounded-xl border border-[#dce6d7] bg-[#f9fbf7] p-4">
            <input type="checkbox" checked={adjustCurrentCharge} onChange={(event) => setAdjustCurrentCharge(event.target.checked)} className="mt-1 h-5 w-5 accent-[#43692b]" />
            <span className="text-sm leading-6 text-[#394a39]"><strong>Ajustar también el cobro {edit.tipo === 'matricula' ? 'de matrícula' : 'del mes actual'}, si existe y está pendiente.</strong>
              <span className="mt-1 block text-xs text-[#596456]">Se respetan los abonos registrados. Si el descuento es menor a lo ya pagado, se rechazará para revisión contable. Los períodos pagados o anteriores no se alteran.</span>
            </span>
          </label>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Si desmarcas el ajuste del cobro actual, solo cambia la tarifa de referencia para nuevas mensualidades o futuras operaciones. Los cobros emitidos mantienen su importe.</p>
          {feedback && <p role="alert" className="rounded-xl bg-[#fff4ed] px-4 py-3 text-sm font-bold text-rose-800">{feedback}</p>}
          <div className="flex flex-wrap justify-end gap-2"><button type="button" className={DIRECTOR_BUTTON_GHOST} disabled={busy} onClick={() => setEdit(null)}>Cancelar</button>
            <button type="submit" className={DIRECTOR_BUTTON_DARK} disabled={busy}>{busy ? 'Guardando…' : 'Confirmar ajuste'}</button></div>
        </form>
        <div className="mt-6 border-t border-[#e1e8df] pt-4">
          <h4 className="text-sm font-black text-[#111711]">Historial de excepciones</h4>
          {historyError && <p role="status" className="mt-2 text-xs text-amber-800">{historyError}</p>}
          {!historyError && !history.length && <p className="mt-2 text-xs text-[#697468]">No hay ajustes anteriores registrados.</p>}
          {history.length > 0 && <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">{history.map((item) => <div key={item.id} className="rounded-lg border border-[#e1e8df] p-3 text-xs text-[#596456]">
            <p className="font-bold text-[#111711]">{item.tipo === 'mensualidad' ? 'Mensualidad' : 'Matrícula'} · {formatMoney(item.monto_anterior)} → {formatMoney(item.monto_nuevo)}</p>
            <p className="mt-1">{item.motivo}</p><p className="mt-1">{new Date(item.creado_en).toLocaleString('es-CL')}{item.cobro_ajustado_id ? ' · cobro pendiente ajustado' : ' · tarifa futura'}</p>
          </div>)}</div>}
        </div>
      </div>
    </div> : null}
  </div>;
}
