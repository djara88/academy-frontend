import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosConfig';

interface ConsentItem { tipo: string; titulo: string; finalidad: string; contenido: string; obligatorio: boolean }
interface PreData {
  estado: string;
  expires_at: string;
  academia: { nombre?: string; logo?: string; logo_url?: string; color_primario?: string; color_secundario?: string; direccion?: string; telefono?: string; director_email?: string };
  tutor: Record<string, any>;
  jugador: Record<string, any>;
  finanzas: Record<string, any>;
  terms: string;
  privacy: { version: string; items: ConsentItem[] };
  signed_at?: string | null;
}

const money = (value: any) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const date = (value: any) => value ? new Date(value).toLocaleDateString('es-CL') : '-';
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_PHOTO_BYTES = 12 * 1024 * 1024;
const MAX_PHOTO_DATA_URL_CHARS = 1_600_000;

const compressStudentPhoto = (file: File): Promise<string> => new Promise((resolve, reject) => {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    reject(new Error('Usa una foto JPG, PNG o WEBP.'));
    return;
  }
  if (file.size > MAX_SOURCE_PHOTO_BYTES) {
    reject(new Error('La foto original supera 12 MB. Elige una imagen más liviana.'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => reject(new Error('No fue posible leer la foto.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('La imagen seleccionada no es válida.'));
    image.onload = () => {
      const maxSide = 900;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = window.document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No fue posible procesar la foto.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(image, 0, 0, width, height);

      let quality = 0.84;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS && quality > 0.52) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      if (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS) {
        reject(new Error('La foto sigue siendo demasiado pesada. Intenta con otra imagen.'));
        return;
      }
      resolve(dataUrl);
    };
    image.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

const PreMatriculaPublica: React.FC = () => {
  const { token = '' } = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const drawingRef = useRef(false);
  const [data, setData] = useState<PreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [success, setSuccess] = useState<{ folio: string; url?: string } | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [studentPhoto, setStudentPhoto] = useState('');
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    api.get(`/api/prematriculas/public/${token}`)
      .then((response) => {
        const next = response.data?.data as PreData;
        setData(next);
        setName(String(next?.tutor?.nombre_completo || next?.tutor?.nombre || ''));
        setDocument(String(next?.tutor?.rut || next?.tutor?.rut_pasaporte || ''));
        const initial: Record<string, boolean> = {};
        (next?.privacy?.items || []).forEach((item) => { initial[item.tipo] = false; });
        setDecisions(initial);
      })
      .catch((err) => setError(err?.response?.data?.error || 'No fue posible abrir esta pre-matrícula.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      const snapshot = canvas.toDataURL();
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(180 * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#0f172a';
      if (hasSignature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 180);
        img.src = snapshot;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [hasSignature]);

  const coords = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const startDraw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const ctx = event.currentTarget.getContext('2d');
    const p = coords(event);
    ctx?.beginPath(); ctx?.moveTo(p.x, p.y);
  };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = event.currentTarget.getContext('2d');
    const p = coords(event);
    ctx?.lineTo(p.x, p.y); ctx?.stroke();
    setHasSignature(true);
  };
  const stopDraw = () => { drawingRef.current = false; };
  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const updateDecision = (tipo: string, value: boolean) => {
    setDecisions((current) => ({ ...current, [tipo]: value }));
    if (tipo === 'imagen_interna' && value === false) {
      setStudentPhoto('');
      setPhotoError('');
    }
  };

  const handleStudentPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPhotoError('');
    setProcessingPhoto(true);
    try {
      setStudentPhoto(await compressStudentPhoto(file));
    } catch (photoProcessingError: any) {
      setStudentPhoto('');
      setPhotoError(photoProcessingError?.message || 'No fue posible procesar la foto.');
    } finally {
      setProcessingPhoto(false);
    }
  };

  const total = useMemo(() => Number(data?.finanzas?.monto_matricula || 0) + Number(data?.jugador?.monto_camiseta_apoderado || 0), [data]);
  const requiredAccepted = useMemo(() => (data?.privacy?.items || []).filter((item) => item.obligatorio).every((item) => decisions[item.tipo] === true), [data, decisions]);
  const internalPhotoAuthorized = decisions.imagen_interna === true;

  const submit = async () => {
    setError('');
    if (!acceptTerms || !requiredAccepted) return setError('Debes aceptar las condiciones de matrícula y confirmar los avisos obligatorios.');
    if (internalPhotoAuthorized && !studentPhoto) return setError('Como autorizaste la imagen para uso interno, agrega la foto del alumno antes de firmar.');
    if (!name.trim() || !document.trim()) return setError('Confirma tu nombre y documento de identidad.');
    if (!hasSignature || !canvasRef.current) return setError('Debes firmar en el recuadro antes de confirmar.');
    setSubmitting(true);
    try {
      const firma = canvasRef.current.toDataURL('image/png');
      const response = await api.post(`/api/prematriculas/public/${token}/firmar`, {
        acepta_terminos: true,
        decisiones: decisions,
        firmante_nombre: name.trim(),
        firmante_documento: document.trim(),
        firma_data_url: firma,
        foto_alumno_data_url: internalPhotoAuthorized ? studentPhoto : '',
      });
      setSuccess({ folio: response.data?.folio || 'Matrícula formalizada', url: response.data?.url });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No fue posible firmar la pre-matrícula.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center"><div className="text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-amber-400"/><p className="font-bold">Cargando pre-matrícula...</p></div></div>;
  if (error && !data) return <div className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><div className="max-w-lg rounded-3xl border border-red-900/60 bg-red-950/20 p-8 text-center"><h1 className="text-2xl font-black">No pudimos abrir el documento</h1><p className="mt-3 text-red-200">{error}</p></div></div>;
  if (!data) return null;

  const logo = data.academia?.logo_url || data.academia?.logo;
  const academy = data.academia?.nombre || 'Academia Deportiva';

  if (success || data.estado === 'firmada') return (
    <div className="min-h-screen bg-[#07111f] px-4 py-12 text-white">
      <div className="mx-auto max-w-xl rounded-[32px] border border-emerald-500/30 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-3xl text-emerald-950">✓</div>
        <h1 className="mt-5 text-3xl font-black">Matrícula formalizada</h1>
        <p className="mt-3 text-slate-300">Tu aceptación, la fotografía autorizada y la firma quedaron registradas. La academia conservará la evidencia asociada a esta matrícula.</p>
        {success?.folio && <p className="mt-5 font-bold text-amber-300">{success.folio}</p>}
        {success?.url && <button onClick={() => window.open(success.url, '_blank', 'noopener,noreferrer')} className="mt-6 rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950">Abrir documento final</button>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <header className="border-b border-white/10 bg-[#0b1728]/95 px-4 py-5 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          {logo ? <img src={logo} alt={`Logo ${academy}`} className="h-14 w-14 rounded-2xl border border-white/15 bg-white object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 font-black text-slate-950">S</div>}
          <div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-300">Pre-matrícula digital</p><h1 className="text-xl font-black text-white">{academy}</h1></div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <section className="rounded-[28px] border border-white/10 bg-white/[.04] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div><p className="text-sm font-bold text-amber-300">Revisa antes de firmar</p><h2 className="mt-1 text-3xl font-black text-white">{data.jugador?.nombre}</h2><p className="mt-2 text-sm text-slate-400">Enlace válido hasta {date(data.expires_at)}.</p></div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4"><p className="text-xs uppercase tracking-[.14em] text-slate-500">Apoderado</p><p className="mt-1 font-bold">{data.tutor?.nombre_completo || data.tutor?.nombre}</p></div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Alumno</p><div className="mt-4 space-y-3 text-sm"><p><span className="text-slate-500">RUT / documento:</span> <b>{data.jugador?.rut || '-'}</b></p><p><span className="text-slate-500">Nacimiento:</span> <b>{date(data.jugador?.fecha_nacimiento)}</b></p><p><span className="text-slate-500">Posición:</span> <b>{data.jugador?.posicion_cancha || '-'}</b></p><p><span className="text-slate-500">Uniforme:</span> <b>{data.jugador?.talla_uniforme || 'Por definir'}</b></p></div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Resumen financiero</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Matrícula</p><p className="mt-1 text-lg font-black">{money(data.finanzas?.monto_matricula)}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Abono</p><p className="mt-1 text-lg font-black">{money(data.finanzas?.abono_matricula)}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Total matrícula</p><p className="mt-1 text-lg font-black text-amber-300">{money(total)}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-xs text-slate-500">Mensualidad</p><p className="mt-1 text-lg font-black">{money(data.finanzas?.monto_mensualidad)}</p></div></div></div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">1 · Condiciones de matrícula</p>
          <h3 className="mt-2 text-2xl font-black">Lee las condiciones completas</h3>
          <div className="mt-5 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300 whitespace-pre-wrap">{data.terms}</div>
          <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4"><input type="checkbox" className="mt-1 h-5 w-5 accent-amber-400" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} /><span><b className="text-white">He leído y acepto las condiciones de matrícula.</b><span className="mt-1 block text-xs text-slate-400">Esta aceptación queda vinculada a la versión que estás viendo ahora.</span></span></label>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">2 · Privacidad y autorizaciones</p>
          <h3 className="mt-2 text-2xl font-black">Decide cada autorización por separado</h3>
          <p className="mt-2 text-sm text-slate-400">Las autorizaciones opcionales no condicionan la matrícula.</p>
          <div className="mt-6 space-y-4">{(data.privacy?.items || []).map((item) => (
            <div key={item.tipo} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="max-w-2xl"><div className="flex items-center gap-2"><h4 className="font-black text-white">{item.titulo}</h4>{item.obligatorio ? <span className="rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-black text-amber-300">OBLIGATORIO</span> : <span className="rounded-full bg-sky-400/10 px-2 py-1 text-[10px] font-black text-sky-300">OPCIONAL</span>}</div><p className="mt-2 text-xs font-semibold text-slate-400">Finalidad: {item.finalidad}</p><p className="mt-3 text-sm leading-6 text-slate-300">{item.contenido}</p></div>
                <div className="flex shrink-0 gap-2"><button type="button" onClick={() => updateDecision(item.tipo, true)} className={`rounded-xl px-4 py-2 text-sm font-black ${decisions[item.tipo] === true ? 'bg-emerald-400 text-emerald-950' : 'border border-white/10 bg-white/5 text-slate-300'}`}>Acepto</button>{!item.obligatorio && <button type="button" onClick={() => updateDecision(item.tipo, false)} className={`rounded-xl px-4 py-2 text-sm font-black ${decisions[item.tipo] === false ? 'bg-slate-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300'}`}>No autorizo</button>}</div></div>
            </div>
          ))}</div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-amber-300">3 · Foto del alumno y firma</p>
          <h3 className="mt-2 text-2xl font-black">Completa la ficha y confirma tu identidad</h3>

          {internalPhotoAuthorized ? (
            <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-300/[.04] p-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                  {studentPhoto ? <img src={studentPhoto} alt="Foto del alumno" className="h-full w-full object-cover" /> : <div className="px-4 text-center text-xs font-bold text-slate-500">FOTO DEL ALUMNO</div>}
                </div>
                <div className="flex-1">
                  <p className="font-black text-white">Agrega la fotografía de ficha</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">La imagen se usará para identificación dentro de la academia e informes privados. Esta autorización no permite publicarla en redes sociales.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={processingPhoto} onClick={() => cameraInputRef.current?.click()} className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{processingPhoto ? 'Procesando...' : 'Tomar foto'}</button>
                    <button type="button" disabled={processingPhoto} onClick={() => galleryInputRef.current?.click()} className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Elegir de galería</button>
                    {studentPhoto && <button type="button" onClick={() => setStudentPhoto('')} className="rounded-xl px-4 py-3 text-sm font-bold text-slate-400">Cambiar foto</button>}
                  </div>
                  <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleStudentPhoto} className="hidden" />
                  <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleStudentPhoto} className="hidden" />
                  {photoError && <p className="mt-3 text-sm font-semibold text-red-300">{photoError}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-sky-400/15 bg-sky-400/5 p-4 text-sm leading-6 text-slate-400">No autorizaste la fotografía para uso interno, por lo que no solicitaremos ni guardaremos una foto del alumno. Esto no impide completar la matrícula.</div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2"><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre del firmante</label><input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-amber-400" /></div><div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">RUT / documento</label><input value={document} onChange={(e) => setDocument(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-amber-400" /></div></div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-300 bg-white"><canvas ref={canvasRef} onPointerDown={startDraw} onPointerMove={draw} onPointerUp={stopDraw} onPointerCancel={stopDraw} onPointerLeave={stopDraw} className="h-[180px] w-full touch-none cursor-crosshair" /></div>
          <div className="mt-2 flex items-center justify-between gap-4"><p className="text-xs text-slate-500">Firma dentro del recuadro con el dedo, mouse o lápiz.</p><button type="button" onClick={clearSignature} className="shrink-0 text-xs font-bold text-amber-300">Limpiar firma</button></div>
        </section>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-200">{error}</div>}
        <button type="button" disabled={submitting || processingPhoto} onClick={submit} className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-4 text-lg font-black text-slate-950 shadow-xl disabled:opacity-50">{submitting ? 'Formalizando matrícula...' : 'Firmar y confirmar matrícula'}</button>
        <p className="pb-8 text-center text-xs leading-5 text-slate-500">La fotografía autorizada, firma y decisiones quedan asociadas a esta pre-matrícula junto con fecha, versión de textos y evidencia técnica de integridad.</p>
      </main>
    </div>
  );
};

export default PreMatriculaPublica;
