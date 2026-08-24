import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon, CheckBadgeIcon, ClockIcon, ExclamationTriangleIcon, ShieldCheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DIRECTOR_TEXTAREA,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

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
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

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
    {label:'Abiertas',value:summary?.abiertas||0,tone:'lime' as const},
    {label:'Vencen ≤ 5 días',value:summary?.proximas_vencer||0,tone:'default' as const},
    {label:'Vencidas',value:summary?.vencidas||0,tone:'dark' as const},
    {label:'Identidad pendiente',value:summary?.pendientes_identidad||0,tone:'default' as const},
  ], [summary]);

  if (requestsQuery.isLoading) return <DirectorPanel className="mx-auto max-w-5xl p-12 text-center text-sm font-bold text-[#697468]">Cargando centro de privacidad...</DirectorPanel>;

  return <DirectorPage>
    <DirectorHero
      eyebrow="Protección y trazabilidad"
      title="Solicitudes de titulares"
      description="Registra, verifica y resuelve solicitudes de acceso, rectificación, supresión, oposición, portabilidad, bloqueo o revocación de imagen con trazabilidad operacional."
      aside={<div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5"><ShieldCheckIcon className="h-7 w-7 text-[#b7ff00]"/><p className="mt-3 text-xl font-black text-white">Centro de privacidad</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{summary?.total||0} expedientes registrados</p></div>}
    />

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card=><DirectorStat key={card.label} label={card.label} value={card.value} tone={card.tone}/>)}</section>

    <DirectorPanel className="p-5 sm:p-6">
      <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nuevo expediente</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Registrar una solicitud</h2><p className="mt-1 text-sm text-[#697468]">Deja identificado al titular, el derecho ejercido y el alumno relacionado antes de iniciar la gestión.</p></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label><span className={labelClass}>Alumno</span><select className={DIRECTOR_FIELD} value={form.jugador_id} onChange={(e)=>setForm({...form,jugador_id:e.target.value})}><option value="">Seleccionar</option>{(playersQuery.data||[]).filter(p=>!p.privacy_anonymized_at).map(player=><option key={player.id} value={player.id}>{player.nombre}{player.rut?` · ${player.rut}`:''}</option>)}</select></label>
        <label><span className={labelClass}>Derecho ejercido</span><select className={DIRECTOR_FIELD} value={form.tipo} onChange={(e)=>setForm({...form,tipo:e.target.value})}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <label><span className={labelClass}>Nombre solicitante</span><input className={DIRECTOR_FIELD} value={form.solicitante_nombre} onChange={(e)=>setForm({...form,solicitante_nombre:e.target.value})}/></label>
        <label><span className={labelClass}>Correo</span><input type="email" className={DIRECTOR_FIELD} value={form.solicitante_email} onChange={(e)=>setForm({...form,solicitante_email:e.target.value})}/></label>
        <label><span className={labelClass}>Documento / RUT</span><input className={DIRECTOR_FIELD} value={form.solicitante_documento} onChange={(e)=>setForm({...form,solicitante_documento:e.target.value})}/></label>
        <label className="flex min-h-12 items-center gap-3 rounded-[14px] border border-[#d9e0d6] bg-[#f5f7f3] px-4 text-sm font-bold text-[#111711]"><input type="checkbox" checked={form.bloqueo_solicitado} onChange={(e)=>setForm({...form,bloqueo_solicitado:e.target.checked})} className="h-4 w-4 accent-[#9fcf00]"/>Solicita bloqueo temporal</label>
      </div>
      <label className="mt-4 block"><span className={labelClass}>Detalle</span><textarea className={DIRECTOR_TEXTAREA} value={form.detalle} onChange={(e)=>setForm({...form,detalle:e.target.value})}/></label>
      <div className="mt-4 flex justify-end"><button disabled={loadingAction} onClick={()=>void create()} className={DIRECTOR_BUTTON}>Registrar solicitud</button></div>
    </DirectorPanel>

    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <DirectorPanel className="p-4">
        <div className="px-1"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Historial</p><h2 className="mt-1 text-xl font-black text-[#111711]">Expedientes</h2></div>
        <div className="mt-3 max-h-[680px] space-y-2 overflow-y-auto pr-1">
          {requests.length?requests.map(row=>{
            const late=Number(row.dias_restantes)<0; const soon=Number(row.dias_restantes)>=0&&Number(row.dias_restantes)<=5;
            return <button key={row.id} onClick={()=>{setSelectedId(row.id);setDecision({respuesta:row.respuesta||'',fundamento:row.fundamento_decision||'',confirmacion:''});}} className={`w-full rounded-[18px] border p-4 text-left transition ${selected?.id===row.id?'border-[#9fcf00] bg-[#f3fadf]':'border-[#dfe5dc] bg-[#f7f9f5] hover:border-[#aebaa9]'}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-[#111711]">{row.jugadores?.nombre||'Alumno no disponible'}</p><p className="mt-1 text-xs text-[#697468]">{labels[row.tipo]||row.tipo} · {formatDate(row.fecha_recepcion)}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${late?'bg-red-50 text-red-700':soon?'bg-amber-50 text-amber-700':terminal.has(row.estado)?'bg-[#e8f6d0] text-[#416400]':'bg-white text-[#596458]'}`}>{row.estado}</span></div>
              <p className={`mt-3 text-xs font-semibold ${late?'text-red-700':soon?'text-amber-700':'text-[#758074]'}`}>{late?`Vencida hace ${Math.abs(Number(row.dias_restantes))} día(s)`:`${row.dias_restantes??'—'} día(s) para responder`}</p>
            </button>;
          }):<p className="p-8 text-center text-sm text-[#697468]">No hay solicitudes registradas.</p>}
        </div>
      </DirectorPanel>

      <DirectorPanel className="p-5 sm:p-6">
        {selected?<>
          <div className="flex flex-col gap-4 border-b border-[#e2e7df] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">{labels[selected.tipo]||selected.tipo}</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">{selected.jugadores?.nombre||'Alumno anonimizado'}</h2><p className="mt-2 text-sm text-[#697468]">Solicitante: {selected.solicitante_nombre} · {selected.solicitante_email}</p></div>
            {selected.identidad_verificada?<span className="inline-flex items-center gap-1 rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-2 text-xs font-black text-[#4f6900]"><CheckBadgeIcon className="h-4 w-4"/>Identidad verificada</span>:<button disabled={loadingAction} onClick={()=>void verify(selected.id)} className={DIRECTOR_BUTTON}>Verificar identidad</button>}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[#dfe5dc] bg-[#f6f8f4] p-4"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#758074]">Fecha recepción</p><p className="mt-1 font-black text-[#111711]">{formatDate(selected.fecha_recepcion)}</p></div>
            <div className="rounded-[16px] border border-[#dfe5dc] bg-[#f6f8f4] p-4"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#758074]">Fecha límite</p><p className="mt-1 font-black text-[#111711]">{formatDate(selected.fecha_limite_prorrogada||selected.fecha_limite)}</p></div>
          </div>

          {selected.detalle?<div className="mt-4 rounded-[16px] border border-[#dfe5dc] bg-[#f7f9f5] p-4 text-sm leading-6 text-[#596458]">{selected.detalle}</div>:null}

          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={loadingAction} onClick={()=>void downloadExport(selected)} className={DIRECTOR_BUTTON_GHOST}><ArrowDownTrayIcon className="h-4 w-4"/>Exportar</button>
            {!terminal.has(selected.estado)?<button disabled={loadingAction} onClick={()=>void extend(selected.id)} className={DIRECTOR_BUTTON_GHOST}><ClockIcon className="h-4 w-4"/>Prorrogar 30 días</button>:null}
          </div>

          {!terminal.has(selected.estado)?<div className="mt-6 border-t border-[#e2e7df] pt-5">
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Decisión y respuesta</p>
            <label className="mt-3 block"><span className={labelClass}>Respuesta al titular</span><textarea className={DIRECTOR_TEXTAREA} value={decision.respuesta} onChange={(e)=>setDecision({...decision,respuesta:e.target.value})}/></label>
            <label className="mt-3 block"><span className={labelClass}>Fundamento si se rechaza</span><textarea className={DIRECTOR_TEXTAREA} value={decision.fundamento} onChange={(e)=>setDecision({...decision,fundamento:e.target.value})}/></label>
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><button disabled={loadingAction} onClick={()=>void decide(selected.id,'aprobada')} className={DIRECTOR_BUTTON}>Aprobar solicitud</button><button disabled={loadingAction} onClick={()=>void decide(selected.id,'rechazada')} className={DIRECTOR_BUTTON_DARK}>Rechazar con fundamento</button></div>
          </div>:null}

          {selected.estado==='aprobada'?<div className="mt-6 rounded-[18px] border border-[#dfe5dc] bg-[#f7f9f5] p-4">
            <div className="flex items-start gap-3"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#789600]"/><div><p className="font-black text-[#111711]">Ejecutar decisión aprobada</p><p className="mt-1 text-xs leading-5 text-[#697468]">Para supresión, confirma escribiendo exactamente <strong>SUPRIMIR DATOS</strong>.</p></div></div>
            {selected.tipo==='supresion'?<input value={decision.confirmacion} onChange={(e)=>setDecision({...decision,confirmacion:e.target.value})} className={`${DIRECTOR_FIELD} mt-3`} placeholder="SUPRIMIR DATOS"/>:null}
            <button disabled={loadingAction} onClick={()=>void execute(selected)} className={`${selected.tipo==='supresion'?DIRECTOR_BUTTON_DARK:DIRECTOR_BUTTON} mt-3`}><TrashIcon className="h-4 w-4"/>Ejecutar solicitud</button>
          </div>:null}
        </>:<div className="grid min-h-[380px] place-items-center text-sm text-[#697468]">Selecciona un expediente.</div>}
      </DirectorPanel>
    </section>
  </DirectorPage>;
};

export default PrivacyRequests;
