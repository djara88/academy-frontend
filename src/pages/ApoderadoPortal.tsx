import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDaysIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Portal = {
  apoderado: { nombre: string };
  academia: { nombre: string };
  jugadores: { id: string; nombre: string; foto_url?: string | null; avatar_url?: string | null; estado_financiero?: string | null; saldo_pendiente?: number | null }[];
  proximos_partidos: { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; categorias?: { nombre: string } | null }[];
  asistencias_recientes: { id: string; jugador_id: string; estado: string; entrenamientos?: { fecha: string } | null }[];
  finanzas: { saldo_pendiente: number };
};

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0);
const date = (value?: string | null) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL') : 'Por definir';
const field = 'min-h-12 w-full rounded-[14px] border border-[#d6ddd2] bg-[#f3f6f0] px-4 text-sm font-bold text-[#111711] outline-none transition focus:border-[#8eb700] focus:ring-4 focus:ring-[#b7ff00]/10';
const textarea = `${field} min-h-28 resize-y py-3`;

const ApoderadoPortal = () => {
  const queryClient = useQueryClient();
  const [privacyForm, setPrivacyForm] = useState({ jugador_id: '', tipo: 'acceso', detalle: '', bloqueo_solicitado: false });
  const [privacyStatus, setPrivacyStatus] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['apoderado-portal'],
    queryFn: async () => (await api.get('/api/apoderados/me')).data.data as Portal,
  });
  const privacyQuery = useQuery({
    queryKey: ['guardian-privacy'],
    queryFn: async () => (await api.get('/api/apoderados/me/solicitudes-privacidad')).data.data as any[],
  });

  const attendanceByPlayer = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    for (const row of data?.asistencias_recientes || []) {
      const current = map.get(String(row.jugador_id)) || { total: 0, present: 0 };
      current.total += 1;
      if (['Presente', 'Justificado'].includes(String(row.estado))) current.present += 1;
      map.set(String(row.jugador_id), current);
    }
    return map;
  }, [data?.asistencias_recientes]);

  const sendPrivacyRequest = async () => {
    if (!privacyForm.jugador_id || !privacyForm.detalle.trim()) {
      setPrivacyStatus('Selecciona un alumno y describe tu solicitud.');
      return;
    }
    setPrivacySaving(true);
    setPrivacyStatus('');
    try {
      await api.post('/api/apoderados/me/solicitudes-privacidad', privacyForm);
      setPrivacyForm({ jugador_id: '', tipo: 'acceso', detalle: '', bloqueo_solicitado: false });
      setPrivacyStatus('Solicitud registrada correctamente. La academia podrá revisar su estado y responderte.');
      await queryClient.invalidateQueries({ queryKey: ['guardian-privacy'] });
    } catch (requestError: any) {
      setPrivacyStatus(requestError.response?.data?.error || 'No fue posible registrar la solicitud.');
    } finally { setPrivacySaving(false); }
  };

  if (isLoading) return <div className="rounded-[24px] border border-[#dfe5dc] bg-white p-12 text-center text-sm font-bold text-[#697468]">Cargando tu información...</div>;
  if (error || !data) return <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">No fue posible cargar tu portal. Contacta a la dirección de tu academia.</div>;

  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-[20px] border border-[#d9e0d6] bg-white p-5 shadow-[0_10px_26px_rgba(15,23,16,.035)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#748073]">Mis alumnos</p><p className="mt-2 text-2xl font-black text-[#111711]">{data.jugadores.length}</p><p className="mt-1 text-xs font-semibold text-[#697468]">Vinculados a tu cuenta</p></article>
      <article className="rounded-[20px] border border-[#cde995] bg-[#f3fadf] p-5 shadow-[0_10px_26px_rgba(15,23,16,.035)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#617b00]">Próximos eventos</p><p className="mt-2 text-2xl font-black text-[#111711]">{data.proximos_partidos.length}</p><p className="mt-1 text-xs font-semibold text-[#697468]">Citaciones y partidos</p></article>
      <article className="rounded-[20px] border border-[#263026] bg-[#111711] p-5 shadow-[0_10px_26px_rgba(15,23,16,.035)]"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Saldo familiar</p><p className="mt-2 text-2xl font-black text-white">{money(data.finanzas.saldo_pendiente)}</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">Detalle y pago más abajo</p></article>
    </section>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Familia</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Tus alumnos</h2></div><p className="text-sm text-[#697468]">Información visible solo para tu cuenta.</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.jugadores.map((player) => {
        const attendance = attendanceByPlayer.get(String(player.id));
        return <article key={player.id} className="rounded-[22px] border border-[#dfe5dc] bg-white p-5 shadow-[0_12px_30px_rgba(20,29,21,.045)]"><div className="flex items-center gap-4">{player.foto_url || player.avatar_url ? <img src={player.foto_url || player.avatar_url || ''} alt="" className="h-14 w-14 rounded-[16px] object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#111711]"><UserIcon className="h-7 w-7 text-[#b7ff00]" /></div>}<div className="min-w-0"><h3 className="truncate text-lg font-black text-[#111711]">{player.nombre}</h3><p className="mt-1 text-xs font-semibold text-[#697468]">{player.estado_financiero || 'Sin observaciones financieras'}</p></div></div>{attendance ? <div className="mt-4 rounded-[14px] border border-[#e1e6df] bg-[#f8faf6] px-3 py-2 text-xs font-bold text-[#566056]">Asistencia reciente: {attendance.present}/{attendance.total}</div> : null}</article>;
      })}</div>
    </section>

    <section className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <article className="rounded-[24px] border border-[#d9e0d6] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,16,.045)] sm:p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#111711]"><CalendarDaysIcon className="h-6 w-6 text-[#b7ff00]" /></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Agenda</p><h2 className="text-xl font-black text-[#111711]">Próximos partidos y eventos</h2></div></div><div className="mt-4 space-y-3">{data.proximos_partidos.length ? data.proximos_partidos.map((match) => <div key={match.id} className="rounded-[16px] border border-[#e1e6df] bg-[#f8faf6] p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-black text-[#111711]">vs {match.rival}</p><p className="mt-1 text-xs font-semibold text-[#697468]">{match.categorias?.nombre || 'Categoría'} · {match.ubicacion || 'Lugar por confirmar'}</p></div><span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black text-[#4f6900]">{date(match.fecha)}</span></div><div className="mt-3 flex flex-wrap gap-3 text-xs font-black"><span className="text-[#617b00]">Citación {match.hora_citacion?.slice(0, 5) || 'Por definir'}</span><span className="text-[#111711]">Inicio {match.hora?.slice(0, 5) || 'Por definir'}</span></div></div>) : <p className="py-10 text-center text-sm text-[#697468]">No hay eventos próximos.</p>}</div></article>

      <article className="rounded-[24px] border border-[#263026] bg-[#111711] p-5 text-white shadow-[0_14px_36px_rgba(15,23,16,.08)] sm:p-6"><ChatBubbleLeftRightIcon className="h-8 w-8 text-[#b7ff00]"/><p className="mt-5 text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Comunicación directa</p><h2 className="mt-1 text-xl font-black">Mensajes con la academia</h2><p className="mt-2 text-sm leading-6 text-[#c7d0c8]">Consulta dudas deportivas o administrativas manteniendo el historial en tu cuenta.</p><Link to="/apoderado/mensajes" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#b7ff00] px-5 text-sm font-black text-[#111711]">Abrir mensajes</Link></article>
    </section>

    <section className="rounded-[24px] border border-[#d9e0d6] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,16,.045)] sm:p-6"><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#f3fadf]"><ShieldCheckIcon className="h-6 w-6 text-[#617b00]" /></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Privacidad</p><h2 className="mt-1 text-xl font-black text-[#111711]">Tus derechos sobre los datos</h2><p className="mt-1 text-sm leading-6 text-[#697468]">Registra una solicitud respecto de cualquiera de tus alumnos vinculados.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><label><span className="mb-1.5 block text-[11px] font-black uppercase text-[#697468]">Alumno</span><select value={privacyForm.jugador_id} onChange={(event) => setPrivacyForm({ ...privacyForm, jugador_id: event.target.value })} className={field}><option value="">Seleccionar</option>{data.jugadores.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></label><label><span className="mb-1.5 block text-[11px] font-black uppercase text-[#697468]">Tipo de solicitud</span><select value={privacyForm.tipo} onChange={(event) => setPrivacyForm({ ...privacyForm, tipo: event.target.value })} className={field}><option value="acceso">Acceso a datos</option><option value="rectificacion">Rectificación</option><option value="supresion">Supresión</option><option value="oposicion">Oposición</option><option value="portabilidad">Portabilidad</option><option value="bloqueo">Bloqueo temporal</option><option value="revocacion_imagen">Revocación de fotografías / imagen</option></select></label></div>
      <textarea value={privacyForm.detalle} onChange={(event) => setPrivacyForm({ ...privacyForm, detalle: event.target.value })} placeholder="Describe claramente qué necesitas y qué datos están involucrados." className={`${textarea} mt-3`} />
      <label className="mt-3 flex items-start gap-3 rounded-[14px] border border-[#dfe5dc] bg-[#f8faf6] p-3 text-sm font-semibold text-[#566056]"><input type="checkbox" checked={privacyForm.bloqueo_solicitado} onChange={(event) => setPrivacyForm({ ...privacyForm, bloqueo_solicitado: event.target.checked })} className="mt-1 accent-[#8eb700]" /> Solicitar también bloqueo temporal del tratamiento mientras se revisa, cuando corresponda.</label>
      <button disabled={privacySaving} onClick={() => void sendPrivacyRequest()} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#111711] px-5 text-sm font-black text-[#b7ff00] disabled:opacity-50">{privacySaving ? 'Enviando...' : 'Registrar solicitud'}</button>
      {privacyStatus ? <p className="mt-3 rounded-[14px] border border-[#dfe5dc] bg-[#f8faf6] p-3 text-sm font-bold text-[#566056]">{privacyStatus}</p> : null}
      <div className="mt-6 border-t border-[#e5e9e2] pt-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#7c867b]">Solicitudes recientes</p><div className="mt-3 space-y-2">{(privacyQuery.data || []).slice(0, 5).map((item: any) => <div key={item.id} className="flex flex-col gap-2 rounded-[14px] border border-[#e1e6df] bg-[#f8faf6] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-[#111711]">{item.jugadores?.nombre || 'Alumno'} · {String(item.tipo).split('_').join(' ')}</p><p className="text-xs text-[#697468]">Ingresada: {new Date(item.fecha_recepcion).toLocaleDateString('es-CL')}</p></div><span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2 py-1 text-[10px] font-black uppercase text-[#4f6900]">{item.estado}</span></div>)}{!privacyQuery.data?.length ? <p className="text-sm text-[#697468]">Aún no tienes solicitudes.</p> : null}</div></div>
    </section>

    <section className="rounded-[20px] border border-[#cde995] bg-[#f3fadf] p-4"><div className="flex items-start gap-3"><CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#617b00]"/><div><p className="text-sm font-black text-[#111711]">Pago en línea integrado</p><p className="mt-1 text-xs leading-5 text-[#566056]">Si tu academia tiene Mercado Pago conectado, el módulo financiero de este mismo portal te permitirá seleccionar cuotas y pagar directamente sin abrir el portal público.</p></div></div></section>
  </div>;
};

export default ApoderadoPortal;
