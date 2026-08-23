import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon, CheckBadgeIcon, ClockIcon, ExclamationTriangleIcon, ShieldCheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Player = { id: string; nombre: string; rut?: string | null; tutor_id?: string | null; apoderado_id?: string | null; tutor_principal_id?: string | null; privacy_anonymized_at?: string | null };
type PrivacyRequest = {
  id: string; jugador_id?: string | null; tutor_id?: string | null; tipo: string; estado: string; canal: string;
  solicitante_nombre: string; solicitante_email: string; solicitante_documento?: string | null; detalle?: string | null;
  identidad_verificada: boolean; bloqueo_solicitado: boolean; fecha_recepcion: string; fecha_limite: string;
  fecha_limite_prorrogada?: string | null; respuesta?: string | null; fundamento_decision?: string | null;
  dias_restantes?: number | null; jugadores?: { id: string; nombre: string; rut?: string | null } | null;
};
type Response = { data: PrivacyRequest[]; summary: { total: number; abiertas: number; vencidas: number; proximas_vencer: number; pendientes_identidad: number } };

const labels: Record<string, string> = {
  acceso: 'Acceso a datos', rectificacion: 'Rectificación', supresion: 'Supresión', oposicion: 'Oposición',
  portabilidad: 'Portabilidad', bloqueo: 'Bloqueo temporal', revocacion_imagen: 'Revocación de imagen',
};
const terminal = new Set(['ejecutada', 'cerrada', 'rechazada']);
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('es-CL') : '—';

const PrivacyRequests = () => {
  const queryClient = useQueryClient();
  const { notify, confirmAction } = useAppDialog();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [form, setForm] = useState({ jugador_id: '', tipo: 'acceso', solicitante_nombre: '', solicitante_email: '', solicitante_documento: '', detalle: '', bloqueo_solicitado: false });
  const [decision, setDecision] = useState({ respuesta: '', fundamento: '', confirmacion: '' });

  const requestsQuery = useQuery({ queryKey: ['privacy-requests'], queryFn: async () => (await api.get('/api/privacy-requests')).data as Response });
  const playersQuery = useQuery({ queryKey: ['privacy-players'], queryFn: async () => (await api.get('/api/jugadores')).data.data as Player[] });
  const requests = requestsQuery.data?.data || [];
  const summary = requestsQuery.data?.summary;
  const selected = requests.find((item) => item.id === selectedId) || requests[0] || null;

  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['privacy-requests'] }); };
  const create = async () => {
    if (!form.jugador_id || !form.solicitante_nombre.trim() || !form.solicitante_email.trim()) return notify('Selecciona alumno e ingresa nombre y correo del solicitante.');
    setLoadingAction(true);
    try {
      await api.post('/api/privacy-requests', form);
      setForm({ jugador_id: '', tipo: 'acceso', solicitante_nombre: '', solicitante_email: '', solicitante_documento: '', detalle: '', bloqueo_solicitado: false });
      await refresh();
      await notify('Solicitud registrada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible registrar la solicitud.'); }
    finally { setLoadingAction(false); }
  };
  const verify = async (id: string) => {
    if (!await confirmAction('Confirma que verificaste la identidad y representación del solicitante.')) return;
    setLoadingAction(true);
    try { await api.patch(`/api/privacy-requests/${id}/verificar-identidad`); await refresh(); await notify('Identidad marcada como verificada.'); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible verificar la identidad.'); }
    finally { setLoadingAction(false); }
  };
  const extend = async (id: string) => {
    if (!await confirmAction('¿Registrar una prórroga de 30 días para esta solicitud?')) return;
    setLoadingAction(true);
    try { await api.patch(`/api/privacy-requests/${id}/prorrogar`); await refresh(); await notify('Prórroga registrada.'); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible registrar la prórroga.'); }
    finally { setLoadingAction(false); }
  };
  const decide = async (id: string, value: 'aprobada' | 'rechazada') => {
    if (!decision.respuesta.trim()) return notify('Escribe primero la respuesta que quedará registrada para el titular.');
    if (value === 'rechazada' && !decision.fundamento.trim()) return notify('Una denegación debe registrar su fundamento.');
    setLoadingAction(true);
    try {
      await api.patch(`/api/privacy-requests/${id}/decision`, { decision: value, respuesta: decision.respuesta, fundamento: decision.fundamento });
      await refresh(); await notify(value === 'aprobada' ? 'Solicitud aprobada.' : 'Solicitud rechazada con fundamento.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible registrar la decisión.'); }
    finally { setLoadingAction(false); }
  };
  const execute = async (row: PrivacyRequest) => {
    const sensitive = row.tipo === 'supresion';
    if (sensitive && decision.confirmacion.trim().toUpperCase() !== 'SUPRIMIR DATOS') return notify('Para una supresión escribe exactamente SUPRIMIR DATOS.');
    if (!await confirmAction(sensitive ? 'Esta acción anonimizará datos del alumno y eliminará documentos, fotos e historial no financiero. ¿Continuar?' : '¿Ejecutar la acción aprobada?', { tone: sensitive ? 'danger' : 'default' })) return;
    setLoadingAction(true);
    try { await api.post(`/api/privacy-requests/${row.id}/ejecutar`, { confirmacion: decision.confirmacion }); await refresh(); await notify('Solicitud ejecutada.'); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible ejecutar la solicitud.'); }
    finally { setLoadingAction(false); }
  };
  const downloadExport = async (row: PrivacyRequest) => {
    setLoadingAction(true);
    try {
      const response = await api.get(`/api/privacy-requests/${row.id}/export`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = `Solicitud_Privacidad_${row.id.slice(0, 8)}.json`; link.click(); URL.revokeObjectURL(url);
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible preparar la exportación.'); }
    finally { setLoadingAction(false); }
  };

  const cards = useMemo(() => [
    ['Abiertas', summary?.abiertas || 0, 'text-sky-300'], ['Vencen ≤ 5 días', summary?.proximas_vencer || 0, 'text-amber-300'],
    ['Vencidas', summary?.vencidas || 0, 'text-red-300'], ['Identidad pendiente', summary?.pendientes_identidad || 0, 'text-violet-300'],
  ], [summary]);

  if (requestsQuery.isLoading) return <div className="py-20 text-center font-bold text-[#8b949e]">Cargando centro de privacidad...</div>;
  return <div className="space-y-6 pb-16">
    <section className="rounded-[30px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.18),transparent_38%),#151b25] p-6 sm:p-8"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#70e4df]">Gestión de privacidad</p><h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Solicitudes de titulares</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#9aa6b5]">Registra y gestiona solicitudes de acceso, rectificación, supresión, oposición, portabilidad, bloqueo o revocación de imagen.</p></div><ShieldCheckIcon className="h-14 w-14 text-[#70e4df]" /></div></section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, color]) => <article key={String(label)} className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></article>)}</section>

    <section className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6"><h2 className="text-xl font-black text-white">Registrar una solicitud</h2><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><label className="text-sm text-[#9aa6b5]">Alumno<select className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.jugador_id} onChange={(e) => setForm({ ...form, jugador_id: e.target.value })}><option value="">Seleccionar</option>{(playersQuery.data || []).filter((p) => !p.privacy_anonymized_at).map((player) => <option key={player.id} value={player.id}>{player.nombre}{player.rut ? ` · ${player.rut}` : ''}</option>)}</select></label><label className="text-sm text-[#9aa6b5]">Derecho ejercido<select className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-sm text-[#9aa6b5]">Nombre solicitante<input className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.solicitante_nombre} onChange={(e) => setForm({ ...form, solicitante_nombre: e.target.value })} /></label><label className="text-sm text-[#9aa6b5]">Correo<input type="email" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.solicitante_email} onChange={(e) => setForm({ ...form, solicitante_email: e.target.value })} /></label><label className="text-sm text-[#9aa6b5]">Documento / RUT<input className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.solicitante_documento} onChange={(e) => setForm({ ...form, solicitante_documento: e.target.value })} /></label><label className="flex items-end gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-[#b6c0cc]"><input type="checkbox" checked={form.bloqueo_solicitado} onChange={(e) => setForm({ ...form, bloqueo_solicitado: e.target.checked })} /> Solicita bloqueo temporal mientras se resuelve</label></div><label className="mt-4 block text-sm text-[#9aa6b5]">Detalle<textarea className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} /></label><button disabled={loadingAction} onClick={() => void create()} className="mt-4 rounded-xl bg-[#289E9D] px-5 py-3 font-black text-white disabled:opacity-50">Registrar solicitud</button></section>

    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]"><div className="rounded-3xl border border-white/10 bg-[#151b25] p-4"><h2 className="px-2 text-lg font-black text-white">Expedientes</h2><div className="mt-3 max-h-[650px] space-y-2 overflow-y-auto">{requests.length ? requests.map((row) => { const late = Number(row.dias_restantes) < 0; const soon = Number(row.dias_restantes) >= 0 && Number(row.dias_restantes) <= 5; return <button key={row.id} onClick={() => { setSelectedId(row.id); setDecision({ respuesta: row.respuesta || '', fundamento: row.fundamento_decision || '', confirmacion: '' }); }} className={`w-full rounded-2xl border p-4 text-left ${selected?.id === row.id ? 'border-[#289E9D]/60 bg-[#289E9D]/10' : 'border-white/10 bg-[#0d1117]'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-white">{row.jugadores?.nombre || 'Alumno no disponible'}</p><p className="mt-1 text-xs text-[#8995a4]">{labels[row.tipo] || row.tipo} · {formatDate(row.fecha_recepcion)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${late ? 'bg-red-500/15 text-red-300' : soon ? 'bg-amber-500/15 text-amber-300' : terminal.has(row.estado) ? 'bg-emerald-500/15 text-emerald-300' : 'bg-sky-500/15 text-sky-300'}`}>{row.estado}</span></div><p className={`mt-3 text-xs ${late ? 'text-red-300' : soon ? 'text-amber-300' : 'text-[#6f7c8d]'}`}>{late ? `Vencida hace ${Math.abs(Number(row.dias_restantes))} día(s)` : `${row.dias_restantes ?? '—'} día(s) para responder`}</p></button>; }) : <p className="p-8 text-center text-sm text-[#6f7c8d]">No hay solicitudes registradas.</p>}</div></div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">{selected ? <div><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">{labels[selected.tipo] || selected.tipo}</p><h2 className="mt-1 text-2xl font-black text-white">{selected.jugadores?.nombre || 'Alumno anonimizado'}</h2><p className="mt-2 text-sm text-[#9aa6b5]">Solicitante: {selected.solicitante_nombre} · {selected.solicitante_email}</p></div><div className="flex gap-2">{selected.identidad_verificada ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-300"><CheckBadgeIcon className="h-4 w-4" /> Identidad verificada</span> : <button disabled={loadingAction} onClick={() => void verify(selected.id)} className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-black text-white">Verificar identidad</button>}</div></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs text-[#8995a4]">Fecha límite</p><p className="mt-1 font-black text-white">{formatDate(selected.fecha_limite_prorrogada || selected.fecha_limite)}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs text-[#8995a4]">Canal</p><p className="mt-1 font-black text-white">{selected.canal}</p></div></div>{selected.detalle ? <div className="mt-4 rounded-xl border border-white/10 bg-[#0d1117] p-4 text-sm leading-6 text-[#b6c0cc]">{selected.detalle}</div> : null}
        <div className="mt-5 flex flex-wrap gap-2">{!terminal.has(selected.estado) && !selected.fecha_limite_prorrogada ? <button disabled={loadingAction} onClick={() => void extend(selected.id)} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-black text-amber-300"><ClockIcon className="h-4 w-4" /> Prorrogar 30 días</button> : null}{selected.identidad_verificada ? <button disabled={loadingAction} onClick={() => void downloadExport(selected)} className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 px-3 py-2 text-xs font-black text-sky-300"><ArrowDownTrayIcon className="h-4 w-4" /> Exportar datos</button> : null}</div>
        {!terminal.has(selected.estado) && selected.estado !== 'aprobada' ? <div className="mt-6 space-y-3"><textarea placeholder="Respuesta al titular" className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-white" value={decision.respuesta} onChange={(e) => setDecision({ ...decision, respuesta: e.target.value })} /><textarea placeholder="Fundamento (obligatorio si rechazas)" className="min-h-20 w-full rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-white" value={decision.fundamento} onChange={(e) => setDecision({ ...decision, fundamento: e.target.value })} /><div className="flex flex-wrap gap-2"><button disabled={loadingAction || !selected.identidad_verificada} onClick={() => void decide(selected.id, 'aprobada')} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-emerald-950 disabled:opacity-40">Aprobar</button><button disabled={loadingAction || !selected.identidad_verificada} onClick={() => void decide(selected.id, 'rechazada')} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white disabled:opacity-40">Rechazar</button></div></div> : null}
        {selected.estado === 'aprobada' ? <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4"><div className="flex items-start gap-3"><ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" /><div><p className="font-black text-white">Solicitud aprobada</p><p className="mt-1 text-sm leading-6 text-[#b6c0cc]">Completa la acción aprobada para cerrar este expediente.</p></div></div>{selected.tipo === 'supresion' ? <input placeholder="Escribe SUPRIMIR DATOS" className="mt-4 w-full rounded-xl border border-red-500/30 bg-[#0d1117] p-3 text-sm text-white" value={decision.confirmacion} onChange={(e) => setDecision({ ...decision, confirmacion: e.target.value })} /> : null}<button disabled={loadingAction} onClick={() => void execute(selected)} className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black ${selected.tipo === 'supresion' ? 'bg-red-500 text-white' : 'bg-[#289E9D] text-white'}`}>{selected.tipo === 'supresion' ? <TrashIcon className="h-5 w-5" /> : <ShieldCheckIcon className="h-5 w-5" />} Ejecutar solicitud</button></div> : null}
      </div> : <div className="grid min-h-72 place-items-center text-center text-[#6f7c8d]">Selecciona un expediente.</div>}</div></section>
  </div>;
};

export default PrivacyRequests;
