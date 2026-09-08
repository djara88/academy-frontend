import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';

type TrainingLog = {
  objetivo: string;
  contenidos: string;
  observaciones: string;
  incidencias: string;
  intensidad: 'Baja' | 'Media' | 'Alta';
};

type Training = { id: string; fecha: string; hora?: string | null; lugar?: string | null; estado?: string | null };

type LogPayload = { entrenamiento: Training; bitacora?: Partial<TrainingLog> | null };

const EMPTY_LOG: TrainingLog = { objetivo: '', contenidos: '', observaciones: '', incidencias: '', intensidad: 'Media' };
const requestMessage = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { error?: string } }; message?: string };
  return requestError.response?.data?.error || requestError.message || fallback;
};
const normalizeLog = (value?: Partial<TrainingLog> | null): TrainingLog => ({ ...EMPTY_LOG, ...(value || {}) });
const sameLog = (left: TrainingLog, right: TrainingLog) => (
  left.objetivo === right.objetivo
  && left.contenidos === right.contenidos
  && left.observaciones === right.observaciones
  && left.incidencias === right.incidencias
  && left.intensidad === right.intensidad
);

const TrainingLogPanel = ({ trainingId, academyName, onBack, onSaved }: { trainingId: string; academyName?: string; onBack: () => void; onSaved?: () => void }) => {
  const { notify } = useAppDialog();
  const [training, setTraining] = useState<Training | null>(null);
  const [form, setForm] = useState<TrainingLog>(EMPTY_LOG);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(`/api/profesores/me/entrenamientos/${trainingId}/bitacora`);
      const payload = response.data.data as LogPayload;
      setTraining(payload.entrenamiento);
      setForm(normalizeLog(payload.bitacora));
      setVerified(true);
      return payload;
    } catch (error: unknown) {
      setTraining(null);
      setVerified(false);
      setLoadError(requestMessage(error, 'No fue posible verificar la bitácora.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!verified || !training) return;
    const submitted = { ...form };
    setSaving(true);
    try {
      await api.put(`/api/profesores/me/entrenamientos/${trainingId}/bitacora`, submitted);
      await notify('✅ Bitácora guardada correctamente.', { title: academyName });
      onSaved?.();
    } catch (error: unknown) {
      // Un timeout puede ocurrir después de que el servidor haya confirmado el PUT.
      // Verificamos antes de invitar al profesor a reenviar la misma operación.
      try {
        const response = await api.get(`/api/profesores/me/entrenamientos/${trainingId}/bitacora`);
        const serverLog = normalizeLog((response.data.data as LogPayload).bitacora);
        if (sameLog(serverLog, submitted)) {
          setForm(serverLog);
          setVerified(true);
          await notify('La bitácora aparece guardada en el servidor. No es necesario enviarla nuevamente.', { title: academyName });
          onSaved?.();
          return;
        }
      } catch {
        // Mantener el formulario local; no afirmar un resultado que no pudimos verificar.
      }
      await notify(requestMessage(error, 'No fue posible confirmar el guardado. El formulario permanece intacto para que puedas verificar antes de reintentar.'), { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-8 text-center text-[#8b949e]">Verificando bitácora...</div>;

  if (!verified || !training) return <section className="card border-orange-500/30 p-6 text-center"><p className="font-black text-orange-200">Bitácora no verificada</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#b1bac4]">{loadError || 'No pudimos cargar el registro actual.'} Por seguridad Lestra no abrirá un formulario vacío que pudiera sobrescribir una bitácora existente.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-[#30363d] px-4 text-sm font-black text-[#b1bac4]">← Volver</button><button type="button" onClick={() => void load()} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white">Reintentar</button></div></section>;

  return (
    <section className="card p-4 sm:p-6">
      <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-lg border border-[#30363d] px-3 py-2 text-sm font-bold text-[#b1bac4] hover:bg-[#21262d]">← Volver</button>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#48d8d0]">Bitácora de entrenamiento</p>
      <h2 className="mt-2 text-2xl font-black">{training.fecha} · {training.hora || 'Sin hora'}</h2>
      <p className="mt-1 text-sm text-[#8b949e]">{training.lugar || 'Lugar no informado'} · {training.estado}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className="label">Objetivo de la sesión</span><textarea rows={3} maxLength={500} value={form.objetivo} onChange={(event) => setForm((current) => ({ ...current, objetivo: event.target.value }))} placeholder="Qué quieres lograr con esta sesión" className="w-full" /></label>
        <label><span className="label">Contenidos trabajados</span><textarea rows={3} maxLength={1500} value={form.contenidos} onChange={(event) => setForm((current) => ({ ...current, contenidos: event.target.value }))} placeholder="Ejercicios, conceptos y tareas" className="w-full" /></label>
        <label><span className="label">Observaciones del grupo</span><textarea rows={4} maxLength={1500} value={form.observaciones} onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))} placeholder="Rendimiento, actitud y puntos a reforzar" className="w-full" /></label>
        <label><span className="label">Incidencias</span><textarea rows={4} maxLength={1500} value={form.incidencias} onChange={(event) => setForm((current) => ({ ...current, incidencias: event.target.value }))} placeholder="Golpes, lesiones o situaciones relevantes" className="w-full" /></label>
      </div>
      <label className="mt-4 block"><span className="label">Intensidad</span><select value={form.intensidad} onChange={(event) => setForm((current) => ({ ...current, intensidad: event.target.value as TrainingLog['intensidad'] }))} className="w-full sm:max-w-xs"><option>Baja</option><option>Media</option><option>Alta</option></select></label>
      <button type="button" onClick={() => void save()} disabled={saving || !verified} className="btn-primary mt-5 min-h-12 w-full py-3 sm:w-auto sm:min-w-56 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar bitácora'}</button>
    </section>
  );
};

export default TrainingLogPanel;
