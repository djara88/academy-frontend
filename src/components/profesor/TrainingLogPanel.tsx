import { useEffect, useState } from 'react';
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

const EMPTY_LOG: TrainingLog = { objetivo: '', contenidos: '', observaciones: '', incidencias: '', intensidad: 'Media' };

const TrainingLogPanel = ({ trainingId, academyName, onBack, onSaved }: { trainingId: string; academyName?: string; onBack: () => void; onSaved: () => void }) => {
  const { notify } = useAppDialog();
  const [training, setTraining] = useState<Training | null>(null);
  const [form, setForm] = useState<TrainingLog>(EMPTY_LOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/profesores/me/entrenamientos/${trainingId}/bitacora`).then((response) => {
      setTraining(response.data.data.entrenamiento);
      setForm(response.data.data.bitacora ? { ...EMPTY_LOG, ...response.data.data.bitacora } : EMPTY_LOG);
    }).catch((error) => notify(error.response?.data?.error || 'No fue posible cargar la bitácora.', { title: academyName })).finally(() => setLoading(false));
  }, [academyName, notify, trainingId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/profesores/me/entrenamientos/${trainingId}/bitacora`, form);
      await notify('✅ Bitácora guardada correctamente.', { title: academyName });
      onSaved();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la bitácora.', { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-8 text-center text-[#8b949e]">Cargando bitácora...</div>;

  return (
    <section className="card p-4 sm:p-6">
      <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-lg border border-[#30363d] px-3 py-2 text-sm font-bold text-[#b1bac4] hover:bg-[#21262d]">← Volver</button>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#48d8d0]">Bitácora de entrenamiento</p>
      <h2 className="mt-2 text-2xl font-black">{training?.fecha} · {training?.hora || 'Sin hora'}</h2>
      <p className="mt-1 text-sm text-[#8b949e]">{training?.lugar || 'Lugar no informado'} · {training?.estado}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className="label">Objetivo de la sesión</span><textarea rows={3} maxLength={500} value={form.objetivo} onChange={(event) => setForm((current) => ({ ...current, objetivo: event.target.value }))} placeholder="Qué quieres lograr con esta sesión" className="w-full" /></label>
        <label><span className="label">Contenidos trabajados</span><textarea rows={3} maxLength={1500} value={form.contenidos} onChange={(event) => setForm((current) => ({ ...current, contenidos: event.target.value }))} placeholder="Ejercicios, conceptos y tareas" className="w-full" /></label>
        <label><span className="label">Observaciones del grupo</span><textarea rows={4} maxLength={1500} value={form.observaciones} onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))} placeholder="Rendimiento, actitud y puntos a reforzar" className="w-full" /></label>
        <label><span className="label">Incidencias</span><textarea rows={4} maxLength={1500} value={form.incidencias} onChange={(event) => setForm((current) => ({ ...current, incidencias: event.target.value }))} placeholder="Golpes, lesiones o situaciones relevantes" className="w-full" /></label>
      </div>
      <label className="mt-4 block"><span className="label">Intensidad</span><select value={form.intensidad} onChange={(event) => setForm((current) => ({ ...current, intensidad: event.target.value as TrainingLog['intensidad'] }))} className="w-full sm:max-w-xs"><option>Baja</option><option>Media</option><option>Alta</option></select></label>
      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary mt-5 min-h-12 w-full py-3 sm:w-auto sm:min-w-56 disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar bitácora'}</button>
    </section>
  );
};

export default TrainingLogPanel;
