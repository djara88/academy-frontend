import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

interface ConsentItem {
  tipo: 'aviso_privacidad' | 'datos_salud' | 'imagen_interna' | 'imagen_publica';
  titulo: string;
  finalidad: string;
  contenido: string;
  obligatorio: boolean;
}

interface ConsentCatalog {
  version: string;
  academy_name: string;
  items: ConsentItem[];
}

const emptyTutor = { nombre_completo: '', rut: '', telefono: '', email: '' };
const emptyJugador = {
  nombre: '', rut: '', tipo_alumno: 'Nuevo', certificado_medico: 'Pendiente', sexo: '', fecha_nacimiento: '',
  posicion_cancha: '', talla_uniforme: '', talla_apoderado: 'No desea', monto_camiseta_apoderado: '',
  numero_camiseta: '', nombre_camiseta: ''
};
const emptyFinanzas = { monto_matricula: '', abono_matricula: '', monto_mensualidad: '' };
const emptyEmergencia = { nota: '', telefono: '' };
const emptyConsents = { aviso_privacidad: false, datos_salud: false, imagen_interna: false, imagen_publica: false };

const steps = [
  { title: 'Apoderado', subtitle: 'Contacto y representación' },
  { title: 'Alumno', subtitle: 'Identidad e indumentaria' },
  { title: 'Perfil', subtitle: 'Foto, emergencia y evaluación' },
  { title: 'Finanzas', subtitle: 'Matrícula y mensualidad' },
  { title: 'Privacidad', subtitle: 'Autorizaciones y confirmación' },
];

const inputClass = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-[#e6edf3] outline-none transition focus:border-[#C8A96B] focus:ring-2 focus:ring-[#C8A96B]/10 placeholder:text-[#5b6572]';
const labelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-[0.08em] text-[#8b949e]';

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
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return dv === expected;
};

const money = (value: string | number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;

const MatriculaPremium: React.FC = () => {
  const { notify } = useAcademyMessages();
  const { user } = useAuth();
  const topRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tutor, setTutor] = useState(emptyTutor);
  const [jugador, setJugador] = useState(emptyJugador);
  const [finanzas, setFinanzas] = useState(emptyFinanzas);
  const [emergencia, setEmergencia] = useState(emptyEmergencia);
  const [fotoBase64, setFotoBase64] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [evaluacion, setEvaluacion] = useState<Record<string, number>>({});
  const [consents, setConsents] = useState(emptyConsents);
  const [catalog, setCatalog] = useState<ConsentCatalog | null>(null);
  const [lastResult, setLastResult] = useState<{ folio: string; url?: string; alumno: string } | null>(null);

  useEffect(() => {
    api.get('/api/consentimientos/textos')
      .then((response) => setCatalog(response.data?.data || null))
      .catch(() => setCatalog(null));
  }, []);

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
    if (!skills.length) {
      setEvaluacion({});
      return;
    }
    setEvaluacion((current) => {
      const next: Record<string, number> = {};
      skills.forEach((skill) => { next[skill] = current[skill] ?? 50; });
      return next;
    });
  }, [skills]);

  const resetForm = () => {
    setTutor(emptyTutor);
    setJugador(emptyJugador);
    setFinanzas(emptyFinanzas);
    setEmergencia(emptyEmergencia);
    setFotoBase64('');
    setEvaluacion({});
    setConsents(emptyConsents);
    setStep(0);
    setError('');
    setFileKey((value) => value + 1);
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const validateCurrentStep = () => {
    setError('');
    if (step === 0) {
      if (!tutor.nombre_completo.trim() || !validarRut(tutor.rut) || !tutor.telefono.trim() || !tutor.email.trim()) {
        setError('Completa nombre, RUT válido, teléfono y correo del apoderado antes de continuar.');
        return false;
      }
    }
    if (step === 1) {
      if (!jugador.nombre.trim() || !jugador.fecha_nacimiento || !jugador.posicion_cancha || !jugador.sexo) {
        setError('Completa nombre, fecha de nacimiento, sexo y posición del alumno.');
        return false;
      }
      if (jugador.rut && !validarRut(jugador.rut)) {
        setError('El RUT del alumno no es válido. Corrígelo o déjalo vacío si aún no está disponible.');
        return false;
      }
    }
    if (step === 4) {
      if (!consents.aviso_privacidad) {
        setError('El apoderado debe confirmar que recibió y comprendió el aviso de privacidad.');
        return false;
      }
      if (fotoBase64 && !consents.imagen_interna) {
        setError('Para guardar la foto del alumno debe autorizarse su uso interno. Puedes autorizarlo o quitar la foto.');
        return false;
      }
      if ((emergencia.nota.trim() || emergencia.telefono.trim()) && !consents.datos_salud) {
        setError('La información de emergencia requiere autorización expresa para datos sensibles.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentStep()) return;
    setStep((value) => Math.min(steps.length - 1, value + 1));
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const previousStep = () => {
    setError('');
    setStep((value) => Math.max(0, value - 1));
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('La foto debe ser JPG, PNG o WEBP.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('La foto no puede superar 4 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setFotoBase64(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!validateCurrentStep() || loading) return;
    setLoading(true);
    setError('');
    try {
      const alumnoNombre = jugador.nombre.trim();
      const payload = {
        academia_id: user?.academia_id,
        tutor,
        ...jugador,
        rut: jugador.rut || null,
        numero_camiseta: jugador.numero_camiseta ? Number(jugador.numero_camiseta) : null,
        monto_camiseta_apoderado: jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0,
        foto_base64: consents.imagen_interna ? fotoBase64 : '',
        evaluacion,
        monto_matricula: Number(finanzas.monto_matricula || 0),
        abono_matricula: Number(finanzas.abono_matricula || 0),
        monto_mensualidad: Number(finanzas.monto_mensualidad || 0),
      };

      const playerResponse = await api.post('/api/jugadores', payload);
      const jugadorId = playerResponse.data?.jugador_id || playerResponse.data?.data?.id;
      const tutorId = playerResponse.data?.tutor_id;
      if (!jugadorId || !tutorId) throw new Error('La matrícula se creó sin identificadores de alumno/apoderado.');

      await api.post('/api/consentimientos/alumno', {
        jugador_id: jugadorId,
        tutor_id: tutorId,
        decisiones: consents,
      });

      if ((emergencia.nota.trim() || emergencia.telefono.trim()) && consents.datos_salud) {
        await api.put(`/api/jugadores/${jugadorId}/datos-rapidos`, {
          alerta_medica: emergencia.nota.trim(),
          telefono_emergencia: emergencia.telefono.trim(),
        });
      }

      const documentResponse = await api.post('/api/matriculas/generar-documento', {
        jugador_id: jugadorId,
        tutor_id: tutorId,
      });
      const folio = documentResponse.data?.folio || 'Registrado';
      const url = documentResponse.data?.url;
      setLastResult({ folio, url, alumno: alumnoNombre });
      if (url) window.open(url, '_blank', 'noopener,noreferrer');

      await notify(`✅ Matrícula registrada correctamente.\n\nAlumno: ${alumnoNombre}\nFolio: ${folio}\nEl formulario quedó limpio para continuar con la siguiente matrícula.`);
      resetForm();
    } catch (err: any) {
      console.error('Error en matrícula premium:', err);
      setError(err?.response?.data?.error || err?.message || 'No fue posible completar la matrícula.');
    } finally {
      setLoading(false);
    }
  };

  const matriculaTotal = Number(finanzas.monto_matricula || 0) + (jugador.talla_apoderado !== 'No desea' ? Number(jugador.monto_camiseta_apoderado || 0) : 0);
  const saldoMatricula = Math.max(0, matriculaTotal - Number(finanzas.abono_matricula || 0));

  return (
    <div ref={topRef} className="mx-auto max-w-7xl space-y-6 pb-16">
      <section className="overflow-hidden rounded-3xl border border-[#30363d] bg-gradient-to-br from-[#161b22] via-[#111827] to-[#0d1117] shadow-2xl">
        <div className="h-1.5 bg-gradient-to-r from-[#C8A96B] via-[#289E9D] to-[#C8A96B]" />
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C8A96B]/30 bg-[#C8A96B]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#D8BE87]">
              Matrícula asistida · experiencia premium
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Nueva matrícula</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9ca3af]">Flujo diseñado para digitación rápida, documentos elegantes y autorizaciones de privacidad trazables.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117]/70 px-5 py-4">
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.16em] text-[#6b7280]">Paso actual</div>
              <div className="font-bold text-white">{step + 1} de {steps.length}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8A96B]/15 text-xl font-black text-[#D8BE87]">{step + 1}</div>
          </div>
        </div>
      </section>

      {lastResult && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400">Última matrícula completada</p>
            <p className="mt-1 font-semibold text-white">{lastResult.alumno} · {lastResult.folio}</p>
          </div>
          {lastResult.url && <button type="button" onClick={() => window.open(lastResult.url, '_blank', 'noopener,noreferrer')} className="rounded-xl border border-emerald-600/50 px-4 py-2 text-sm font-bold text-emerald-300 transition hover:bg-emerald-900/30">Abrir PDF</button>}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main className="space-y-5">
          <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-2 md:grid-cols-5">
            {steps.map((item, index) => (
              <button key={item.title} type="button" onClick={() => index <= step && setStep(index)} className={`rounded-xl px-3 py-3 text-left transition ${index === step ? 'bg-[#C8A96B]/12 ring-1 ring-[#C8A96B]/35' : index < step ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'cursor-default opacity-45'}`}>
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${index < step ? 'bg-emerald-500 text-[#06140d]' : index === step ? 'bg-[#C8A96B] text-[#111827]' : 'bg-[#30363d] text-[#8b949e]'}`}>{index < step ? '✓' : index + 1}</div>
                <div className="text-xs font-bold text-white">{item.title}</div>
                <div className="hidden text-[10px] text-[#6b7280] md:block">{item.subtitle}</div>
              </button>
            ))}
          </nav>

          {error && <div className="rounded-2xl border border-red-700/50 bg-red-950/25 px-5 py-4 text-sm font-medium text-red-300">{error}</div>}

          <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-5 shadow-xl md:p-7">
            {step === 0 && (
              <div className="space-y-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C8A96B]">01 · Apoderado</p><h2 className="mt-1 text-2xl font-black text-white">Quién representa al alumno</h2><p className="mt-1 text-sm text-[#8b949e]">Estos datos también se utilizan para entregar el documento oficial de matrícula.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className={labelClass}>Nombre completo *</label><input autoFocus className={inputClass} value={tutor.nombre_completo} onChange={(e) => setTutor({ ...tutor, nombre_completo: e.target.value })} placeholder="Ej. Camila González" /></div>
                  <div><label className={labelClass}>RUT *</label><input className={inputClass} value={tutor.rut} onChange={(e) => setTutor({ ...tutor, rut: formatRut(e.target.value) })} placeholder="12345678-9" /></div>
                  <div><label className={labelClass}>Teléfono *</label><input className={inputClass} value={tutor.telefono} onChange={(e) => setTutor({ ...tutor, telefono: e.target.value })} placeholder="+56 9 1234 5678" /></div>
                  <div><label className={labelClass}>Correo *</label><input type="email" className={inputClass} value={tutor.email} onChange={(e) => setTutor({ ...tutor, email: e.target.value })} placeholder="apoderado@correo.cl" /></div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C8A96B]">02 · Alumno</p><h2 className="mt-1 text-2xl font-black text-white">Ficha de incorporación</h2><p className="mt-1 text-sm text-[#8b949e]">Identidad deportiva e indumentaria. Sin valores precargados que puedan pasar inadvertidos.</p></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><label className={labelClass}>Nombre completo *</label><input autoFocus className={inputClass} value={jugador.nombre} onChange={(e) => setJugador({ ...jugador, nombre: e.target.value })} placeholder="Nombre del alumno" /></div>
                  <div><label className={labelClass}>RUT del alumno</label><input className={inputClass} value={jugador.rut} onChange={(e) => setJugador({ ...jugador, rut: formatRut(e.target.value) })} placeholder="Opcional si aún no está disponible" /></div>
                  <div><label className={labelClass}>Fecha de nacimiento *</label><input type="date" className={inputClass} value={jugador.fecha_nacimiento} onChange={(e) => setJugador({ ...jugador, fecha_nacimiento: e.target.value })} /></div>
                  <div><label className={labelClass}>Sexo *</label><select className={inputClass} value={jugador.sexo} onChange={(e) => setJugador({ ...jugador, sexo: e.target.value })}><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro / no informado</option></select></div>
                  <div><label className={labelClass}>Posición *</label><select className={inputClass} value={jugador.posicion_cancha} onChange={(e) => setJugador({ ...jugador, posicion_cancha: e.target.value })}><option value="">Seleccionar</option><option>Arquero</option><option>Defensa</option><option>Mediocampista</option><option>Delantero</option></select></div>
                  <div><label className={labelClass}>Tipo de alumno</label><select className={inputClass} value={jugador.tipo_alumno} onChange={(e) => setJugador({ ...jugador, tipo_alumno: e.target.value })}><option>Nuevo</option><option value="Antiguo">Renovación</option></select></div>
                  <div><label className={labelClass}>Certificado médico</label><select className={inputClass} value={jugador.certificado_medico} onChange={(e) => setJugador({ ...jugador, certificado_medico: e.target.value })}><option>Pendiente</option><option>Entregado</option></select></div>
                  <div><label className={labelClass}>Talla uniforme</label><select className={inputClass} value={jugador.talla_uniforme} onChange={(e) => setJugador({ ...jugador, talla_uniforme: e.target.value })}><option value="">Sin definir</option>{['Talla 4','Talla 6','Talla 8','Talla 10','Talla 12','Talla 14','Talla 16','S','M','L','XL'].map((size) => <option key={size}>{size}</option>)}</select></div>
                  <div><label className={labelClass}>N° camiseta</label><input type="number" min="1" max="99" className={inputClass} value={jugador.numero_camiseta} onChange={(e) => setJugador({ ...jugador, numero_camiseta: e.target.value })} placeholder="Sin asignar" /></div>
                  <div><label className={labelClass}>Nombre en camiseta</label><input className={`${inputClass} uppercase`} value={jugador.nombre_camiseta} onChange={(e) => setJugador({ ...jugador, nombre_camiseta: e.target.value.toUpperCase() })} placeholder="Ej. MATEO" /></div>
                  <div><label className={labelClass}>Camiseta apoderado</label><select className={inputClass} value={jugador.talla_apoderado} onChange={(e) => setJugador({ ...jugador, talla_apoderado: e.target.value, monto_camiseta_apoderado: e.target.value === 'No desea' ? '' : jugador.monto_camiseta_apoderado })}><option>No desea</option>{['S','M','L','XL','XXL'].map((size) => <option key={size}>{size}</option>)}</select></div>
                  {jugador.talla_apoderado !== 'No desea' && <div><label className={labelClass}>Valor camiseta apoderado</label><input type="number" min="0" className={inputClass} value={jugador.monto_camiseta_apoderado} onChange={(e) => setJugador({ ...jugador, monto_camiseta_apoderado: e.target.value })} placeholder="$0" /></div>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-7">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C8A96B]">03 · Perfil</p><h2 className="mt-1 text-2xl font-black text-white">Identificación y seguridad</h2><p className="mt-1 text-sm text-[#8b949e]">La matrícula evita pedir diagnósticos, grupo sanguíneo u otros antecedentes clínicos extensos. Solo se registra información mínima de emergencia cuando la familia decide entregarla.</p></div>
                <div className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <div className="rounded-2xl border border-dashed border-[#3b4450] bg-[#0d1117] p-4 text-center">
                    <div className="mx-auto mb-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-[#30363d] bg-[#111827]">
                      {fotoBase64 ? <img src={fotoBase64} alt="Vista previa alumno" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-[#5f6b78]">SIN FOTO</span>}
                    </div>
                    <label className="inline-block cursor-pointer rounded-xl bg-[#21262d] px-4 py-2 text-xs font-bold text-white hover:bg-[#30363d]">Seleccionar foto<input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} /></label>
                    {fotoBase64 && <button type="button" onClick={() => { setFotoBase64(''); setFileKey((v) => v + 1); }} className="mt-2 block w-full text-xs text-red-300">Quitar foto</button>}
                  </div>
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#30363d] bg-[#0d1117]/70 p-4"><p className="text-sm font-bold text-white">Contacto / nota de emergencia</p><p className="mt-1 text-xs leading-5 text-[#7d8793]">Opcional. Si ingresas información aquí, se pedirá autorización expresa en el paso de privacidad.</p></div>
                    <div><label className={labelClass}>Teléfono de emergencia</label><input className={inputClass} value={emergencia.telefono} onChange={(e) => setEmergencia({ ...emergencia, telefono: e.target.value })} placeholder="+56 9 ..." /></div>
                    <div><label className={labelClass}>Información mínima relevante</label><textarea className={`${inputClass} min-h-[96px] resize-y`} maxLength={300} value={emergencia.nota} onChange={(e) => setEmergencia({ ...emergencia, nota: e.target.value })} placeholder="Ej. Ante una emergencia contactar primero al apoderado. Evita incluir diagnósticos extensos." /></div>
                  </div>
                </div>
                {skills.length > 0 && <div className="rounded-2xl border border-[#30363d] bg-[#0d1117]/50 p-5"><div className="mb-4"><p className="font-bold text-white">Evaluación inicial opcional</p><p className="text-xs text-[#7d8793]">Punto de partida para futuros informes de evolución.</p></div><div className="grid gap-x-8 gap-y-4 md:grid-cols-2">{skills.map((skill) => <div key={skill}><div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-[#cbd5e1]">{skill}</span><span className="font-black text-[#D8BE87]">{evaluacion[skill] ?? 50}</span></div><input type="range" min="0" max="100" value={evaluacion[skill] ?? 50} onChange={(e) => setEvaluacion({ ...evaluacion, [skill]: Number(e.target.value) })} className="w-full accent-[#C8A96B]" /></div>)}</div></div>}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C8A96B]">04 · Finanzas</p><h2 className="mt-1 text-2xl font-black text-white">Valores de incorporación</h2><p className="mt-1 text-sm text-[#8b949e]">Todos los campos monetarios parten vacíos en cada matrícula para reducir errores de digitación.</p></div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div><label className={labelClass}>Valor matrícula</label><input type="number" min="0" className={inputClass} value={finanzas.monto_matricula} onChange={(e) => setFinanzas({ ...finanzas, monto_matricula: e.target.value })} placeholder="0" /></div>
                  <div><label className={labelClass}>Abono inicial</label><input type="number" min="0" className={inputClass} value={finanzas.abono_matricula} onChange={(e) => setFinanzas({ ...finanzas, abono_matricula: e.target.value })} placeholder="0" /></div>
                  <div><label className={labelClass}>Mensualidad</label><input type="number" min="0" className={inputClass} value={finanzas.monto_mensualidad} onChange={(e) => setFinanzas({ ...finanzas, monto_mensualidad: e.target.value })} placeholder="0" /></div>
                </div>
                <div className="grid gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117]/60 p-5 sm:grid-cols-3"><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#687382]">Total matrícula</div><div className="mt-1 text-xl font-black text-white">{money(matriculaTotal)}</div></div><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#687382]">Abono</div><div className="mt-1 text-xl font-black text-emerald-400">{money(finanzas.abono_matricula)}</div></div><div><div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#687382]">Saldo</div><div className={`mt-1 text-xl font-black ${saldoMatricula > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>{money(saldoMatricula)}</div></div></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C8A96B]">05 · Privacidad</p><h2 className="mt-1 text-2xl font-black text-white">Consentimientos separados y trazables</h2><p className="mt-1 text-sm text-[#8b949e]">La autorización de difusión pública de fotografías es opcional y no condiciona la matrícula.</p></div>
                {!catalog && <div className="rounded-2xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">No fue posible cargar el catálogo de privacidad. Recarga la página antes de confirmar la matrícula.</div>}
                <div className="space-y-3">{catalog?.items.map((item) => {
                  const checked = consents[item.tipo];
                  const isPublic = item.tipo === 'imagen_publica';
                  const effectiveRequired = item.obligatorio || (item.tipo === 'datos_salud' && Boolean(emergencia.nota.trim() || emergencia.telefono.trim())) || (item.tipo === 'imagen_interna' && Boolean(fotoBase64));
                  return <label key={item.tipo} className={`block cursor-pointer rounded-2xl border p-4 transition ${checked ? 'border-[#C8A96B]/55 bg-[#C8A96B]/8' : 'border-[#30363d] bg-[#0d1117]/50 hover:border-[#4b5563]'}`}><div className="flex gap-3"><input type="checkbox" checked={checked} onChange={(e) => setConsents({ ...consents, [item.tipo]: e.target.checked })} className="mt-1 h-5 w-5 accent-[#C8A96B]" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-white">{item.titulo}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] ${effectiveRequired ? 'bg-red-950/50 text-red-300' : 'bg-emerald-950/40 text-emerald-300'}`}>{effectiveRequired ? 'Requerido en este caso' : isPublic ? 'Opcional · difusión' : 'Opcional'}</span></div><p className="mt-1 text-xs font-semibold text-[#9ca3af]">Finalidad: {item.finalidad}</p><p className="mt-2 text-xs leading-5 text-[#778290]">{item.contenido}</p></div></div></label>;
                })}</div>
                {catalog && <div className="rounded-xl border border-[#30363d] bg-[#0d1117] px-4 py-3 text-xs text-[#6f7a87]">Versión de evidencia: <strong className="text-[#cbd5e1]">{catalog.version}</strong>. El backend conserva el texto exacto asociado a esta versión.</div>}
                <div className="rounded-2xl border border-[#C8A96B]/25 bg-[#C8A96B]/5 p-5"><p className="text-sm font-bold text-[#E4D0A5]">Antes de confirmar</p><p className="mt-1 text-xs leading-5 text-[#9ca3af]">Revisa el resumen lateral. Al finalizar se generará el PDF oficial, se enviará al correo del apoderado cuando el servicio de correo esté disponible y esta pantalla quedará limpia para la siguiente matrícula.</p></div>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#30363d] pt-5 sm:flex-row sm:justify-between">
              <button type="button" disabled={step === 0 || loading} onClick={previousStep} className="rounded-xl border border-[#3b4450] px-5 py-3 text-sm font-bold text-[#cbd5e1] disabled:opacity-30">← Anterior</button>
              {step < steps.length - 1 ? <button type="button" onClick={nextStep} className="rounded-xl bg-[#C8A96B] px-6 py-3 text-sm font-black text-[#111827] shadow-lg transition hover:bg-[#D8BE87]">Continuar →</button> : <button type="button" onClick={submit} disabled={loading || !catalog} className="rounded-xl bg-emerald-500 px-7 py-3 text-sm font-black text-[#062d1f] shadow-lg transition hover:bg-emerald-400 disabled:opacity-40">{loading ? 'Registrando y generando documentos...' : 'Confirmar matrícula y generar PDF'}</button>}
            </div>
          </section>
        </main>

        <aside className="h-fit space-y-4 lg:sticky lg:top-6">
          <div className="overflow-hidden rounded-3xl border border-[#30363d] bg-[#161b22] shadow-xl"><div className="border-b border-[#30363d] bg-[#111827] px-5 py-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#C8A96B]">Resumen en vivo</p></div><div className="space-y-4 p-5"><div><div className="text-[10px] uppercase tracking-[0.12em] text-[#65717f]">Alumno</div><div className="mt-1 font-bold text-white">{jugador.nombre || 'Pendiente'}</div><div className="text-xs text-[#7d8793]">{jugador.posicion_cancha || 'Sin posición'}</div></div><div className="border-t border-[#30363d] pt-4"><div className="text-[10px] uppercase tracking-[0.12em] text-[#65717f]">Apoderado</div><div className="mt-1 font-semibold text-[#d1d5db]">{tutor.nombre_completo || 'Pendiente'}</div><div className="text-xs text-[#7d8793]">{tutor.email || 'Sin correo'}</div></div><div className="border-t border-[#30363d] pt-4"><div className="flex justify-between text-xs"><span className="text-[#7d8793]">Matrícula + extras</span><strong className="text-white">{money(matriculaTotal)}</strong></div><div className="mt-2 flex justify-between text-xs"><span className="text-[#7d8793]">Saldo inicial</span><strong className={saldoMatricula > 0 ? 'text-amber-300' : 'text-emerald-400'}>{money(saldoMatricula)}</strong></div><div className="mt-2 flex justify-between text-xs"><span className="text-[#7d8793]">Mensualidad</span><strong className="text-white">{money(finanzas.monto_mensualidad)}</strong></div></div></div></div>
          <div className="rounded-3xl border border-[#30363d] bg-[#111827] p-5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8b949e]">Privacidad</p><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between"><span className="text-[#778290]">Aviso recibido</span><span className={consents.aviso_privacidad ? 'text-emerald-400' : 'text-amber-300'}>{consents.aviso_privacidad ? 'Sí' : 'Pendiente'}</span></div><div className="flex justify-between"><span className="text-[#778290]">Foto interna</span><span className={consents.imagen_interna ? 'text-emerald-400' : 'text-[#66717f]'}>{consents.imagen_interna ? 'Autorizada' : 'No autorizada'}</span></div><div className="flex justify-between"><span className="text-[#778290]">Difusión pública</span><span className={consents.imagen_publica ? 'text-emerald-400' : 'text-[#66717f]'}>{consents.imagen_publica ? 'Autorizada' : 'No autorizada'}</span></div></div></div>
        </aside>
      </div>
    </div>
  );
};

export default MatriculaPremium;
