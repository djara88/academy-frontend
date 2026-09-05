import { useEffect, useState, type FormEvent } from 'react';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_FIELD,
  DirectorPanel,
} from '../director/DirectorModule';

export type CollectionConfig = {
  cobranza_automatica: boolean;
  cobranza_auto_email: boolean;
  cobranza_auto_whatsapp: boolean;
  cobranza_recordar_antes: boolean;
  cobranza_recordar_vencido: boolean;
  cobranza_dias_mora: number[];
  cobranza_hora_local: number;
};

export type CollectionNotification = {
  id: string;
  canal: string;
  tipo: string;
  estado: string;
  enviado_at?: string | null;
  created_at: string;
  metadata?: { total?: number; conceptos?: number; error?: string } | null;
  tutores?: { id: string; nombre?: string | null; nombre_completo?: string | null; email?: string | null; telefono?: string | null } | null;
};

type Props = {
  config: CollectionConfig | null;
  notifications: CollectionNotification[];
  dueDay?: number | null;
  warningDays?: number | null;
  saving: boolean;
  sending: boolean;
  onSave: (value: CollectionConfig) => void;
  onSendAll: (onlyOverdue: boolean, channels: string[]) => void;
};

const money = (value?: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const normalize = (value: CollectionConfig | null): CollectionConfig => ({
  cobranza_automatica: value?.cobranza_automatica === true,
  cobranza_auto_email: value?.cobranza_auto_email !== false,
  cobranza_auto_whatsapp: value?.cobranza_auto_whatsapp !== false,
  cobranza_recordar_antes: value?.cobranza_recordar_antes !== false,
  cobranza_recordar_vencido: value?.cobranza_recordar_vencido !== false,
  cobranza_dias_mora: value?.cobranza_dias_mora?.length ? value.cobranza_dias_mora : [1, 5, 10, 15],
  cobranza_hora_local: Number(value?.cobranza_hora_local ?? 9),
});
const statusClass = (status: string) => status === 'Enviado'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : status === 'Error'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';

export default function CollectionAutomationPanel({ config, notifications, dueDay, warningDays, saving, sending, onSave, onSendAll }: Props) {
  const [form, setForm] = useState<CollectionConfig>(normalize(config));
  const [manualChannels, setManualChannels] = useState<string[]>(['email', 'whatsapp']);
  useEffect(() => setForm(normalize(config)), [config]);

  const submit = (event: FormEvent) => { event.preventDefault(); onSave(form); };
  const setDays = (value: string) => {
    const days = [...new Set(value.split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item >= 1 && item <= 60))].sort((a, b) => a - b);
    setForm((current) => ({ ...current, cobranza_dias_mora: days }));
  };
  const toggleManual = (channel: string) => setManualChannels((current) => current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]);

  return <section className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <DirectorPanel className="p-4 sm:p-5">
        <form onSubmit={submit}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d8700]">Automatización</p>
              <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Cobranza programada</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#697468]">Genera mensualidades antes de evaluar el envío. La deduplicación evita repetir el mismo aviso por evento y canal.</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 rounded-xl border border-[#d7ded4] bg-[#f7f9f5] px-3 py-2.5 text-sm font-black text-[#111711]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={form.cobranza_automatica} onChange={(event) => setForm({ ...form, cobranza_automatica: event.target.checked })} />{form.cobranza_automatica ? 'Activa' : 'Desactivada'}</label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4"><p className="text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Canales automáticos</p><label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#596456]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={form.cobranza_auto_email} onChange={(event) => setForm({ ...form, cobranza_auto_email: event.target.checked })} /> Correo electrónico</label><label className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#596456]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={form.cobranza_auto_whatsapp} onChange={(event) => setForm({ ...form, cobranza_auto_whatsapp: event.target.checked })} /> WhatsApp de la academia</label></div>
            <label className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4"><span className="text-[10px] font-black uppercase tracking-[.08em] text-[#697468]">Hora local de referencia</span><select value={form.cobranza_hora_local} onChange={(event) => setForm({ ...form, cobranza_hora_local: Number(event.target.value) })} className={`${DIRECTOR_FIELD} mt-3`}>{Array.from({ length: 15 }, (_, index) => index + 7).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select><span className="mt-2 block text-[11px] leading-5 text-[#697468]">Si el servicio estuvo dormido, procesa el evento al volver a estar disponible después de esta hora.</span></label>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4 text-sm text-[#596456]"><span className="flex items-center gap-2 font-black text-[#111711]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={form.cobranza_recordar_antes} onChange={(event) => setForm({ ...form, cobranza_recordar_antes: event.target.checked })} /> Aviso antes del vencimiento</span><span className="mt-2 block text-xs leading-5 text-[#697468]">Vencimiento día <strong>{dueDay || 'sin configurar'}</strong> y aviso con <strong>{warningDays ?? 3} día(s)</strong> de anticipación.</span></label>
            <label className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4 text-sm text-[#596456]"><span className="flex items-center gap-2 font-black text-[#111711]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={form.cobranza_recordar_vencido} onChange={(event) => setForm({ ...form, cobranza_recordar_vencido: event.target.checked })} /> Seguimiento de mora</span><span className="mt-2 block text-xs text-[#697468]">Días después del vencimiento</span><input value={form.cobranza_dias_mora.join(', ')} onChange={(event) => setDays(event.target.value)} className={`${DIRECTOR_FIELD} mt-2`} placeholder="1, 5, 10, 15" /></label>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-[#e5e9e2] pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-xs leading-5 text-[#697468]">La automatización nunca valida transferencias. Los pagos informados continúan requiriendo revisión de Dirección.</p><button type="submit" disabled={saving} className={DIRECTOR_BUTTON}>{saving ? 'Guardando…' : 'Guardar automatización'}</button></div>
        </form>
      </DirectorPanel>

      <DirectorPanel className="self-start p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d8700]">Acción inmediata</p>
        <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Enviar estados de cuenta</h2>
        <p className="mt-1 text-sm leading-6 text-[#697468]">Para una campaña extraordinaria. Cada familia recibe un enlace personal temporal a su estado de cuenta.</p>
        <div className="mt-4 grid gap-2"><label className="flex items-center gap-2 rounded-xl border border-[#dfe5dc] bg-[#fafbf9] p-3 text-sm font-semibold text-[#596456]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={manualChannels.includes('email')} onChange={() => toggleManual('email')} /> Correo</label><label className="flex items-center gap-2 rounded-xl border border-[#dfe5dc] bg-[#fafbf9] p-3 text-sm font-semibold text-[#596456]"><input className="h-4 w-4 accent-[#8eb700]" type="checkbox" checked={manualChannels.includes('whatsapp')} onChange={() => toggleManual('whatsapp')} /> WhatsApp</label></div>
        <div className="mt-4 grid gap-2"><button type="button" disabled={sending || !manualChannels.length} onClick={() => onSendAll(false, manualChannels)} className={DIRECTOR_BUTTON_DARK}>Enviar a familias con saldo</button><button type="button" disabled={sending || !manualChannels.length} onClick={() => onSendAll(true, manualChannels)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-800 transition hover:bg-rose-50 disabled:opacity-40">Solo deuda vencida</button></div>
      </DirectorPanel>
    </div>

    <DirectorPanel className="overflow-hidden">
      <header className="border-b border-[#e2e7df] p-4 sm:p-5"><h3 className="font-black text-[#111711]">Historial de comunicaciones</h3><p className="mt-1 text-xs text-[#697468]">Últimos 200 intentos manuales y automáticos.</p></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="border-b border-[#e1e6de] bg-[#f7f9f5] text-[10px] uppercase tracking-wider text-[#697468]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Apoderado</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3 text-right">Monto asociado</th></tr></thead><tbody className="divide-y divide-[#e6ebe3]">{notifications.map((item) => <tr key={item.id} className="transition hover:bg-[#fafbf9]"><td className="px-4 py-3 text-xs text-[#697468]">{new Date(item.enviado_at || item.created_at).toLocaleString('es-CL')}</td><td className="px-4 py-3 font-bold text-[#111711]">{item.tutores?.nombre_completo || item.tutores?.nombre || 'Apoderado'}</td><td className="px-4 py-3 text-xs text-[#596456]">{item.tipo.split('_').join(' ')}</td><td className="px-4 py-3 text-xs font-black text-[#617200]">{item.canal}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusClass(item.estado)}`}>{item.estado}</span>{item.metadata?.error ? <p className="mt-1 max-w-xs text-[10px] text-rose-700">{item.metadata.error}</p> : null}</td><td className="px-4 py-3 text-right font-black text-[#596456]">{money(item.metadata?.total)}</td></tr>)}{!notifications.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-sm font-semibold text-[#697468]">Aún no hay comunicaciones registradas.</td></tr> : null}</tbody></table></div>
    </DirectorPanel>
  </section>;
}
