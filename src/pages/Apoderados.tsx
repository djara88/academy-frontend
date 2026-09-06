import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LockClosedIcon, PencilSquareIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorHero, DirectorPage, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

type Guardian = {
  id: string; nombre_completo: string; rut?: string | null; email?: string | null; telefono?: string | null; parentesco?: string | null; direccion?: string | null;
  usuario_id?: string | null; acceso_activo: boolean; jugadores: { id: string; nombre: string }[];
};

const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

const Apoderados = () => {
  const { notify, confirmAction } = useAppDialog();
  const [selected, setSelected] = useState<Guardian | null>(null);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Guardian | null>(null);
  const [editForm, setEditForm] = useState({ nombre_completo: '', rut: '', telefono: '', email: '', parentesco: '', direccion: '' });
  const query = useQuery({
    queryKey: ['apoderados-accesos'],
    queryFn: async () => (await api.get('/api/apoderados')).data.data as Guardian[],
    retry: false,
  });
  const licenseMissing = (query.error as any)?.response?.data?.code === 'FEATURE_NOT_INCLUDED';

  const openEdit = (guardian: Guardian) => {
    setEditing(guardian);
    setEditForm({ nombre_completo: guardian.nombre_completo || '', rut: guardian.rut || '', telefono: guardian.telefono || '', email: guardian.email || '', parentesco: guardian.parentesco || '', direccion: guardian.direccion || '' });
  };

  const saveEdit = async () => {
    if (!editing || !editForm.nombre_completo.trim()) return;
    setSaving(true);
    try {
      const response = await api.patch(`/api/apoderados/${editing.id}`, editForm);
      setEditing(null);
      await query.refetch();
      await notify(response.data?.message || 'Datos del apoderado actualizados.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar los datos del apoderado.');
    } finally { setSaving(false); }
  };

  const invite = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const response = await api.post(`/api/apoderados/${selected.id}/acceso`, { email });
      setSelected(null);
      await query.refetch();
      await notify(response.data.email_sent ? response.data.message : `${response.data.message}\n\nContraseña temporal: ${response.data.temporary_password}`);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible crear el acceso.');
    } finally { setSaving(false); }
  };

  const toggle = async (guardian: Guardian) => {
    const active = !guardian.acceso_activo;
    if (!await confirmAction(`${active ? '¿Reactivar' : '¿Desactivar'} el acceso de ${guardian.nombre_completo}?`)) return;
    try {
      await api.patch(`/api/apoderados/${guardian.id}/estado`, { activo: active });
      await query.refetch();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cambiar el acceso.');
    }
  };

  const resetPassword = async (guardian: Guardian) => {
    if (!await confirmAction(`¿Generar una nueva contraseña temporal para ${guardian.nombre_completo}?`)) return;
    try {
      const response = await api.post(`/api/apoderados/${guardian.id}/reset-password`);
      await notify(response.data.email_sent ? response.data.message : `${response.data.message}\n\nContraseña temporal: ${response.data.temporary_password}`);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible restablecer la contraseña.');
    }
  };

  if (licenseMissing) return <DirectorPage className="max-w-5xl"><DirectorHero eyebrow="Licencia independiente" title="Portal de Apoderados" description="Este módulo se contrata por separado. Cada apoderado recibe un acceso privado limitado a sus alumnos vinculados, confirmaciones deportivas y estado de cuenta." actions={<div className="inline-flex items-center gap-2 rounded-xl border border-[#d9e0d6] bg-[#f7f9f5] px-4 py-3 text-sm font-bold text-[#596456]"><LockClosedIcon className="h-5 w-5 text-[#6d8700]"/>Acceso familiar privado e independiente</div>} /></DirectorPage>;
  if (query.isLoading) return <DirectorPanel className="mx-auto max-w-5xl p-12 text-center text-sm font-bold text-[#697468]">Cargando apoderados...</DirectorPanel>;

  const guardians = query.data || [];
  const activeCount = guardians.filter((item) => item.usuario_id && item.acceso_activo).length;
  const pendingCount = guardians.filter((item) => !item.usuario_id).length;

  return <DirectorPage>
    <DirectorHero eyebrow="Portal familiar" title="Apoderados" description="Administra datos, vínculos y accesos familiares. Cada cuenta queda aislada a sus alumnos asociados." />

    <section className="grid gap-3 sm:grid-cols-2">
      <DirectorStat label="Accesos activos" value={activeCount} detail={`${guardians.length} apoderados registrados`} tone="lime" />
      <DirectorStat label="Pendientes de acceso" value={pendingCount} detail="Todavía sin invitación" />
    </section>

    <DirectorPanel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#e2e7df] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Familias</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Accesos y vínculos</h2><p className="mt-1 text-sm text-[#697468]">Edita contactos, crea accesos y controla su estado.</p></div><div className="rounded-full border border-[#d9e0d6] bg-[#f7f9f5] px-3 py-2 text-xs font-black text-[#586257]">{guardians.length} familias</div></div>
      <div className="divide-y divide-[#e7ebe4]">{guardians.length ? guardians.map((guardian) => <article key={guardian.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[#111711] font-black text-[#b7ff00]">{guardian.nombre_completo.slice(0, 1)}</div><div className="min-w-0"><h3 className="truncate font-black text-[#111711]">{guardian.nombre_completo}</h3><p className="truncate text-sm text-[#697468]">{guardian.email || 'Sin correo'} · {guardian.telefono || 'Sin teléfono'}</p><div className="mt-2 flex flex-wrap gap-1.5">{guardian.jugadores.map((player) => <span key={player.id} className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black text-[#4f6900]">{player.nombre}</span>)}</div></div></div>
        <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${guardian.usuario_id ? guardian.acceso_activo ? 'border-[#cde995] bg-[#f3fadf] text-[#4f6900]' : 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{guardian.usuario_id ? guardian.acceso_activo ? 'Activo' : 'Desactivado' : 'Sin acceso'}</span><button type="button" onClick={() => openEdit(guardian)} className={`${DIRECTOR_BUTTON_GHOST} px-3`}><PencilSquareIcon className="h-4 w-4"/>Editar</button>{guardian.usuario_id ? <><button type="button" onClick={() => void resetPassword(guardian)} className={`${DIRECTOR_BUTTON_GHOST} px-3`}>Nueva clave</button><button type="button" onClick={() => void toggle(guardian)} className={`${DIRECTOR_BUTTON_DARK} px-3`}>{guardian.acceso_activo ? 'Desactivar' : 'Reactivar'}</button></> : <button type="button" onClick={() => { setSelected(guardian); setEmail(guardian.email || ''); }} disabled={!guardian.jugadores.length} className={`${DIRECTOR_BUTTON} px-4`}><UserPlusIcon className="h-4 w-4"/>Crear acceso</button>}</div>
      </article>) : <div className="p-12 text-center text-sm text-[#697468]">Los apoderados aparecerán al registrarlos en una matrícula.</div>}</div>
    </DirectorPanel>

    {editing ? <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#0b100c]/55 p-4"><div className="w-full max-w-2xl rounded-[28px] border border-[#d9e0d6] bg-white p-6 shadow-[0_32px_90px_rgba(13,20,14,.22)] sm:p-7" role="dialog" aria-modal="true" aria-label="Editar apoderado"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Editar apoderado</p><h2 className="mt-2 text-2xl font-black text-[#111711]">Información de contacto y vínculo</h2><p className="mt-2 text-sm leading-6 text-[#697468]">Si cambias el correo de un apoderado con acceso activo, Lestra actualizará también su cuenta de inicio de sesión.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className={labelClass}>Nombre completo *</span><input value={editForm.nombre_completo} onChange={(e)=>setEditForm({...editForm,nombre_completo:e.target.value})} className={DIRECTOR_FIELD}/></label><label><span className={labelClass}>RUT</span><input value={editForm.rut} onChange={(e)=>setEditForm({...editForm,rut:e.target.value})} className={DIRECTOR_FIELD}/></label><label><span className={labelClass}>Teléfono</span><input value={editForm.telefono} onChange={(e)=>setEditForm({...editForm,telefono:e.target.value})} className={DIRECTOR_FIELD}/></label><label><span className={labelClass}>Correo</span><input type="email" value={editForm.email} onChange={(e)=>setEditForm({...editForm,email:e.target.value})} className={DIRECTOR_FIELD}/></label><label><span className={labelClass}>Parentesco</span><input placeholder="Madre, padre, tutor legal..." value={editForm.parentesco} onChange={(e)=>setEditForm({...editForm,parentesco:e.target.value})} className={DIRECTOR_FIELD}/></label><label><span className={labelClass}>Dirección</span><input value={editForm.direccion} onChange={(e)=>setEditForm({...editForm,direccion:e.target.value})} className={DIRECTOR_FIELD}/></label></div><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={()=>setEditing(null)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" onClick={()=>void saveEdit()} disabled={saving || !editForm.nombre_completo.trim()} className={DIRECTOR_BUTTON}>{saving?'Guardando...':'Guardar cambios'}</button></div></div></div> : null}

    {selected ? <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0b100c]/55 p-4"><div className="w-full max-w-md rounded-[28px] border border-[#d9e0d6] bg-white p-6 shadow-[0_32px_90px_rgba(13,20,14,.22)]" role="dialog" aria-modal="true" aria-label="Crear acceso de apoderado"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nuevo acceso</p><h2 className="mt-2 text-2xl font-black text-[#111711]">{selected.nombre_completo}</h2><p className="mt-2 text-sm leading-6 text-[#697468]">Recibirá una contraseña temporal y solo verá a: {selected.jugadores.map((item) => item.nombre).join(', ')}.</p><label className="mt-5 block"><span className={labelClass}>Correo de acceso</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={DIRECTOR_FIELD} /></label><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setSelected(null)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" onClick={() => void invite()} disabled={saving || !email} className={DIRECTOR_BUTTON}>{saving ? 'Creando...' : 'Crear y enviar'}</button></div></div></div> : null}
  </DirectorPage>;
};

export default Apoderados;