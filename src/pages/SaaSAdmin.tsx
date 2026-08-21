import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { BRAND } from '../config/brand';
import { useAppDialog } from '../contexts/DialogContext';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import SubscriptionChangeRequestsPanel from '../components/SubscriptionChangeRequestsPanel';
import { fetchSaasAcademies, SAAS_ACADEMIES_QUERY_KEY } from '../queries/saasAcademies';

interface Academia {
  id: string;
  nombre: string;
  logo?: string;
  direccion?: string;
  telefono?: string;
  correo_academia?: string;
  nombre_director?: string;
  director_email: string;
  plan: 'Formación' | 'Competencia' | 'Alto Rendimiento' | 'Prueba 15 Días';
  plan_codigo?: 'formacion' | 'competencia' | 'alto_rendimiento';
  licencia_apoderados?: boolean;
  estado: 'Activa' | 'Inactiva';
  jugadores_count: number;
  created_at: string;
  subscription_status?: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  trial_ends_at?: string | null;
  plan_price_clp?: number;
  guardian_price_clp?: number;
}

type PlanCode = 'formacion' | 'competencia' | 'alto_rendimiento';
const PLAN_LABELS: Record<PlanCode, Exclude<Academia['plan'], 'Prueba 15 Días'>> = { formacion: 'Formación', competencia: 'Competencia', alto_rendimiento: 'Alto Rendimiento' };

const SaaSAdmin = () => {
  const dialog = useAppDialog();
  const { theme } = useAdminTheme();
  const light = theme === 'light';
  const notify = (message: string) => dialog.notify(message, { title: BRAND.name });
  const confirmAction = (message: string, tone: 'default' | 'danger' = 'default') => (
    dialog.confirmAction(message, { title: BRAND.name, tone })
  );
  const queryClient = useQueryClient();
  const { data: academias = [], isLoading: loading } = useQuery<Academia[]>({
    queryKey: SAAS_ACADEMIES_QUERY_KEY,
    queryFn: () => fetchSaasAcademies<Academia[]>(),
    staleTime: 60_000,
  });
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correoAcademia, setCorreoAcademia] = useState('');
  const [nombreDirector, setNombreDirector] = useState('');
  const [directorEmail, setDirectorEmail] = useState('');
  const [plan, setPlan] = useState<PlanCode>('competencia');
  const [guardianLicense, setGuardianLicense] = useState(false);
  const [estado, setEstado] = useState<'Activa' | 'Inactiva'>('Activa');
  const [activateSubscription, setActivateSubscription] = useState(false);
  const [editingTrial, setEditingTrial] = useState(false);

  const refreshAcademias = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SAAS_ACADEMIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['saas-resumen'] }),
    ]);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setNombre(''); setLogoFile(null); setDireccion(''); setTelefono('');
    setCorreoAcademia(''); setNombreDirector(''); setDirectorEmail('');
    setPlan('competencia'); setGuardianLicense(false); setEstado('Activa'); setActivateSubscription(true); setEditingTrial(false);
    setShowModal(true);
  };

  const openEditModal = (a: Academia) => {
    setEditingId(a.id);
    setNombre(a.nombre);
    setLogoFile(null);
    setDireccion(a.direccion || '');
    setTelefono(a.telefono || '');
    setCorreoAcademia(a.correo_academia || '');
    setNombreDirector(a.nombre_director || '');
    setDirectorEmail(a.director_email);
    setPlan(a.plan_codigo || (a.plan === 'Alto Rendimiento' ? 'alto_rendimiento' : a.plan === 'Competencia' ? 'competencia' : 'formacion'));
    setGuardianLicense(a.licencia_apoderados === true);
    setEstado(a.estado);
    setEditingTrial(a.subscription_status === 'trialing');
    setActivateSubscription(false);
    setShowModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('nombre', nombre);
      if (logoFile) formData.append('logo', logoFile);
      formData.append('direccion', direccion);
      formData.append('telefono', telefono);
      formData.append('correo_academia', correoAcademia);
      formData.append('nombre_director', nombreDirector);
      formData.append('director_email', directorEmail);
      formData.append('plan_codigo', plan);
      formData.append('plan', PLAN_LABELS[plan]);
      formData.append('licencia_apoderados', String(guardianLicense));
      formData.append('estado', estado);
      formData.append('activate_subscription', String(activateSubscription));

      if (editingId) {
        await api.put(`/api/academias/${editingId}`, formData);
        notify('Academia actualizada exitosamente.');
      } else {
        await api.post('/api/academias', formData);
        notify('Academia creada exitosamente.');
      }

      setShowModal(false);
      await refreshAcademias();
    } catch (err: any) {
      notify(`Error al procesar: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (await confirmAction(`⚠️ ¿Estás COMPLETAMENTE SEGURO de que deseas eliminar la academia "${nombre}"? Esta acción borrará todos sus datos y no se puede deshacer.`, 'danger')) {
      try {
        await api.delete(`/api/academias/${id}`);
        notify('Academia eliminada.');
        await refreshAcademias();
      } catch (err: any) {
        notify(`Error al eliminar: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleResetPassword = async (id: string, nombre: string) => {
    if (await confirmAction(`🔑 ¿Deseas generar y enviar una nueva contraseña temporal al director de "${nombre}"?`)) {
      try {
        await api.post(`/api/academias/${id}/reset-password`);
        notify('Nueva contraseña generada y enviada por correo exitosamente.');
      } catch (err: any) {
        notify(`Error al restablecer contraseña: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const totalAcademias = academias.length;
  const activas = academias.filter(a => a.estado === 'Activa').length;
  const totalJugadores = academias.reduce((acc, curr) => acc + (curr.jugadores_count || 0), 0);

  const mrrClp = academias.filter((a) => a.subscription_status === 'active' && a.estado === 'Activa').reduce((sum, academy) => sum + Number(academy.plan_price_clp || 0) + Number(academy.guardian_price_clp || 0), 0);
  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-gray-800 bg-[#1C212D]';
  const text = light ? 'text-slate-950' : 'text-white';
  const muted = light ? 'text-slate-500' : 'text-gray-400';
  const subtle = light ? 'border-slate-200 bg-slate-50' : 'border-gray-800 bg-[#131722]';

  return (
    <div className="space-y-8 pb-12">

      <div className={`flex items-center justify-between border-b pb-6 ${light ? 'border-slate-200' : 'border-gray-800'}`}>
        <div>
          <h1 className={`flex items-center gap-3 text-3xl font-bold ${text}`}>
            <span>🏢</span> Gestión de academias
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Altas, licencias, contratos y accesos de cada organización.
          </p>
        </div>
        <button onClick={openCreateModal} className="bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-lg">
          <span>➕</span> Nueva Academia
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`rounded-xl border p-6 ${panel}`}>
          <p className={`text-xs font-bold uppercase ${muted}`}>Total Academias</p>
          <p className={`mt-2 text-3xl font-extrabold ${text}`}>{totalAcademias}</p>
          <p className="text-xs text-green-400 mt-2">Activas: {activas}</p>
        </div>
        <div className={`rounded-xl border p-6 ${panel}`}>
          <p className={`text-xs font-bold uppercase ${muted}`}>Jugadores Registrados</p>
          <p className="text-3xl font-extrabold text-[#289E9D] mt-2">{totalJugadores}</p>
        </div>
        <div className={`rounded-xl border p-6 ${panel}`}>
          <p className={`text-xs font-bold uppercase ${muted}`}>Licencias activas (MRR)</p>
          <p className="text-3xl font-extrabold text-green-400 mt-2">${mrrClp.toLocaleString('es-CL')}</p>
        </div>
        <div className={`rounded-xl border p-6 ${panel}`}>
          <p className={`text-xs font-bold uppercase ${muted}`}>Estado Sistema</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">100% OK</p>
        </div>
      </div>

      <SubscriptionChangeRequestsPanel />

      <div className={`overflow-hidden rounded-xl border ${panel}`}>
        <div className="p-6 border-b border-gray-800">
          <h2 className={`text-xl font-bold ${text}`}>Gestión de Academias</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando datos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs uppercase ${subtle} ${muted}`}>
                  <th className="p-4">Academia</th>
                  <th className="p-4">Director</th>
                  <th className="p-4">Plan / Estado</th>
                  <th className="p-4 text-center">Acciones Maestras</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${light ? 'divide-slate-200' : 'divide-gray-800'}`}>
                {academias.map((a) => (
                  <tr key={a.id} className={light ? 'transition-colors hover:bg-slate-50' : 'transition-colors hover:bg-[#131722]/50'}>
                    <td className={`p-4 font-semibold ${text}`}>
                      <div className="flex items-center gap-3">
                        {a.logo ? (
                          <img src={a.logo} alt={a.nombre} className="w-8 h-8 rounded-full object-cover bg-gray-800 border border-gray-600" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">🏫</div>
                        )}
                        <span>{a.nombre}</span>
                      </div>
                    </td>
                    <td className={`p-4 ${light ? 'text-slate-700' : 'text-gray-300'}`}>
                      <div>{a.nombre_director}</div>
                      <div className="text-xs text-gray-500">{a.director_email}</div>
                    </td>
                    <td className="p-4">
                      <div className={`font-semibold ${text}`}>{a.plan}</div>
                      {a.subscription_status === 'trialing' ? <div className="mt-1 text-[11px] font-black text-amber-400">Prueba Full · vence {a.trial_ends_at ? new Date(a.trial_ends_at).toLocaleDateString('es-CL') : 'sin fecha'}</div> : null}
                      <div className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${a.licencia_apoderados ? 'border-cyan-700 bg-cyan-900/40 text-cyan-200' : 'border-gray-700 text-gray-500'}`}>Apoderados: {a.licencia_apoderados ? 'Licencia activa' : 'Sin licencia'}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${a.estado === 'Activa' ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-red-900/60 text-red-300 border border-red-700'}`}>
                        {a.estado}
                      </span>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button onClick={() => openEditModal(a)} title="Editar datos completos" className="p-2 bg-blue-900/50 hover:bg-blue-800 text-blue-300 rounded transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => handleResetPassword(a.id, a.nombre)} title="Restablecer Contraseña" className="p-2 bg-yellow-900/50 hover:bg-yellow-800 text-yellow-300 rounded transition-colors">
                        🔑
                      </button>
                      <button onClick={() => handleDelete(a.id, a.nombre)} title="Eliminar Academia" className="p-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded transition-colors">
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#1C212D] p-6 rounded-xl border border-gray-800 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">
              {editingId ? 'Editar Academia' : 'Registrar Nueva Academia'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Datos Institucionales</h4>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">{editingId ? 'Actualizar Logo (Dejar vacío para conservar)' : 'Logo'}</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full bg-[#131722] border border-gray-700 rounded p-1 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Dirección</label>
                    <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Teléfono</label>
                    <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[#289E9D] text-sm font-bold uppercase">Administración</h4>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nombre Director *</label>
                    <input type="text" value={nombreDirector} onChange={(e) => setNombreDirector(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Correo Director (Login) *</label>
                    <input type="email" value={directorEmail} onChange={(e) => setDirectorEmail(e.target.value)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none" required disabled={!!editingId} title={editingId ? 'No se puede cambiar el correo de login al editar' : ''} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Plan SaaS *</label>
                    <select value={plan} onChange={(e) => setPlan(e.target.value as PlanCode)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none">
                      <option value="formacion">Formación · 100 jugadores · 5 profesores</option>
                      <option value="competencia">Competencia · 300 jugadores · 10 profesores</option>
                      <option value="alto_rendimiento">Alto Rendimiento · jugadores sin límite · 30 profesores</option>
                    </select>
                    {editingId ? <p className="mt-1 text-[11px] text-amber-300/80">Uso administrativo excepcional. Los directores cambian de plan mediante solicitud y aprobación contractual.</p> : null}
                  </div>
                  {editingTrial ? <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><div><span className="block text-sm font-black text-amber-100">Activar plan ahora</span><span className="mt-1 block text-xs text-amber-200/70">Al marcarlo finalizarás la prueba Full y aplicarás el plan seleccionado.</span></div><input type="checkbox" checked={activateSubscription} onChange={(event) => setActivateSubscription(event.target.checked)} className="mt-1 h-5 w-5 accent-amber-500" /></label> : null}
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-cyan-900/60 bg-cyan-950/25 p-3">
                    <div><span className="block text-sm font-black text-cyan-100">Licencia Apoderados</span><span className="mt-1 block text-xs text-cyan-300/70">Parte del contrato comercial cuando la academia ya tiene un plan pagado.</span></div>
                    <input type="checkbox" checked={guardianLicense} onChange={(event) => setGuardianLicense(event.target.checked)} className="mt-1 h-5 w-5 accent-[#289E9D]" />
                  </label>
                  {editingId && (
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Estado del Cliente *</label>
                      <select value={estado} onChange={(e) => setEstado(e.target.value as any)} className="w-full bg-[#131722] border border-gray-700 rounded p-2 text-white text-sm focus:outline-none">
                        <option value="Activa">Activa</option>
                        <option value="Inactiva">Inactiva (Suspender acceso)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-800 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded" disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-[#289E9D] hover:bg-[#1f7a79] text-white font-bold py-3 rounded" disabled={uploading}>
                  {uploading ? 'Guardando...' : (editingId ? 'Actualizar Academia' : 'Crear Academia')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaaSAdmin;
