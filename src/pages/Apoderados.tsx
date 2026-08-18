import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { KeyIcon, LockClosedIcon, PencilSquareIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Guardian = {
  id: string; nombre_completo: string; rut?: string | null; email?: string | null; telefono?: string | null; parentesco?: string | null; direccion?: string | null;
  usuario_id?: string | null; acceso_activo: boolean; jugadores: { id: string; nombre: string }[];
};

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
    setEditForm({
      nombre_completo: guardian.nombre_completo || '',
      rut: guardian.rut || '',
      telefono: guardian.telefono || '',
      email: guardian.email || '',
      parentesco: guardian.parentesco || '',
      direccion: guardian.direccion || '',
    });
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
    } finally {
      setSaving(false);
    }
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
    } finally {
      setSaving(false);
    }
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

  if (licenseMissing) return <div className="mx-auto max-w-4xl py-10"><section className="relative overflow-hidden rounded-[30px] border border-violet-400/25 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_35%),#151b25] p-8 sm:p-12"><LockClosedIcon className="h-12 w-12 text-violet-300" /><p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-violet-300">Licencia independiente</p><h1 className="mt-2 text-4xl font-black text-white">Portal de Apoderados</h1><p className="mt-4 max-w-2xl leading-7 text-[#9aa6b5]">Este módulo se contrata por separado y no está incluido en Formación, Competencia ni Alto Rendimiento. Al activarlo, cada apoderado recibe un acceso privado limitado exclusivamente a sus jugadores vinculados, agenda, asistencia y estado de cuenta.</p><div className="mt-8 rounded-2xl border border-white/10 bg-black/15 p-5"><p className="font-black text-white">Incluye</p><p className="mt-2 text-sm leading-6 text-[#9aa6b5]">Cuentas individuales, aislamiento por familia, próximos partidos, citación e inicio, asistencia reciente y obligaciones propias. La activación la realiza la administración maestra de Lestra.</p></div></section></div>;
  if (query.isLoading) return <div className="py-20 text-center font-bold text-[#8995a4]">Cargando apoderados...</div>;

  const guardians = query.data || [];
  return <div className="space-y-6 pb-12"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">Licencia activa</p><h1 className="mt-1 text-3xl font-black text-white">Accesos de Apoderados</h1><p className="mt-2 text-sm text-[#8995a4]">La dirección crea y controla cada cuenta. El apoderado solo ve a sus jugadores vinculados.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><UsersIcon className="h-7 w-7 text-violet-300" /><p className="mt-3 text-3xl font-black">{guardians.length}</p><p className="text-sm text-[#8995a4]">Apoderados registrados</p></div><div className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><KeyIcon className="h-7 w-7 text-emerald-300" /><p className="mt-3 text-3xl font-black">{guardians.filter((item) => item.usuario_id && item.acceso_activo).length}</p><p className="text-sm text-[#8995a4]">Accesos activos</p></div><div className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><UserPlusIcon className="h-7 w-7 text-amber-300" /><p className="mt-3 text-3xl font-black">{guardians.filter((item) => !item.usuario_id).length}</p><p className="text-sm text-[#8995a4]">Pendientes de invitar</p></div></div>
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#151b25]"><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black">Familias y accesos</h2></div><div className="divide-y divide-white/10">{guardians.length ? guardians.map((guardian) => <article key={guardian.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10 font-black text-violet-200">{guardian.nombre_completo.slice(0, 1)}</div><div className="min-w-0"><h3 className="truncate font-black text-white">{guardian.nombre_completo}</h3><p className="truncate text-sm text-[#8995a4]">{guardian.email || 'Sin correo'} · {guardian.telefono || 'Sin teléfono'}</p><div className="mt-2 flex flex-wrap gap-1">{guardian.jugadores.map((player) => <span key={player.id} className="rounded-full border border-[#289E9D]/20 bg-[#289E9D]/10 px-2 py-1 text-xs font-bold text-[#70e4df]">{player.nombre}</span>)}</div></div></div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${guardian.usuario_id ? guardian.acceso_activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{guardian.usuario_id ? guardian.acceso_activo ? 'Activo' : 'Desactivado' : 'Sin acceso'}</span><button type="button" onClick={() => openEdit(guardian)} className="min-h-11 rounded-xl border border-sky-400/20 px-4 text-sm font-black text-sky-200"><PencilSquareIcon className="mr-1 inline h-4 w-4"/>Editar</button>{guardian.usuario_id ? <><button type="button" onClick={() => void resetPassword(guardian)} className="min-h-11 rounded-xl border border-violet-400/20 px-4 text-sm font-black text-violet-200">Nueva clave</button><button type="button" onClick={() => void toggle(guardian)} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-black text-[#b9c3cf]">{guardian.acceso_activo ? 'Desactivar' : 'Reactivar'}</button></> : <button type="button" onClick={() => { setSelected(guardian); setEmail(guardian.email || ''); }} disabled={!guardian.jugadores.length} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">Crear acceso</button>}</div></article>) : <div className="p-10 text-center text-[#8995a4]">Los apoderados aparecerán al registrarlos en una matrícula.</div>}</div></section>
    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#151b25] p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-wider text-sky-300">Editar apoderado</p><h2 className="mt-2 text-2xl font-black text-white">Información de contacto y vínculo</h2><p className="mt-2 text-sm text-[#8995a4]">Si el apoderado ya tiene acceso y cambias su correo, Lestra actualizará también su cuenta de inicio de sesión.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="label">Nombre completo *</span><input value={editForm.nombre_completo} onChange={(e)=>setEditForm({...editForm,nombre_completo:e.target.value})} className="w-full"/></label><label><span className="label">RUT</span><input value={editForm.rut} onChange={(e)=>setEditForm({...editForm,rut:e.target.value})} className="w-full"/></label><label><span className="label">Teléfono</span><input value={editForm.telefono} onChange={(e)=>setEditForm({...editForm,telefono:e.target.value})} className="w-full"/></label><label><span className="label">Correo</span><input type="email" value={editForm.email} onChange={(e)=>setEditForm({...editForm,email:e.target.value})} className="w-full"/></label><label><span className="label">Parentesco</span><input placeholder="Madre, padre, tutor legal..." value={editForm.parentesco} onChange={(e)=>setEditForm({...editForm,parentesco:e.target.value})} className="w-full"/></label><label><span className="label">Dirección</span><input value={editForm.direccion} onChange={(e)=>setEditForm({...editForm,direccion:e.target.value})} className="w-full"/></label></div><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={()=>setEditing(null)} className="min-h-11 rounded-xl border border-white/10 font-black text-[#9aa6b5]">Cancelar</button><button type="button" onClick={()=>void saveEdit()} disabled={saving || !editForm.nombre_completo.trim()} className="btn-primary min-h-11 disabled:opacity-50">{saving?'Guardando...':'Guardar cambios'}</button></div></div></div> : null}
    {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#151b25] p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-wider text-violet-300">Nuevo acceso</p><h2 className="mt-2 text-2xl font-black text-white">{selected.nombre_completo}</h2><p className="mt-2 text-sm text-[#8995a4]">Recibirá una contraseña temporal y solo verá a: {selected.jugadores.map((item) => item.nombre).join(', ')}.</p><label className="mt-5 block"><span className="label">Correo de acceso</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full" /></label><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={() => setSelected(null)} className="min-h-11 rounded-xl border border-white/10 font-black text-[#9aa6b5]">Cancelar</button><button type="button" onClick={() => void invite()} disabled={saving || !email} className="btn-primary min-h-11 disabled:opacity-50">{saving ? 'Creando...' : 'Crear y enviar'}</button></div></div></div> : null}
  </div>;
};

export default Apoderados;
