import { useEffect, useState, type FormEvent } from 'react';

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

  return <section className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <form onSubmit={submit} className="rounded-2xl border border-[#289E9D]/20 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.12),transparent_40%),#151b25] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Automatización</p><h2 className="mt-1 text-xl font-black text-white">Cobranza programada</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#8995a4]">Genera las mensualidades antes de evaluar el envío. Un apoderado recibe como máximo un aviso por evento y canal gracias a una clave de deduplicación.</p></div><label className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm font-black text-white"><input type="checkbox" checked={form.cobranza_automatica} onChange={(event) => setForm({ ...form, cobranza_automatica: event.target.checked })} />{form.cobranza_automatica ? 'Activa' : 'Desactivada'}</label></div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs font-black uppercase text-[#697586]">Canales automáticos</p><label className="mt-3 flex items-center gap-2 text-sm text-[#b6c0cc]"><input type="checkbox" checked={form.cobranza_auto_email} onChange={(event) => setForm({ ...form, cobranza_auto_email: event.target.checked })} /> Correo electrónico</label><label className="mt-2 flex items-center gap-2 text-sm text-[#b6c0cc]"><input type="checkbox" checked={form.cobranza_auto_whatsapp} onChange={(event) => setForm({ ...form, cobranza_auto_whatsapp: event.target.checked })} /> WhatsApp de la academia</label></div>
          <div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs font-black uppercase text-[#697586]">Hora local de referencia</p><select value={form.cobranza_hora_local} onChange={(event) => setForm({ ...form, cobranza_hora_local: Number(event.target.value) })} className="mt-3 w-full rounded-lg border border-white/10 bg-[#151b25] px-3 py-2 text-sm text-white">{Array.from({ length: 15 }, (_, index) => index + 7).map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>)}</select><p className="mt-2 text-[11px] leading-5 text-[#697586]">Si el servicio estaba dormido, procesará el evento al volver a estar disponible después de esta hora.</p></div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="rounded-xl border border-white/10 bg-[#0d1117] p-4 text-sm text-[#b6c0cc]"><span className="flex items-center gap-2 font-black text-white"><input type="checkbox" checked={form.cobranza_recordar_antes} onChange={(event) => setForm({ ...form, cobranza_recordar_antes: event.target.checked })} /> Aviso antes del vencimiento</span><span className="mt-2 block text-xs leading-5 text-[#697586]">Según Finanzas: vencimiento día <strong className="text-[#b6c0cc]">{dueDay || 'sin configurar'}</strong> y aviso con <strong className="text-[#b6c0cc]">{warningDays ?? 3} día(s)</strong> de anticipación.</span></label>
          <label className="rounded-xl border border-white/10 bg-[#0d1117] p-4 text-sm text-[#b6c0cc]"><span className="flex items-center gap-2 font-black text-white"><input type="checkbox" checked={form.cobranza_recordar_vencido} onChange={(event) => setForm({ ...form, cobranza_recordar_vencido: event.target.checked })} /> Seguimiento de mora</span><span className="mt-2 block text-xs text-[#697586]">Días después del vencimiento</span><input value={form.cobranza_dias_mora.join(', ')} onChange={(event) => setDays(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#151b25] px-3 py-2 text-sm text-white" placeholder="1, 5, 10, 15" /></label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#697586]">La automatización nunca valida transferencias. Los pagos informados continúan requiriendo revisión de Dirección.</p><button type="submit" disabled={saving} className="rounded-xl bg-[#289E9D] px-5 py-3 text-sm font-black text-white disabled:opacity-40">{saving ? 'Guardando...' : 'Guardar automatización'}</button></div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-[#151b25] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.16em] text-violet-300">Acción inmediata</p><h2 className="mt-1 text-xl font-black text-white">Enviar estados de cuenta</h2><p className="mt-2 text-sm leading-6 text-[#8995a4]">Útil para una campaña extraordinaria. Cada familia recibe un enlace personal temporal hacia su estado de cuenta.</p><div className="mt-5 space-y-2"><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-[#b6c0cc]"><input type="checkbox" checked={manualChannels.includes('email')} onChange={() => toggleManual('email')} /> Correo</label><label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-[#b6c0cc]"><input type="checkbox" checked={manualChannels.includes('whatsapp')} onChange={() => toggleManual('whatsapp')} /> WhatsApp</label></div><div className="mt-5 grid gap-2"><button type="button" disabled={sending || !manualChannels.length} onClick={() => onSendAll(false, manualChannels)} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Enviar a todas las familias con saldo</button><button type="button" disabled={sending || !manualChannels.length} onClick={() => onSendAll(true, manualChannels)} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 disabled:opacity-40">Enviar solo a deuda vencida</button></div></div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#151b25]"><div className="border-b border-white/10 p-5"><h3 className="font-black text-white">Historial de comunicaciones</h3><p className="mt-1 text-xs text-[#8995a4]">Últimos 200 intentos manuales y automáticos.</p></div><div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase tracking-wider text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Apoderado</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Canal</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3 text-right">Monto asociado</th></tr></thead><tbody className="divide-y divide-white/10">{notifications.map((item) => <tr key={item.id}><td className="px-4 py-3 text-xs text-[#8995a4]">{new Date(item.enviado_at || item.created_at).toLocaleString('es-CL')}</td><td className="px-4 py-3 font-bold text-white">{item.tutores?.nombre_completo || item.tutores?.nombre || 'Apoderado'}</td><td className="px-4 py-3 text-xs text-[#b6c0cc]">{item.tipo.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-xs font-black text-[#70e4df]">{item.canal}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${item.estado === 'Enviado' ? 'bg-emerald-500/10 text-emerald-300' : item.estado === 'Error' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-300'}`}>{item.estado}</span>{item.metadata?.error ? <p className="mt-1 max-w-xs text-[10px] text-red-300">{item.metadata.error}</p> : null}</td><td className="px-4 py-3 text-right font-black text-[#b6c0cc]">{money(item.metadata?.total)}</td></tr>)}{!notifications.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-[#697586]">Aún no hay comunicaciones registradas.</td></tr> : null}</tbody></table></div></div>
  </section>;
}
