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

const inputClass = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';

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

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#151b25] shadow-2xl shadow-black/50">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#151b25]/95 px-5 py-5 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#70e4df]">Evaluación · {branch.disciplina}</p>
          <h2 className="mt-1 text-2xl font-black text-white">Criterios de {branch.nombre}</h2>
          <p className="mt-2 text-sm leading-6 text-[#8995a4]">Cada criterio se califica de 0 a 100 y alimenta el radar de evolución del deportista.</p>
        </div>
        <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-[#9aa6b5] hover:bg-white/5 hover:text-white" aria-label="Cerrar"><XMarkIcon className="h-5 w-5" /></button>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        {loading ? <div className="py-10 text-center text-[#8995a4]">Cargando criterios...</div> : profile ? <>
          <div className={`rounded-2xl border p-4 ${allowed ? 'border-[#289E9D]/25 bg-[#289E9D]/8' : 'border-[#C8A96B]/25 bg-[#C8A96B]/8'}`}>
            <div className="flex items-start gap-3">
              <SparklesIcon className={`mt-0.5 h-6 w-6 shrink-0 ${allowed ? 'text-[#70e4df]' : 'text-[#D8BE87]'}`} />
              <div>
                <p className="font-black text-white">{allowed ? (active ? 'Perfil personalizado activo' : 'Puedes crear tu propio método de evaluación') : `Perfil estándar de ${BRAND.name}`}</p>
                <p className="mt-1 text-sm leading-6 text-[#9aa6b5]">{allowed
                  ? 'Competencia y Alto Rendimiento permiten adaptar los criterios a la metodología de cada rama. Cada cambio crea una nueva versión para proteger la evolución histórica.'
                  : `Formación utiliza los criterios multideporte definidos por ${BRAND.name}. La personalización por rama está disponible desde Competencia.`}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><div><p className="font-black text-white">Criterios del radar</p><p className="mt-1 text-xs text-[#7f8c9c]">{allowed ? 'Entre 3 y 10 criterios únicos.' : `${metrics.length} criterios estándar para ${profile.label}.`}</p></div>{active ? <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">Personalizado v{profile.metricVersion}</span> : <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase text-[#9aa6b5]">Estándar</span>}</div>

            {metrics.map((metric, index) => <div key={`${index}-${metric}`} className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d1117] text-xs font-black text-[#70e4df]">{index + 1}</div>
              {allowed ? <input className={inputClass} maxLength={80} value={metric} onChange={(event) => updateMetric(index, event.target.value)} placeholder={`Criterio ${index + 1}`} /> : <div className="flex min-h-11 flex-1 items-center rounded-xl border border-white/10 bg-[#0d1117] px-3 text-sm font-bold text-[#d7dee7]"><CheckCircleIcon className="mr-2 h-4 w-4 text-[#48d8d0]" />{metric}</div>}
              {allowed && metrics.length > 3 ? <button onClick={() => removeMetric(index)} className="rounded-xl border border-red-400/15 p-2.5 text-red-300 hover:bg-red-500/10" aria-label={`Eliminar ${metric || `criterio ${index + 1}`}`}><TrashIcon className="h-5 w-5" /></button> : null}
            </div>)}

            {allowed && metrics.length < 10 ? <button onClick={addMetric} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#289E9D]/40 px-4 text-sm font-black text-[#70e4df] hover:bg-[#289E9D]/8"><PlusIcon className="h-5 w-5" />Agregar criterio</button> : null}
          </div>

          {message ? <div className="rounded-xl border border-[#289E9D]/25 bg-[#289E9D]/10 px-4 py-3 text-sm leading-6 text-[#b8f5f1]">{message}</div> : null}

          <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-between">
            <div>{allowed && active ? <button disabled={saving} onClick={() => void restore()} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6] hover:bg-white/5 disabled:opacity-50">Restaurar estándar</button> : null}</div>
            <div className="flex gap-3"><button onClick={onClose} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6] hover:bg-white/5">Cerrar</button>{allowed ? <button disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white hover:bg-[#35b8b5] disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar criterios'}</button> : null}</div>
          </div>
        </> : <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{message || 'No fue posible cargar el perfil de evaluación.'}</div>}
      </div>
    </div>
  </div>;
}
