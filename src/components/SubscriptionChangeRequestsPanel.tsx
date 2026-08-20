import { useCallback, useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import { useAdminTheme } from '../contexts/AdminThemeContext';

type PlanCode = 'formacion' | 'competencia' | 'alto_rendimiento';
type RequestStatus = 'pending' | 'approved' | 'rejected' | 'applied' | 'cancelled';

type ChangeRequest = {
  id: string;
  academia_id: string;
  current_plan_code: PlanCode;
  current_billing_cycle: 'monthly' | 'annual';
  current_guardian_license: boolean;
  requested_plan_code: PlanCode;
  requested_billing_cycle: 'monthly' | 'annual';
  requested_guardian_license: boolean;
  reason?: string | null;
  status: RequestStatus;
  effective_from?: string | null;
  requested_at: string;
  review_notes?: string | null;
  academias?: {
    id: string;
    nombre: string;
    plan?: string;
    plan_codigo?: PlanCode;
    billing_cycle?: 'monthly' | 'annual';
    next_billing_date?: string | null;
    licencia_apoderados?: boolean;
  } | null;
};

const LABELS: Record<PlanCode, string> = {
  formacion: 'Formación',
  competencia: 'Competencia',
  alto_rendimiento: 'Alto Rendimiento',
};
const cycleLabel = (cycle: 'monthly' | 'annual') => cycle === 'annual' ? 'Anual' : 'Mensual';
const date = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL') : 'Próximo ciclo';

export default function SubscriptionChangeRequestsPanel() {
  const dialog = useAppDialog();
  const { theme } = useAdminTheme();
  const light = theme === 'light';
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/saas-admin/subscription-change-requests?status=pending,approved');
      setRequests(response.data?.data || []);
    } catch (error) {
      console.error('No fue posible cargar solicitudes de cambio:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (request: ChangeRequest, action: 'approve' | 'reject') => {
    const actionLabel = action === 'approve' ? 'aprobar' : 'rechazar';
    const confirmed = await dialog.confirmAction(
      action === 'approve'
        ? `¿Aprobar el cambio de ${LABELS[request.current_plan_code]} a ${LABELS[request.requested_plan_code]} para ${request.academias?.nombre || 'esta academia'}? El cambio se aplicará al pagar la próxima renovación.`
        : `¿Rechazar la solicitud de cambio de ${request.academias?.nombre || 'esta academia'}?`,
      { title: BRAND.name, tone: action === 'reject' ? 'danger' : 'default' },
    );
    if (!confirmed) return;

    const notes = window.prompt(`Observación de Lestra para ${actionLabel} (opcional):`, request.review_notes || '') || '';
    try {
      setWorking(request.id);
      await api.patch(`/api/saas-admin/subscription-change-requests/${request.id}`, { action, notes });
      await dialog.notify(action === 'approve'
        ? 'Cambio aprobado. Se aplicará en la próxima renovación una vez que el pago sea confirmado.'
        : 'Solicitud rechazada.', { title: BRAND.name });
      await load();
    } catch (error: any) {
      await dialog.notify(error.response?.data?.error || 'No fue posible revisar la solicitud.', { title: BRAND.name });
    } finally {
      setWorking(null);
    }
  };

  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#151b25]';
  const text = light ? 'text-slate-950' : 'text-white';
  const muted = light ? 'text-slate-500' : 'text-[#8995a4]';

  return (
    <section className={`overflow-hidden rounded-2xl border ${panel}`}>
      <div className={`flex flex-col gap-3 border-b p-6 sm:flex-row sm:items-center sm:justify-between ${light ? 'border-slate-200' : 'border-white/10'}`}>
        <div>
          <p className="text-xs font-black uppercase tracking-[.15em] text-[#289E9D]">Control contractual Lestra</p>
          <h2 className={`mt-1 text-xl font-black ${text}`}>Solicitudes de cambio de plan</h2>
          <p className={`mt-1 text-sm ${muted}`}>El director no puede modificar un contrato pagado sin esta aprobación.</p>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${requests.some((item) => item.status === 'pending') ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
          {requests.filter((item) => item.status === 'pending').length} pendientes
        </span>
      </div>

      {loading ? <div className={`p-6 text-sm ${muted}`}>Cargando solicitudes...</div> : requests.length === 0 ? (
        <div className="p-6">
          <div className={`rounded-xl border border-dashed p-5 text-sm ${light ? 'border-slate-300 text-slate-500' : 'border-white/10 text-[#8995a4]'}`}>
            No hay solicitudes pendientes ni aprobadas esperando aplicación.
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {requests.map((request) => (
            <article key={request.id} className="grid gap-5 p-6 xl:grid-cols-[1.1fr_1.4fr_auto] xl:items-center">
              <div>
                <p className={`font-black ${text}`}>{request.academias?.nombre || 'Academia'}</p>
                <p className={`mt-1 text-xs ${muted}`}>Solicitado {new Date(request.requested_at).toLocaleString('es-CL')}</p>
                {request.reason ? <p className={`mt-2 text-sm ${muted}`}>“{request.reason}”</p> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className={`rounded-xl border p-4 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0f141d]'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${muted}`}>Contrato actual</p>
                  <p className={`mt-1 font-black ${text}`}>{LABELS[request.current_plan_code]}</p>
                  <p className={`mt-1 text-xs ${muted}`}>{cycleLabel(request.current_billing_cycle)} · Apoderados {request.current_guardian_license ? 'Sí' : 'No'}</p>
                </div>
                <span className="hidden text-xl text-[#289E9D] sm:block">→</span>
                <div className="rounded-xl border border-[#289E9D]/35 bg-[#289E9D]/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#70e4df]">Solicitado</p>
                  <p className={`mt-1 font-black ${text}`}>{LABELS[request.requested_plan_code]}</p>
                  <p className={`mt-1 text-xs ${muted}`}>{cycleLabel(request.requested_billing_cycle)} · Apoderados {request.requested_guardian_license ? 'Sí' : 'No'} · desde {date(request.effective_from)}</p>
                </div>
              </div>

              <div className="flex gap-2 xl:justify-end">
                {request.status === 'pending' ? <>
                  <button disabled={working === request.id} onClick={() => void review(request, 'reject')} className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-black text-red-300 disabled:opacity-40">Rechazar</button>
                  <button disabled={working === request.id} onClick={() => void review(request, 'approve')} className="rounded-lg bg-[#289E9D] px-4 py-2 text-sm font-black text-white disabled:opacity-40">{working === request.id ? 'Procesando...' : 'Aprobar'}</button>
                </> : <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-300">Aprobado · esperando renovación</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
