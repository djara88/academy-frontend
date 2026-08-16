import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

const inputClass = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-[#e6edf3] outline-none transition focus:border-[#C8A96B] focus:ring-2 focus:ring-[#C8A96B]/10 placeholder:text-[#5b6572]';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#8b949e]';
const money = (value: string | number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const formatRut = (value: string) => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
};
const validarRut = (rut: string) => {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1); const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0; let factor = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) { sum += Number(body[i]) * factor; factor = factor === 7 ? 2 : factor + 1; }
  const result = 11 - (sum % 11); const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return dv === expected;
};

const emptyTutor = { nombre_completo: '', rut: '', telefono: '', email: '' };
const emptyPlayer = { nombre: '', rut: '', fecha_nacimiento: '', sexo: '', posicion_cancha: '', tipo_alumno: 'Nuevo', certificado_medico: 'Pendiente', talla_uniforme: '', numero_camiseta: '', nombre_camiseta: '', talla_apoderado: 'No desea', monto_camiseta_apoderado: '' };
const emptyFinance = { monto_matricula: '', abono_matricula: '', monto_mensualidad: '' };
const steps = ['Apoderado', 'Alumno', 'Perfil deportivo', 'Valores y envío'];

type Result = { link: string; email_sent: boolean; data: { id: string; expires_at: string } };
type Recent = { id: string; estado: string; expires_at: string; sent_at?: string; opened_at?: string; signed_at?: string; tutor_payload?: any; jugador_payload?: any; finanzas_payload?: any; evaluacion_payload?: any; emergencia_payload?: any };

const MatriculaPreparacion: React.FC = () => {
  const { confirmAction, notify } = useAcademyMessages();
  const [step, setStep] = useState(0);
  const [tutor, setTutor] = useState(emptyTutor);
  const [jugador, setJugador] = useState(emptyPlayer);
  const [finanzas, setFinanzas] = useState(emptyFinance);
  const [evaluacion, setEvaluacion] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rutConflict, setRutConflict] = useState('');
  const [rutChecking, setRutChecking] = useState(false);
  const [lastAction, setLastAction] = useState<'created' | 'updated'>('created');

  const loadRecent = () => api.get('/api/prematriculas').then((r) => setRecent(r.data?.data || [])).catch(() => setRecent([]));
  useEffect(() => { loadRecent(); }, []);

  const skills = useMemo(() => {
    const map: Record<string, string[]> = {
      Arquero: ['Reflejos', 'Estirada', 'Saque de Mano', 'Saque de Meta', 'Juego de Pies', 'Valentía'],
      Defensa: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Mediocampista: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
      Delantero: ['Velocidad', 'Remate', 'Pase', 'Defensa', 'Físico', 'Mental'],
    };
    return map[jugador.posicion_cancha] || [];
  }, [jugador.posicion_cancha]);
  useEffect(() => {
    const next: Record<string, number> = {};
    skills.forEach((skill) => { next[skill] = evaluacion[skill] ?? 50; });
    setEvaluacion(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills.join('|')]);

  const reset = () => { setStep(0); setTutor(emptyTutor); setJugador(emptyPlayer); setFinanzas(emptyFinance); setEvaluacion({}); setError(''); setRutConflict(''); setEditingId(null); };
  const validate = () => {
    setError('');
    if (step === 0 && (!tutor.nombre_completo.trim() || !validarRut(tutor.rut) || !tutor.telefono.trim() || !tutor.email.trim())) return setError('Completa nombre, RUT válido, teléfono y correo del apoderado.'), false;
    if (step === 1 && (!jugador.nombre.trim() || !jugador.fecha_nacimiento || !jugador.sexo || !jugador.posicion_cancha)) return setError('Completa los datos obligatorios del alumno.'), false;
    if (step === 1 && jugador.rut && !validarRut(jugador.rut)) return setError('El RUT del alumno no es válido.'), false;
    if (step === 1 && rutConflict) return setError(rutConflict), false;
    return true;
  };
  const checkPlayerRut = async () => {
    setRutConflict('');
    if (!jugador.rut) return true;
    if (!validarRut(jugador.rut)) {
      setRutConflict('El RUT del alumno no es válido.');
      setError('El RUT del alumno no es válido.');
      return false;
    }
    setRutChecking(true);
    try {
      const response = await api.get('/api/prematriculas/validar-rut', {
        params: { rut: jugador.rut, exclude_id: editingId || undefined },
      });
      if (response.data?.available === false) {
        const message = response.data?.error || 'Ese RUT ya está registrado en la academia.';
        setRutConflict(message);
        setError(message);
        return false;
      }
      setError('');
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible validar el RUT. Intenta nuevamente antes de continuar.';
      setRutConflict(message);
      setError(message);
      return false;
    } finally {
      setRutChecking(false);
    }
  };

  const next = async () => {
    if (!validate()) return;
    if (step === 1 && jugador.rut && !(await checkPlayerRut())) return;
    setStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const startEdit = (item: Recent) => {
    const player = item.jugador_payload || {};
    const finance = item.finanzas_payload || {};
    setEditingId(item.id);
    setTutor({ ...emptyTutor, ...(item.tutor_payload || {}) });
    setJugador({
      ...emptyPlayer,
      ...player,
      numero_camiseta: player.numero_camiseta == null ? '' : String(player.numero_camiseta),
      monto_camiseta_apoderado: player.monto_camiseta_apoderado == null ? '' : String(player.monto_camiseta_apoderado),
    });
    setFinanzas({
      monto_matricula: finance.monto_matricula == null ? '' : String(finance.monto_matricula),
      abono_matricula: finance.abono_matricula == null ? '' : String(finance.abono_matricula),
      monto_mensualidad: finance.monto_mensualidad == null ? '' : String(finance.monto_mensualidad),
    });
    setEvaluacion(item.evaluacion_payload || {});
    setRutConflict('');
    setError('');
    setResult(null);
    setStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelPrematricula = async (item: Recent) => {
    const ok = await confirmAction(`¿Cancelar la pre-matrícula de ${item.jugador_payload?.nombre || 'este alumno'}? El enlace enviado dejará de funcionar, pero el registro se conservará para auditoría.`, 'danger');
    if (!ok) return;
    try {
      await api.patch(`/api/prematriculas/${item.id}/cancelar`);
      if (editingId === item.id) reset();
      await loadRecent();
      await notify('Pre-matrícula cancelada. El enlace anterior ya no puede utilizarse.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No fue posible cancelar la pre-matrícula.');
    }
  };

  const submit = async () => {
    if (!validate() || loading) return;
    if (jugador.rut && !(await checkPlayerRut())) return;
    setLoading(true); setError(''); setResult(null);
    const payload = {
      tutor,
      jugador: {
        ...jugador,
        rut: jugador.rut || null,
        numero_camiseta: jugador.numero_camiseta ? Number(jugador.numero_camiseta) : null,
        monto_camiseta_apoderado: jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0,
      },
      finanzas: {
        monto_matricula: Number(finanzas.monto_matricula || 0),
        abono_matricula: Number(finanzas.abono_matricula || 0),
        monto_mensualidad: Number(finanzas.monto_mensualidad || 0),
      },
      evaluacion,
      emergencia: {},
    };
    try {
      const wasEditing = Boolean(editingId);
      const response = editingId
        ? await api.put(`/api/prematriculas/${editingId}`, payload)
        : await api.post('/api/prematriculas', payload);
      setLastAction(wasEditing ? 'updated' : 'created');
      setResult(response.data);
      reset();
      await loadRecent();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'No fue posible enviar la pre-matrícula.';
      if (['PLAYER_RUT_EXISTS', 'PRE_ENROLLMENT_RUT_EXISTS'].includes(err?.response?.data?.code)) setRutConflict(message);
      setError(message);
    } finally { setLoading(false); }
  };

  const total = Number(finanzas.monto_matricula || 0) + (jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0);
  const saldo = Math.max(0, total - Number(finanzas.abono_matricula || 0));
  const statusClass = (status: string) => status === 'firmada' ? 'bg-emerald-500/15 text-emerald-300' : status === 'abierta' ? 'bg-sky-500/15 text-sky-300' : status === 'enviada' ? 'bg-amber-500/15 text-amber-300' : status === 'error' ? 'bg-red-500/15 text-red-300' : status === 'cancelada' ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-500/15 text-slate-300';

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-3xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#111827] to-[#0d1117] shadow-2xl">
      <div className="h-1.5 bg-gradient-to-r from-[#C8A96B] via-[#289E9D] to-[#C8A96B]" />
      <div className="p-6 lg:p-8"><span className="inline-flex rounded-full border border-[#C8A96B]/30 bg-[#C8A96B]/10 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[#D8BE87]">Nuevo flujo · pre-matrícula</span><h1 className="mt-3 text-3xl font-black text-white md:text-4xl">Prepara la matrícula, el apoderado la firma</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9ca3af]">La escuela registra la información. El apoderado recibe un enlace privado, lee condiciones y autorizaciones, decide por separado y firma. Solo entonces se crean la matrícula definitiva y sus cobros.</p></div>
    </section>

    {result && <div className="rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-emerald-300">{lastAction === 'updated' ? 'Pre-matrícula corregida y reenviada' : 'Pre-matrícula enviada'}</p><p className="mt-2 font-bold text-white">{result.email_sent ? (lastAction === 'updated' ? 'Se invalidó el enlace anterior y se envió el enlace corregido al apoderado.' : 'El correo fue enviado al apoderado.') : 'El registro quedó guardado, pero no pudimos confirmar el envío del correo.'}</p><div className="mt-4 flex flex-col gap-2 md:flex-row"><input readOnly value={result.link} className="min-w-0 flex-1 rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-xs text-slate-300"/><button onClick={() => navigator.clipboard.writeText(result.link)} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-emerald-950">Copiar enlace</button></div></div>}

    {editingId && <div className="flex flex-col gap-3 rounded-2xl border border-sky-500/30 bg-sky-950/25 p-4 text-sm text-sky-100 md:flex-row md:items-center md:justify-between"><div><b className="text-sky-300">Editando pre-matrícula.</b> Al guardar se invalidará el enlace anterior y se enviará uno nuevo al apoderado.</div><button type="button" onClick={reset} className="rounded-xl border border-sky-400/30 px-4 py-2 font-bold text-sky-200">Cancelar edición</button></div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <main className="space-y-5">
        <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-2 md:grid-cols-4">{steps.map((item, index) => <button key={item} type="button" onClick={() => index <= step && setStep(index)} className={`rounded-xl px-3 py-3 text-left ${index === step ? 'bg-[#C8A96B]/12 ring-1 ring-[#C8A96B]/35' : index < step ? 'bg-[#0d1117]' : 'opacity-45'}`}><div className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-black ${index < step ? 'bg-emerald-500 text-emerald-950' : index === step ? 'bg-[#C8A96B] text-slate-950' : 'bg-[#30363d] text-[#8b949e]'}`}>{index < step ? '✓' : index + 1}</div><p className="text-xs font-bold text-white">{item}</p></button>)}</nav>
        {error && <div className="rounded-2xl border border-red-700/50 bg-red-950/25 px-5 py-4 text-sm font-semibold text-red-300">{error}</div>}
        <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-5 shadow-xl md:p-7">
          {step === 0 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">01 · Apoderado</p><h2 className="mt-1 text-2xl font-black text-white">Destinatario de la pre-matrícula</h2><p className="mt-1 text-sm text-[#8b949e]">El enlace de firma llegará a este correo.</p></div><div className="grid gap-4 md:grid-cols-2"><div><label className={labelClass}>Nombre completo *</label><input autoFocus className={inputClass} value={tutor.nombre_completo} onChange={(e) => setTutor({ ...tutor, nombre_completo: e.target.value })}/></div><div><label className={labelClass}>RUT *</label><input className={inputClass} value={tutor.rut} onChange={(e) => setTutor({ ...tutor, rut: formatRut(e.target.value) })}/></div><div><label className={labelClass}>Teléfono *</label><input className={inputClass} value={tutor.telefono} onChange={(e) => setTutor({ ...tutor, telefono: e.target.value })}/></div><div><label className={labelClass}>Correo *</label><input type="email" className={inputClass} value={tutor.email} onChange={(e) => setTutor({ ...tutor, email: e.target.value })}/></div></div></div>}
          {step === 1 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">02 · Alumno</p><h2 className="mt-1 text-2xl font-black text-white">Datos de incorporación</h2></div><div className="grid gap-4 md:grid-cols-2"><div><label className={labelClass}>Nombre completo *</label><input className={inputClass} value={jugador.nombre} onChange={(e) => setJugador({ ...jugador, nombre: e.target.value })}/></div><div><label className={labelClass}>RUT alumno</label><input className={`${inputClass} ${rutConflict ? 'border-red-500/70' : ''}`} value={jugador.rut} onChange={(e) => { setJugador({ ...jugador, rut: formatRut(e.target.value) }); setRutConflict(''); }} onBlur={checkPlayerRut}/>{rutChecking && <p className="mt-1 text-xs text-sky-300">Validando RUT...</p>}{rutConflict && <p className="mt-1 text-xs font-bold text-red-300">⚠️ {rutConflict}</p>}</div><div><label className={labelClass}>Fecha nacimiento *</label><input type="date" className={inputClass} value={jugador.fecha_nacimiento} onChange={(e) => setJugador({ ...jugador, fecha_nacimiento: e.target.value })}/></div><div><label className={labelClass}>Sexo *</label><select className={inputClass} value={jugador.sexo} onChange={(e) => setJugador({ ...jugador, sexo: e.target.value })}><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro / no informado</option></select></div><div><label className={labelClass}>Posición *</label><select className={inputClass} value={jugador.posicion_cancha} onChange={(e) => setJugador({ ...jugador, posicion_cancha: e.target.value })}><option value="">Seleccionar</option><option>Arquero</option><option>Defensa</option><option>Mediocampista</option><option>Delantero</option></select></div><div><label className={labelClass}>Tipo alumno</label><select className={inputClass} value={jugador.tipo_alumno} onChange={(e) => setJugador({ ...jugador, tipo_alumno: e.target.value })}><option>Nuevo</option><option value="Antiguo">Renovación</option></select></div><div><label className={labelClass}>Talla uniforme</label><select className={inputClass} value={jugador.talla_uniforme} onChange={(e) => setJugador({ ...jugador, talla_uniforme: e.target.value })}><option value="">Por definir</option>{['Talla 4','Talla 6','Talla 8','Talla 10','Talla 12','Talla 14','Talla 16','S','M','L','XL'].map((v) => <option key={v}>{v}</option>)}</select></div><div><label className={labelClass}>N° camiseta</label><input type="number" className={inputClass} value={jugador.numero_camiseta} onChange={(e) => setJugador({ ...jugador, numero_camiseta: e.target.value })}/></div><div><label className={labelClass}>Nombre camiseta</label><input className={inputClass} value={jugador.nombre_camiseta} onChange={(e) => setJugador({ ...jugador, nombre_camiseta: e.target.value.toUpperCase() })}/></div><div><label className={labelClass}>Camiseta apoderado</label><select className={inputClass} value={jugador.talla_apoderado} onChange={(e) => setJugador({ ...jugador, talla_apoderado: e.target.value, monto_camiseta_apoderado: e.target.value === 'No desea' ? '' : jugador.monto_camiseta_apoderado })}><option>No desea</option>{['S','M','L','XL','XXL'].map((v) => <option key={v}>{v}</option>)}</select></div>{jugador.talla_apoderado !== 'No desea' && <div><label className={labelClass}>Valor camiseta apoderado</label><input type="number" className={inputClass} value={jugador.monto_camiseta_apoderado} onChange={(e) => setJugador({ ...jugador, monto_camiseta_apoderado: e.target.value })}/></div>}</div></div>}
          {step === 2 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">03 · Perfil deportivo</p><h2 className="mt-1 text-2xl font-black text-white">Evaluación inicial opcional</h2><p className="mt-1 text-sm text-[#8b949e]">La fotografía no se captura aquí: se habilita después de que el apoderado autorice el uso interno de imagen.</p></div>{skills.length ? <div className="grid gap-4 md:grid-cols-2">{skills.map((skill) => <div key={skill} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4"><div className="flex items-center justify-between"><label className="font-bold text-white">{skill}</label><span className="font-black text-[#C8A96B]">{evaluacion[skill] || 50}/100</span></div><input type="range" min="1" max="100" value={evaluacion[skill] || 50} onChange={(e) => setEvaluacion({ ...evaluacion, [skill]: Number(e.target.value) })} className="mt-4 w-full accent-[#C8A96B]"/></div>)}</div> : <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-6 text-sm text-[#8b949e]">Selecciona la posición del alumno para habilitar la evaluación inicial.</div>}</div>}
          {step === 3 && <div className="space-y-6"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">04 · Valores y envío</p><h2 className="mt-1 text-2xl font-black text-white">La escuela propone; el apoderado confirma</h2></div><div className="grid gap-4 md:grid-cols-3"><div><label className={labelClass}>Matrícula</label><input type="number" min="0" className={inputClass} value={finanzas.monto_matricula} onChange={(e) => setFinanzas({ ...finanzas, monto_matricula: e.target.value })}/></div><div><label className={labelClass}>Abono inicial</label><input type="number" min="0" className={inputClass} value={finanzas.abono_matricula} onChange={(e) => setFinanzas({ ...finanzas, abono_matricula: e.target.value })}/></div><div><label className={labelClass}>Mensualidad</label><input type="number" min="0" className={inputClass} value={finanzas.monto_mensualidad} onChange={(e) => setFinanzas({ ...finanzas, monto_mensualidad: e.target.value })}/></div></div><div className="grid gap-3 md:grid-cols-4">{[['Total matrícula',money(total)],['Abono',money(finanzas.abono_matricula)],['Saldo',money(saldo)],['Mensualidad',money(finanzas.monto_mensualidad)]].map(([l,v]) => <div key={l} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4"><p className="text-xs text-[#7d8793]">{l}</p><p className="mt-1 text-lg font-black text-white">{v}</p></div>)}</div><div className="rounded-2xl border border-sky-600/20 bg-sky-950/20 p-5 text-sm leading-6 text-sky-100">Al enviar, <b>no se crea todavía un alumno activo ni un cobro</b>. El apoderado recibirá el enlace para leer, aceptar o rechazar autorizaciones y firmar. La matrícula se formaliza únicamente después de esa firma.</div></div>}
          <div className="mt-8 flex items-center justify-between border-t border-[#30363d] pt-5"><button type="button" disabled={step === 0} onClick={() => { setError(''); setStep((s) => Math.max(0, s - 1)); }} className="rounded-xl border border-[#30363d] px-5 py-3 text-sm font-bold text-[#b1bac4] disabled:opacity-30">Anterior</button>{step < steps.length - 1 ? <button type="button" disabled={rutChecking} onClick={next} className="rounded-xl bg-[#C8A96B] px-6 py-3 text-sm font-black text-[#111827] disabled:opacity-50">{rutChecking ? 'Validando...' : 'Continuar'}</button> : <button type="button" disabled={loading || rutChecking} onClick={submit} className="rounded-xl bg-gradient-to-r from-[#C8A96B] to-[#E2C98D] px-6 py-3 text-sm font-black text-[#111827] disabled:opacity-50">{loading ? (editingId ? 'Guardando y reenviando...' : 'Enviando...') : (editingId ? 'Guardar corrección y reenviar' : 'Enviar al apoderado')}</button>}</div>
        </section>
      </main>
      <aside className="space-y-4"><div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-[#C8A96B]">Flujo correcto</p><div className="mt-4 space-y-3 text-sm text-[#9ca3af]"><p><b className="text-white">1.</b> Escuela prepara</p><p><b className="text-white">2.</b> Apoderado revisa</p><p><b className="text-white">3.</b> Decide autorizaciones</p><p><b className="text-white">4.</b> Firma</p><p><b className="text-white">5.</b> Se activa matrícula y cobros</p></div></div><div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-5"><p className="font-black text-white">Pre-matrículas recientes</p><div className="mt-4 space-y-3">{recent.slice(0,8).map((item) => <div key={item.id} className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3"><div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{item.jugador_payload?.nombre || 'Alumno'}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(item.estado)}`}>{item.estado}</span></div><p className="mt-1 truncate text-xs text-[#6b7280]">{item.tutor_payload?.nombre_completo || item.tutor_payload?.email || ''}</p>{['enviada','abierta','error'].includes(item.estado) && <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" onClick={() => startEdit(item)} className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-xs font-bold text-sky-300">Editar</button><button type="button" onClick={() => cancelPrematricula(item)} className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-bold text-red-300">Cancelar</button></div>}</div>)}{!recent.length && <p className="text-xs text-[#6b7280]">Aún no hay pre-matrículas.</p>}</div></div></aside>
    </div>
  </div>;
};

export default MatriculaPreparacion;
