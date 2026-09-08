import { useEffect, useState } from 'react';
import { CheckCircleIcon, PlusIcon, SparklesIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';

type Branch = { id: string; nombre: string; disciplina: string };
type ProfileResponse = {
  code: string;
  label: string;
  metrics: string[];
  metricVersion: number;
  custom?: boolean;
  customization?: { allowed: boolean; active: boolean; version?: number | null };
};

type Props = {
  branch: Branch;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
};

const inputClass = 'w-full rounded-xl border border-[#cfd8cc] bg-white px-3 py-2.5 text-sm font-bold text-[#111711] outline-none placeholder:text-[#899389] focus:border-[#3157ff]';

export default function EvaluationCriteriaEditor({ branch, onClose, onSaved }: Props) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [metrics, setMetrics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/api/sport-profiles', { params: { rama_id: branch.id } });
      const next = response.data?.data as ProfileResponse;
      setProfile(next);
      setMetrics(next?.metrics || []);
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'No fue posible cargar los criterios de evaluación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [branch.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, saving]);

  const updateMetric = (index: number, value: string) => {
    setMetrics((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
  };

  const addMetric = () => {
    setMetrics((current) => current.length >= 10 ? current : [...current, '']);
  };

  const removeMetric = (index: number) => {
    setMetrics((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const save = async () => {
    const cleaned = metrics.map((metric) => metric.trim().replace(/\s+/g, ' ')).filter(Boolean);
    if (cleaned.length < 3 || cleaned.length > 10) {
      setMessage('Define entre 3 y 10 criterios de evaluación.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put(`/api/sport-profiles/branch/${branch.id}/evaluation-config`, { metrics: cleaned });
      const next = response.data?.data?.profile as ProfileResponse;
      setProfile({ ...next, customization: response.data?.data?.customization });
      setMetrics(next?.metrics || cleaned);
      setMessage(`Criterios guardados · versión ${next?.metricVersion || response.data?.data?.customization?.version || ''}. Las evaluaciones anteriores conservan su versión histórica.`);
      await onSaved?.();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'No fue posible guardar los criterios.');
    } finally {
      setSaving(false);
    }
  };

  const restore = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await api.delete(`/api/sport-profiles/branch/${branch.id}/evaluation-config`);
      const next = response.data?.data?.profile as ProfileResponse;
      setProfile({ ...next, customization: response.data?.data?.customization });
      setMetrics(next?.metrics || []);
      setMessage(`Se restauraron los criterios estándar de ${BRAND.name}. El historial personalizado anterior se conserva.`);
      await onSaved?.();
    } catch (error: any) {
      setMessage(error?.response?.data?.error || 'No fue posible restaurar los criterios estándar.');
    } finally {
      setSaving(false);
    }
  };

  const allowed = Boolean(profile?.customization?.allowed);
  const active = Boolean(profile?.customization?.active);

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evaluation-criteria-title"
      className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-[#d8dfd5] bg-white text-[#111711] shadow-2xl shadow-black/20"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e2e7df] bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#617b00]">Evaluación · {branch.disciplina}</p>
          <h2 id="evaluation-criteria-title" className="mt-1 text-2xl font-black text-[#111711]">Criterios de {branch.nombre}</h2>
          <p className="mt-2 text-sm leading-6 text-[#566356]">Cada criterio se califica de 0 a 100 y alimenta el radar de evolución del deportista.</p>
        </div>
        <button type="button" onClick={onClose} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7dfd4] bg-[#f8faf6] text-[#354235] hover:bg-[#eef2eb]" aria-label="Cerrar"><XMarkIcon className="h-5 w-5" /></button>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        {loading ? <div role="status" className="py-10 text-center text-sm font-semibold text-[#566356]">Cargando criterios...</div> : profile ? <>
          <div className={`rounded-2xl border p-4 ${allowed ? 'border-[#cfe0aa] bg-[#f4f8e9]' : 'border-[#e4d7bc] bg-[#fbf7ee]'}`}>
            <div className="flex items-start gap-3">
              <SparklesIcon className={`mt-0.5 h-6 w-6 shrink-0 ${allowed ? 'text-[#617b00]' : 'text-[#85691f]'}`} />
              <div className="min-w-0">
                <p className="font-black text-[#111711]">{allowed ? (active ? 'Perfil personalizado activo' : 'Puedes crear tu propio método de evaluación') : `Perfil estándar de ${BRAND.name}`}</p>
                <p className="mt-1 text-sm leading-6 text-[#566356]">{allowed
                  ? 'Competencia y Alto Rendimiento permiten adaptar los criterios a la metodología de cada rama. Cada cambio crea una nueva versión para proteger la evolución histórica.'
                  : `Formación utiliza los criterios multideporte definidos por ${BRAND.name}. La personalización por rama está disponible desde Competencia.`}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-[#111711]">Criterios del radar</p>
                <p className="mt-1 text-xs font-semibold text-[#697468]">{allowed ? 'Entre 3 y 10 criterios únicos.' : `${metrics.length} criterios estándar para ${profile.label}.`}</p>
              </div>
              {active
                ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase text-emerald-800">Personalizado v{profile.metricVersion}</span>
                : <span className="rounded-full border border-[#d7dfd4] bg-[#f8faf6] px-3 py-1 text-[10px] font-black uppercase text-[#566356]">Estándar</span>}
            </div>

            {metrics.map((metric, index) => <div key={`${index}-${metric}`} className="flex items-center gap-2">
              <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#cde995] bg-[#f3fadf] text-xs font-black text-[#4f6900]">{index + 1}</div>
              {allowed
                ? <input aria-label={`Criterio ${index + 1}`} className={inputClass} maxLength={80} value={metric} onChange={(event) => updateMetric(index, event.target.value)} placeholder={`Criterio ${index + 1}`} />
                : <div className="flex min-h-11 flex-1 items-center rounded-xl border border-[#d7dfd4] bg-[#f8faf6] px-3 text-sm font-bold text-[#111711]"><CheckCircleIcon className="mr-2 h-4 w-4 shrink-0 text-[#617b00]" />{metric}</div>}
              {allowed && metrics.length > 3 ? <button type="button" onClick={() => removeMetric(index)} className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-700 hover:bg-red-100" aria-label={`Eliminar ${metric || `criterio ${index + 1}`}`}><TrashIcon className="h-5 w-5" /></button> : null}
            </div>)}

            {allowed && metrics.length < 10 ? <button type="button" onClick={addMetric} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#a9be76] bg-[#fbfcf8] px-4 text-sm font-black text-[#4f6900] hover:bg-[#f3f8e7]"><PlusIcon className="h-5 w-5" />Agregar criterio</button> : null}
          </div>

          {message ? <div role="status" className="rounded-xl border border-[#cde995] bg-[#f3fadf] px-4 py-3 text-sm font-semibold leading-6 text-[#405700]">{message}</div> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e2e7df] pt-5 sm:flex-row sm:justify-between">
            <div>{allowed && active ? <button type="button" disabled={saving} onClick={() => void restore()} className="min-h-11 rounded-xl border border-[#d7dfd4] bg-white px-4 text-sm font-black text-[#354235] hover:bg-[#f8faf6] disabled:opacity-50">Restaurar estándar</button> : null}</div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#d7dfd4] bg-white px-4 text-sm font-black text-[#354235] hover:bg-[#f8faf6]">Cerrar</button>
              {allowed ? <button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-[#111711] px-5 text-sm font-black text-white hover:bg-[#242b25] disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar criterios'}</button> : null}
            </div>
          </div>
        </> : <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message || 'No fue posible cargar el perfil de evaluación.'}</div>}
      </div>
    </div>
  </div>;
}
