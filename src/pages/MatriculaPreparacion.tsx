import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import JerseyNumberPicker from '../components/JerseyNumberPicker';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';
const money = (value: string | number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const formatRut = (value: string) => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (clean.length <= 1) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
};
const validarRut = (rut: string) => {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return dv === expected;
};

const emptyTutor = { nombre_completo: '', rut: '', telefono: '', email: '' };
type StructureBranch = { id: string; sede_id: string; nombre: string; disciplina: string; principal: boolean; activa: boolean };
type StructureSite = { id: string; nombre: string; principal: boolean; activa: boolean; ramas: StructureBranch[] };
type Category = { id: string; nombre: string; rama_id?: string | null; sede_id?: string | null };
type SportProfile = { code: string; label: string; roleLabel: string; roles: string[]; metrics: string[]; profileCode: string; metricVersion: number; supportsFootballStats: boolean };
const emptyPlayer = { nombre: '', rut: '', fecha_nacimiento: '', sexo: '', posicion_cancha: '', tipo_alumno: 'Nuevo', certificado_medico: 'Pendiente', talla_uniforme: '', numero_camiseta: '', nombre_camiseta: '', talla_apoderado: 'No desea', monto_camiseta_apoderado: '', sede_id: '', rama_id: '', categoria_id: '' };
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
  const [sportProfile, setSportProfile] = useState<SportProfile | null>(null);
  const [evaluationEnabled, setEvaluationEnabled] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rutConflict, setRutConflict] = useState('');
  const [rutChecking, setRutChecking] = useState(false);
  const [lastAction, setLastAction] = useState<'created' | 'updated'>('created');
  const [structure, setStructure] = useState<StructureSite[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const loadRecent = () => api.get('/api/prematriculas').then((response) => setRecent(response.data?.data || [])).catch(() => setRecent([]));

  useEffect(() => {
    void loadRecent();
    void api.get('/api/estructura').then((response) => setStructure(response.data?.data || [])).catch(() => setStructure([]));
    void api.get('/api/academias/mi-plan').then((response) => setEvaluationEnabled((response.data?.data?.features || []).includes('evaluaciones'))).catch(() => setEvaluationEnabled(false));
  }, []);

  useEffect(() => {
    if (jugador.sede_id || !structure.length) return;
    const site = structure.find((item) => item.principal && item.activa) || structure.find((item) => item.activa);
    const branch = site?.ramas.find((item) => item.principal && item.activa) || site?.ramas.find((item) => item.activa);
    if (site) setJugador((current) => ({ ...current, sede_id: site.id, rama_id: branch?.id || '', categoria_id: '', numero_camiseta: '' }));
  }, [structure, jugador.sede_id]);

  useEffect(() => {
    if (!jugador.rama_id) {
      setSportProfile(null);
      setEvaluacion({});
      return;
    }
    let cancelled = false;
    void api.get('/api/sport-profiles', { params: { rama_id: jugador.rama_id, role: jugador.posicion_cancha || undefined } })
      .then((response) => {
        if (cancelled) return;
        const profile = response.data?.data as SportProfile;
        setSportProfile(profile);
        if (evaluationEnabled) {
          setEvaluacion((current) => Object.fromEntries((profile.metrics || []).map((metric) => [metric, current[metric] ?? 50])));
        } else setEvaluacion({});
      })
      .catch(() => { if (!cancelled) { setSportProfile(null); setEvaluacion({}); } });
    return () => { cancelled = true; };
  }, [jugador.rama_id, jugador.posicion_cancha, evaluationEnabled]);

  useEffect(() => {
    if (!jugador.rama_id) {
      setCategories([]);
      setCategoriesLoading(false);
      return;
    }
    let cancelled = false;
    setCategoriesLoading(true);
    void api.get('/api/categorias', { params: { rama_id: jugador.rama_id } })
      .then((response) => {
        if (cancelled) return;
        const nextCategories = (response.data?.data || []) as Category[];
        setCategories(nextCategories);
        setJugador((current) => {
          if (current.rama_id !== jugador.rama_id) return current;
          const currentStillExists = nextCategories.some((category) => category.id === current.categoria_id);
          const nextCategoryId = currentStillExists ? current.categoria_id : nextCategories.length === 1 ? nextCategories[0].id : '';
          if (nextCategoryId === current.categoria_id) return current;
          return { ...current, categoria_id: nextCategoryId, numero_camiseta: '' };
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCategories([]);
          setError('No fue posible cargar las categorías de la rama seleccionada.');
        }
      })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, [jugador.rama_id]);

  const activeSites = useMemo(() => structure.filter((site) => site.activa), [structure]);
  const availableBranches = useMemo(() => {
    const site = structure.find((item) => item.id === jugador.sede_id);
    return (site?.ramas || []).filter((branch) => branch.activa);
  }, [structure, jugador.sede_id]);
  const activeBranch = structure.flatMap((site) => site.ramas).find((branch) => branch.id === jugador.rama_id) || null;
  const activeCategory = categories.find((category) => category.id === jugador.categoria_id) || null;
  const total = Number(finanzas.monto_matricula || 0) + (jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0);
  const saldo = Math.max(0, total - Number(finanzas.abono_matricula || 0));

  const reset = () => {
    setStep(0);
    setTutor(emptyTutor);
    setJugador(emptyPlayer);
    setFinanzas(emptyFinance);
    setEvaluacion({});
    setSportProfile(null);
    setCategories([]);
    setCategoriesLoading(false);
    setError('');
    setRutConflict('');
    setEditingId(null);
  };

  const validate = () => {
    setError('');
    if (step === 0 && (!tutor.nombre_completo.trim() || !validarRut(tutor.rut) || !tutor.telefono.trim() || !tutor.email.trim())) {
      setError('Completa nombre, RUT válido, teléfono y correo del apoderado.');
      return false;
    }
    if (step === 1 && (!jugador.nombre.trim() || !jugador.fecha_nacimiento || !jugador.sexo)) {
      setError('Completa nombre, fecha de nacimiento y sexo del alumno.');
      return false;
    }
    if (step === 1 && structure.length && (!jugador.sede_id || !jugador.rama_id)) {
      setError('Selecciona la sede y rama deportiva del alumno.');
      return false;
    }
    if (step === 1 && categoriesLoading) {
      setError('Espera un momento mientras cargamos las categorías de la rama.');
      return false;
    }
    if (step === 1 && categories.length > 0 && !jugador.categoria_id) {
      setError('Selecciona la categoría deportiva del alumno.');
      return false;
    }
    if (step === 1 && jugador.rut && !validarRut(jugador.rut)) {
      setError('El RUT del alumno no es válido.');
      return false;
    }
    if (step === 1 && rutConflict) {
      setError(rutConflict);
      return false;
    }
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
      const response = await api.get('/api/prematriculas/validar-rut', { params: { rut: jugador.rut, exclude_id: editingId || undefined } });
      if (response.data?.available === false) {
        const message = response.data?.error || 'Ese RUT ya está registrado en la academia.';
        setRutConflict(message);
        setError(message);
        return false;
      }
      setError('');
      return true;
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error || 'No fue posible validar el RUT. Intenta nuevamente antes de continuar.';
      setRutConflict(message);
      setError(message);
      return false;
    } finally { setRutChecking(false); }
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
    setJugador({ ...emptyPlayer, ...player, categoria_id: player.categoria_id || '', numero_camiseta: player.numero_camiseta == null ? '' : String(player.numero_camiseta), monto_camiseta_apoderado: player.monto_camiseta_apoderado == null ? '' : String(player.monto_camiseta_apoderado) });
    setFinanzas({ monto_matricula: finance.monto_matricula == null ? '' : String(finance.monto_matricula), abono_matricula: finance.abono_matricula == null ? '' : String(finance.abono_matricula), monto_mensualidad: finance.monto_mensualidad == null ? '' : String(finance.monto_mensualidad) });
    setEvaluacion(item.evaluacion_payload || {});
    setRutConflict('');
    setError('');
    setResult(null);
    setStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelPrematricula = async (item: Recent) => {
    const accepted = await confirmAction(`¿Cancelar la pre-matrícula de ${item.jugador_payload?.nombre || 'este alumno'}? El enlace enviado dejará de funcionar, pero el registro se conservará para auditoría.`, 'danger');
    if (!accepted) return;
    try {
      await api.patch(`/api/prematriculas/${item.id}/cancelar`);
      if (editingId === item.id) reset();
      await loadRecent();
      await notify('Pre-matrícula cancelada. El enlace anterior ya no puede utilizarse.');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'No fue posible cancelar la pre-matrícula.');
    }
  };

  const submit = async () => {
    if (!validate() || loading) return;
    if (jugador.rut && !(await checkPlayerRut())) return;
    setLoading(true);
    setError('');
    setResult(null);
    const payload = {
      tutor,
      jugador: {
        ...jugador,
        rut: jugador.rut || null,
        categoria_id: jugador.categoria_id || null,
        numero_camiseta: jugador.numero_camiseta ? Number(jugador.numero_camiseta) : null,
        monto_camiseta_apoderado: jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0,
      },
      finanzas: {
        monto_matricula: Number(finanzas.monto_matricula || 0),
        abono_matricula: Number(finanzas.abono_matricula || 0),
        monto_mensualidad: Number(finanzas.monto_mensualidad || 0),
      },
      evaluacion: evaluationEnabled ? evaluacion : {},
      emergencia: {},
    };
    try {
      const wasEditing = Boolean(editingId);
      const response = editingId ? await api.put(`/api/prematriculas/${editingId}`, payload) : await api.post('/api/prematriculas', payload);
      setLastAction(wasEditing ? 'updated' : 'created');
      setResult(response.data);
      reset();
      await loadRecent();
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error || 'No fue posible enviar la pre-matrícula.';
      const code = String(requestError?.response?.data?.code || '');
      if (['PLAYER_RUT_EXISTS', 'PRE_ENROLLMENT_RUT_EXISTS'].includes(code)) setRutConflict(message);
      if (code.startsWith('JERSEY_')) setStep(2);
      setError(message);
    } finally { setLoading(false); }
  };

  const statusTone = (status: string) => status === 'firmada'
    ? 'border-[#cde995] bg-[#f3fadf] text-[#4f6900]'
    : status === 'abierta'
      ? 'border-sky-200 bg-sky-50 text-sky-700'
      : status === 'enviada'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status === 'cancelada'
          ? 'border-[#dfe5dc] bg-[#f4f6f2] text-[#697468]'
          : 'border-red-200 bg-red-50 text-red-700';

  return <DirectorPage className="max-w-[1450px]">
    <DirectorHero
      eyebrow="Admisión y matrícula"
      title="Prepara la matrícula, la familia la firma"
      description="La academia registra los datos y valores; el apoderado recibe un enlace privado, revisa las condiciones y firma. Solo entonces se formaliza la matrícula y se generan sus cobros."
      aside={<div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Proceso</p><p className="mt-2 text-2xl font-black text-white">4 pasos</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Datos → deporte → valores.</p></div><div className="rounded-[18px] border border-[#b7ff00]/25 bg-[#b7ff00]/10 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Pendientes</p><p className="mt-2 text-2xl font-black text-white">{recent.filter((item) => !['firmada', 'cancelada'].includes(item.estado)).length}</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Pre-matrículas activas.</p></div></div>}
    />

    {result ? <DirectorPanel className="border-[#cde995] bg-[#f3fadf] p-5"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#617b00]">{lastAction === 'updated' ? 'Pre-matrícula corregida y reenviada' : 'Pre-matrícula enviada'}</p><p className="mt-2 font-black text-[#111711]">{result.email_sent ? (lastAction === 'updated' ? 'Se invalidó el enlace anterior y se envió la versión corregida.' : 'El enlace fue enviado al correo del apoderado.') : 'El registro quedó guardado, pero no pudimos confirmar el envío del correo.'}</p><div className="mt-4 flex flex-col gap-2 md:flex-row"><input readOnly value={result.link} className={`${DIRECTOR_FIELD} min-w-0 flex-1 bg-white text-xs`} /><button type="button" onClick={() => void navigator.clipboard.writeText(result.link)} className={DIRECTOR_BUTTON_DARK}>Copiar enlace</button></div></DirectorPanel> : null}

    {editingId ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-sky-200 bg-sky-50 p-4"><div><p className="text-xs font-black uppercase text-sky-700">Modo edición</p><p className="mt-1 text-sm font-bold text-[#111711]">Estás corrigiendo una pre-matrícula ya creada. Al guardar, el enlace anterior quedará invalidado.</p></div><button type="button" onClick={reset} className={DIRECTOR_BUTTON_GHOST}>Cancelar edición</button></div> : null}

    <DirectorPanel className="overflow-hidden">
      <div className="border-b border-[#e2e7df] p-4 sm:p-5"><div className="grid gap-2 sm:grid-cols-4">{steps.map((label, index) => <button key={label} type="button" onClick={() => index <= step && setStep(index)} className={`rounded-[14px] border px-3 py-3 text-left transition ${index === step ? 'border-[#263026] bg-[#111711] text-white' : index < step ? 'border-[#cde995] bg-[#f3fadf] text-[#4f6900]' : 'border-[#e0e5de] bg-[#f8faf6] text-[#899389]'}`}><span className="text-[9px] font-black uppercase tracking-[.12em]">Paso {index + 1}</span><p className="mt-1 text-sm font-black">{label}</p></button>)}</div></div>

      <div className="p-5 sm:p-7">
        {error ? <div className="mb-5 rounded-[14px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div> : null}

        {step === 0 ? <div><SectionTitle eyebrow="Responsable" title="Datos del apoderado" description="Esta persona recibirá el enlace privado de revisión y firma." /><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Nombre completo *"><input value={tutor.nombre_completo} onChange={(event) => setTutor({ ...tutor, nombre_completo: event.target.value })} className={DIRECTOR_FIELD} /></Field><Field label="RUT *"><input value={tutor.rut} onChange={(event) => setTutor({ ...tutor, rut: formatRut(event.target.value) })} className={DIRECTOR_FIELD} placeholder="12.345.678-5" /></Field><Field label="Teléfono *"><input value={tutor.telefono} onChange={(event) => setTutor({ ...tutor, telefono: event.target.value })} className={DIRECTOR_FIELD} placeholder="+56 9..." /></Field><Field label="Correo *"><input type="email" value={tutor.email} onChange={(event) => setTutor({ ...tutor, email: event.target.value })} className={DIRECTOR_FIELD} /></Field></div></div> : null}

        {step === 1 ? <div><SectionTitle eyebrow="Alumno" title="Identificación y disciplina" description="Selecciona sede, rama y categoría para que el dorsal, los cobros y la operación deportiva queden en el alcance correcto." /><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Nombre completo *"><input value={jugador.nombre} onChange={(event) => setJugador({ ...jugador, nombre: event.target.value })} className={DIRECTOR_FIELD} /></Field><Field label="RUT / documento"><input value={jugador.rut} onBlur={() => void checkPlayerRut()} onChange={(event) => { setRutConflict(''); setJugador({ ...jugador, rut: formatRut(event.target.value) }); }} className={DIRECTOR_FIELD} placeholder="Opcional" /></Field><Field label="Fecha de nacimiento *"><input type="date" value={jugador.fecha_nacimiento} onChange={(event) => setJugador({ ...jugador, fecha_nacimiento: event.target.value })} className={DIRECTOR_FIELD} /></Field><Field label="Sexo *"><select value={jugador.sexo} onChange={(event) => setJugador({ ...jugador, sexo: event.target.value })} className={DIRECTOR_FIELD}><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro</option><option>Prefiere no indicar</option></select></Field><Field label="Sede *"><select value={jugador.sede_id} onChange={(event) => { const site = structure.find((item) => item.id === event.target.value); const branch = site?.ramas.find((item) => item.principal && item.activa) || site?.ramas.find((item) => item.activa); setJugador({ ...jugador, sede_id: event.target.value, rama_id: branch?.id || '', categoria_id: '', numero_camiseta: '', posicion_cancha: '' }); }} className={DIRECTOR_FIELD}><option value="">Seleccionar sede</option>{activeSites.map((site) => <option key={site.id} value={site.id}>{site.nombre}</option>)}</select></Field><Field label="Rama deportiva *"><select value={jugador.rama_id} onChange={(event) => setJugador({ ...jugador, rama_id: event.target.value, categoria_id: '', numero_camiseta: '', posicion_cancha: '' })} className={DIRECTOR_FIELD}><option value="">Seleccionar rama</option>{availableBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></Field><Field label={categories.length ? 'Categoría *' : 'Categoría'}><select value={jugador.categoria_id} onChange={(event) => setJugador({ ...jugador, categoria_id: event.target.value, numero_camiseta: '' })} disabled={!jugador.rama_id || categoriesLoading || !categories.length} className={DIRECTOR_FIELD}><option value="">{categoriesLoading ? 'Cargando categorías…' : categories.length ? 'Seleccionar categoría' : 'Sin categorías configuradas'}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></Field></div>{rutChecking ? <p className="mt-3 text-xs font-bold text-[#617b00]">Validando RUT…</p> : null}{rutConflict ? <p className="mt-3 text-xs font-bold text-red-700">{rutConflict}</p> : null}{jugador.rama_id && !categoriesLoading && !categories.length ? <p className="mt-3 text-xs font-semibold text-[#697468]">Esta rama no tiene categorías configuradas; la matrícula puede continuar a nivel de rama.</p> : null}</div> : null}

        {step === 2 ? <div><SectionTitle eyebrow="Perfil deportivo" title={activeBranch ? `${activeBranch.disciplina} · ${activeBranch.nombre}${activeCategory ? ` · ${activeCategory.nombre}` : ''}` : 'Perfil deportivo'} description="Completa el perfil y elige el dorsal visualmente. Los números reservados u ocupados no se pueden seleccionar." /><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label={sportProfile?.roleLabel || 'Posición / especialidad'}>{sportProfile?.roles?.length ? <select value={jugador.posicion_cancha} onChange={(event) => setJugador({ ...jugador, posicion_cancha: event.target.value })} className={DIRECTOR_FIELD}><option value="">Seleccionar</option>{sportProfile.roles.map((role) => <option key={role}>{role}</option>)}</select> : <input value={jugador.posicion_cancha} onChange={(event) => setJugador({ ...jugador, posicion_cancha: event.target.value })} className={DIRECTOR_FIELD} />}</Field><Field label="Certificado médico"><select value={jugador.certificado_medico} onChange={(event) => setJugador({ ...jugador, certificado_medico: event.target.value })} className={DIRECTOR_FIELD}><option>Pendiente</option><option>Vigente</option><option>No aplica</option></select></Field><Field label="Talla uniforme"><input value={jugador.talla_uniforme} onChange={(event) => setJugador({ ...jugador, talla_uniforme: event.target.value })} className={DIRECTOR_FIELD} placeholder="Ej. 12 / S / M" /></Field><Field label="Nombre camiseta"><input value={jugador.nombre_camiseta} onChange={(event) => setJugador({ ...jugador, nombre_camiseta: event.target.value.toUpperCase() })} className={DIRECTOR_FIELD} /></Field><Field label="Polera apoderado"><select value={jugador.talla_apoderado} onChange={(event) => setJugador({ ...jugador, talla_apoderado: event.target.value })} className={DIRECTOR_FIELD}><option>No desea</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select></Field>{jugador.talla_apoderado !== 'No desea' ? <Field label="Valor polera apoderado"><input type="number" min="0" value={jugador.monto_camiseta_apoderado} onChange={(event) => setJugador({ ...jugador, monto_camiseta_apoderado: event.target.value })} className={DIRECTOR_FIELD} /></Field> : null}</div>
          <div className="mt-6">
            <JerseyNumberPicker
              branchId={jugador.rama_id}
              categoryId={jugador.categoria_id || null}
              value={jugador.numero_camiseta || null}
              excludePrematriculaId={editingId}
              selectable={Boolean(jugador.rama_id && (!categories.length || jugador.categoria_id))}
              title={jugador.numero_camiseta ? `Dorsal seleccionado #${jugador.numero_camiseta}` : `Elige el dorsal de ${jugador.nombre || 'este alumno'}`}
              description="Toca una camiseta disponible. Una pre-matrícula activa reserva ese número hasta que se firme, cancele o venza."
              onSelect={(number) => setJugador((current) => ({ ...current, numero_camiseta: String(number) }))}
            />
            {jugador.numero_camiseta ? <div className="mt-3 flex justify-end"><button type="button" onClick={() => setJugador((current) => ({ ...current, numero_camiseta: '' }))} className={DIRECTOR_BUTTON_GHOST}>Continuar sin dorsal</button></div> : null}
          </div>
          {evaluationEnabled && sportProfile?.metrics?.length ? <div className="mt-6 rounded-[18px] border border-[#dfe5dc] bg-[#f8faf6] p-4"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Evaluación inicial opcional</p><p className="mt-1 text-sm text-[#697468]">Puedes dejar una línea base para comparar evolución futura.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{sportProfile.metrics.map((metric) => <Field key={metric} label={metric}><input type="number" min="0" max="100" value={evaluacion[metric] ?? 50} onChange={(event) => setEvaluacion({ ...evaluacion, [metric]: Number(event.target.value) || 0 })} className={DIRECTOR_FIELD} /></Field>)}</div></div> : null}</div> : null}

        {step === 3 ? <div><SectionTitle eyebrow="Valores y envío" title="Define los cobros iniciales" description="Estos montos se formalizan cuando el apoderado completa y firma la matrícula." /><div className="mt-5 grid gap-4 md:grid-cols-3"><Field label="Matrícula"><input type="number" min="0" value={finanzas.monto_matricula} onChange={(event) => setFinanzas({ ...finanzas, monto_matricula: event.target.value })} className={DIRECTOR_FIELD} /></Field><Field label="Abono matrícula"><input type="number" min="0" value={finanzas.abono_matricula} onChange={(event) => setFinanzas({ ...finanzas, abono_matricula: event.target.value })} className={DIRECTOR_FIELD} /></Field><Field label="Mensualidad"><input type="number" min="0" value={finanzas.monto_mensualidad} onChange={(event) => setFinanzas({ ...finanzas, monto_mensualidad: event.target.value })} className={DIRECTOR_FIELD} /></Field></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><DirectorStat label="Total inicial" value={money(total)} detail="Matrícula + adicionales" /><DirectorStat label="Abono" value={money(finanzas.abono_matricula)} detail="Informado al preparar" tone="lime" /><DirectorStat label="Saldo inicial" value={money(saldo)} detail="Pendiente al firmar" tone="dark" /></div><div className="mt-5 rounded-[18px] border border-[#cde995] bg-[#f3fadf] p-4 text-sm leading-6 text-[#566056]"><strong className="text-[#111711]">Antes de enviar:</strong> revisa correo, RUT, sede, rama, categoría, dorsal y valores. El servidor volverá a validar el dorsal al crear la pre-matrícula.</div></div> : null}

        <div className="mt-7 flex flex-col-reverse gap-3 border-t border-[#e5e9e2] pt-5 sm:flex-row sm:justify-between"><button type="button" disabled={step === 0 || loading} onClick={() => setStep((current) => Math.max(0, current - 1))} className={DIRECTOR_BUTTON_GHOST}>← Anterior</button>{step < steps.length - 1 ? <button type="button" disabled={rutChecking || categoriesLoading} onClick={() => void next()} className={DIRECTOR_BUTTON}>Continuar →</button> : <button type="button" disabled={loading || rutChecking || categoriesLoading} onClick={() => void submit()} className={DIRECTOR_BUTTON_DARK}>{loading ? 'Preparando…' : editingId ? 'Guardar y reenviar' : 'Crear y enviar pre-matrícula'}</button>}</div>
      </div>
    </DirectorPanel>

    <section>
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Seguimiento</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Pre-matrículas recientes</h2></div><p className="text-sm text-[#697468]">Corrige o cancela antes de la firma cuando sea necesario.</p></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">{recent.map((item) => <DirectorPanel key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-[#111711]">{item.jugador_payload?.nombre || 'Alumno'}</h3><p className="mt-1 text-xs font-semibold text-[#697468]">{item.tutor_payload?.nombre_completo || 'Apoderado'} · {item.tutor_payload?.email || 'Sin correo'}</p>{item.jugador_payload?.numero_camiseta ? <p className="mt-1 text-xs font-black text-[#5e751d]">Dorsal reservado #{item.jugador_payload.numero_camiseta}</p> : null}</div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(item.estado)}`}>{item.estado}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-[13px] border border-[#e1e6df] bg-[#f8faf6] p-3"><p className="font-black uppercase text-[#7c867b]">Matrícula</p><p className="mt-1 font-black text-[#111711]">{money(item.finanzas_payload?.monto_matricula || 0)}</p></div><div className="rounded-[13px] border border-[#e1e6df] bg-[#f8faf6] p-3"><p className="font-black uppercase text-[#7c867b]">Mensualidad</p><p className="mt-1 font-black text-[#111711]">{money(item.finanzas_payload?.monto_mensualidad || 0)}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{!['firmada', 'cancelada'].includes(item.estado) ? <button type="button" onClick={() => startEdit(item)} className={DIRECTOR_BUTTON_GHOST}>Editar</button> : null}{!['firmada', 'cancelada'].includes(item.estado) ? <button type="button" onClick={() => void cancelPrematricula(item)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700">Cancelar</button> : null}{item.signed_at ? <span className="inline-flex min-h-11 items-center rounded-xl border border-[#cde995] bg-[#f3fadf] px-4 text-sm font-black text-[#4f6900]">Firmada</span> : null}</div></DirectorPanel>)}{!recent.length ? <DirectorPanel className="col-span-full p-10 text-center text-sm text-[#697468]">Aún no hay pre-matrículas registradas.</DirectorPanel> : null}</div>
    </section>
  </DirectorPage>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">{eyebrow}</p><h2 className="mt-1 text-2xl font-black tracking-[-.025em] text-[#111711]">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#697468]">{description}</p></div>;
}

export default MatriculaPreparacion;
