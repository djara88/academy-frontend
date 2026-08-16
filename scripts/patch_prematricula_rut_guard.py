from pathlib import Path
import re

p = Path('src/pages/MatriculaPreparacion.tsx')
s = p.read_text()

imp_anchor = "import api from '../api/axiosConfig';\n"
imp = "import { useAcademyMessages } from '../hooks/useAcademyMessages';\n"
if imp not in s:
    s = s.replace(imp_anchor, imp_anchor + imp, 1)

s = s.replace(
"type Recent = { id: string; estado: string; expires_at: string; sent_at?: string; opened_at?: string; signed_at?: string; tutor_payload?: any; jugador_payload?: any };",
"type Recent = { id: string; estado: string; expires_at: string; sent_at?: string; opened_at?: string; signed_at?: string; tutor_payload?: any; jugador_payload?: any; finanzas_payload?: any; evaluacion_payload?: any; emergencia_payload?: any };"
)

component_anchor = "const MatriculaPreparacion: React.FC = () => {\n"
if "useAcademyMessages()" not in s:
    s = s.replace(component_anchor, component_anchor + "  const { confirmAction, notify } = useAcademyMessages();\n", 1)

state_anchor = "  const [recent, setRecent] = useState<Recent[]>([]);\n"
extra_state = "  const [editingId, setEditingId] = useState<string | null>(null);\n  const [rutConflict, setRutConflict] = useState('');\n  const [rutChecking, setRutChecking] = useState(false);\n  const [lastAction, setLastAction] = useState<'created' | 'updated'>('created');\n"
if extra_state not in s:
    s = s.replace(state_anchor, state_anchor + extra_state, 1)

old_reset = "  const reset = () => { setStep(0); setTutor(emptyTutor); setJugador(emptyPlayer); setFinanzas(emptyFinance); setEvaluacion({}); setError(''); };"
new_reset = "  const reset = () => { setStep(0); setTutor(emptyTutor); setJugador(emptyPlayer); setFinanzas(emptyFinance); setEvaluacion({}); setError(''); setRutConflict(''); setEditingId(null); };"
s = s.replace(old_reset, new_reset)

validate_old = "    if (step === 1 && jugador.rut && !validarRut(jugador.rut)) return setError('El RUT del alumno no es válido.'), false;\n    return true;"
validate_new = "    if (step === 1 && jugador.rut && !validarRut(jugador.rut)) return setError('El RUT del alumno no es válido.'), false;\n    if (step === 1 && rutConflict) return setError(rutConflict), false;\n    return true;"
s = s.replace(validate_old, validate_new)

old_next = "  const next = () => { if (validate()) setStep((s) => Math.min(steps.length - 1, s + 1)); };\n\n"
helpers = r'''  const checkPlayerRut = async () => {
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

'''
if old_next in s:
    s = s.replace(old_next, helpers, 1)
elif "const checkPlayerRut" not in s:
    raise SystemExit('next anchor not found')

submit_pattern = re.compile(r"  const submit = async \(\) => \{.*?\n  \};\n\n  const total", re.S)
new_submit = r'''  const submit = async () => {
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

  const total'''
if not submit_pattern.search(s):
    raise SystemExit('submit block not found')
s = submit_pattern.sub(new_submit, s, count=1)

old_status = "  const statusClass = (status: string) => status === 'firmada' ? 'bg-emerald-500/15 text-emerald-300' : status === 'abierta' ? 'bg-sky-500/15 text-sky-300' : status === 'enviada' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-500/15 text-slate-300';"
new_status = "  const statusClass = (status: string) => status === 'firmada' ? 'bg-emerald-500/15 text-emerald-300' : status === 'abierta' ? 'bg-sky-500/15 text-sky-300' : status === 'enviada' ? 'bg-amber-500/15 text-amber-300' : status === 'error' ? 'bg-red-500/15 text-red-300' : status === 'cancelada' ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-500/15 text-slate-300';"
s = s.replace(old_status, new_status)

result_old = "{result && <div className=\"rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5\"><p className=\"text-xs font-black uppercase tracking-[.16em] text-emerald-300\">Pre-matrícula enviada</p><p className=\"mt-2 font-bold text-white\">{result.email_sent ? 'El correo fue enviado al apoderado.' : 'El borrador fue creado, pero no pudimos confirmar el envío del correo.'}</p>"
result_new = "{result && <div className=\"rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-5\"><p className=\"text-xs font-black uppercase tracking-[.16em] text-emerald-300\">{lastAction === 'updated' ? 'Pre-matrícula corregida y reenviada' : 'Pre-matrícula enviada'}</p><p className=\"mt-2 font-bold text-white\">{result.email_sent ? (lastAction === 'updated' ? 'Se invalidó el enlace anterior y se envió el enlace corregido al apoderado.' : 'El correo fue enviado al apoderado.') : 'El registro quedó guardado, pero no pudimos confirmar el envío del correo.'}</p>"
s = s.replace(result_old, result_new)

main_grid = "    <div className=\"grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]\">\n"
edit_banner = "    {editingId && <div className=\"flex flex-col gap-3 rounded-2xl border border-sky-500/30 bg-sky-950/25 p-4 text-sm text-sky-100 md:flex-row md:items-center md:justify-between\"><div><b className=\"text-sky-300\">Editando pre-matrícula.</b> Al guardar se invalidará el enlace anterior y se enviará uno nuevo al apoderado.</div><button type=\"button\" onClick={reset} className=\"rounded-xl border border-sky-400/30 px-4 py-2 font-bold text-sky-200\">Cancelar edición</button></div>}\n\n"
if edit_banner not in s:
    s = s.replace(main_grid, edit_banner + main_grid, 1)

rut_input_old = "<div><label className={labelClass}>RUT alumno</label><input className={inputClass} value={jugador.rut} onChange={(e) => setJugador({ ...jugador, rut: formatRut(e.target.value) })}/></div>"
rut_input_new = "<div><label className={labelClass}>RUT alumno</label><input className={`${inputClass} ${rutConflict ? 'border-red-500/70' : ''}`} value={jugador.rut} onChange={(e) => { setJugador({ ...jugador, rut: formatRut(e.target.value) }); setRutConflict(''); }} onBlur={checkPlayerRut}/>{rutChecking && <p className=\"mt-1 text-xs text-sky-300\">Validando RUT...</p>}{rutConflict && <p className=\"mt-1 text-xs font-bold text-red-300\">⚠️ {rutConflict}</p>}</div>"
if rut_input_old not in s:
    raise SystemExit('rut input anchor not found')
s = s.replace(rut_input_old, rut_input_new, 1)

old_actions = "{step < steps.length - 1 ? <button type=\"button\" onClick={next} className=\"rounded-xl bg-[#C8A96B] px-6 py-3 text-sm font-black text-[#111827]\">Continuar</button> : <button type=\"button\" disabled={loading} onClick={submit} className=\"rounded-xl bg-gradient-to-r from-[#C8A96B] to-[#E2C98D] px-6 py-3 text-sm font-black text-[#111827] disabled:opacity-50\">{loading ? 'Enviando...' : 'Enviar al apoderado'}</button>}"
new_actions = "{step < steps.length - 1 ? <button type=\"button\" disabled={rutChecking} onClick={next} className=\"rounded-xl bg-[#C8A96B] px-6 py-3 text-sm font-black text-[#111827] disabled:opacity-50\">{rutChecking ? 'Validando...' : 'Continuar'}</button> : <button type=\"button\" disabled={loading || rutChecking} onClick={submit} className=\"rounded-xl bg-gradient-to-r from-[#C8A96B] to-[#E2C98D] px-6 py-3 text-sm font-black text-[#111827] disabled:opacity-50\">{loading ? (editingId ? 'Guardando y reenviando...' : 'Enviando...') : (editingId ? 'Guardar corrección y reenviar' : 'Enviar al apoderado')}</button>}"
if old_actions not in s:
    raise SystemExit('action buttons anchor not found')
s = s.replace(old_actions, new_actions, 1)

old_card = "<div key={item.id} className=\"rounded-xl border border-[#30363d] bg-[#0d1117] p-3\"><div className=\"flex items-center justify-between gap-2\"><p className=\"truncate text-sm font-bold text-white\">{item.jugador_payload?.nombre || 'Alumno'}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(item.estado)}`}>{item.estado}</span></div><p className=\"mt-1 truncate text-xs text-[#6b7280]\">{item.tutor_payload?.nombre_completo || item.tutor_payload?.email || ''}</p></div>"
new_card = "<div key={item.id} className=\"rounded-xl border border-[#30363d] bg-[#0d1117] p-3\"><div className=\"flex items-center justify-between gap-2\"><p className=\"truncate text-sm font-bold text-white\">{item.jugador_payload?.nombre || 'Alumno'}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusClass(item.estado)}`}>{item.estado}</span></div><p className=\"mt-1 truncate text-xs text-[#6b7280]\">{item.tutor_payload?.nombre_completo || item.tutor_payload?.email || ''}</p>{['enviada','abierta','error'].includes(item.estado) && <div className=\"mt-3 grid grid-cols-2 gap-2\"><button type=\"button\" onClick={() => startEdit(item)} className=\"rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-xs font-bold text-sky-300\">Editar</button><button type=\"button\" onClick={() => cancelPrematricula(item)} className=\"rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-xs font-bold text-red-300\">Cancelar</button></div>}</div>"
if old_card not in s:
    raise SystemExit('recent card anchor not found')
s = s.replace(old_card, new_card, 1)

p.write_text(s)
