import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';

type Category = { id: string; nombre: string; descripcion?: string | null };
type Professor = {
  id: string;
  nombre_completo: string;
  email: string;
  telefono?: string | null;
  activo: boolean;
  ultimo_acceso?: string | null;
  categorias: Category[];
};
type Payload = {
  data: Professor[];
  categorias: Category[];
  cupos: { used: number; max: number; remaining: number };
  plan?: string;
};
type FormState = { nombre_completo: string; email: string; telefono: string; categoria_ids: string[] };

const emptyForm: FormState = { nombre_completo: '', email: '', telefono: '', categoria_ids: [] };

const Profesores = () => {
  const { user } = useAuth();
  const { notify, confirmAction } = useAppDialog();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [credential, setCredential] = useState<{ email: string; password: string; sent: boolean } | null>(null);
  const academyName = getAcademyName(user?.nombre_academia);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/profesores');
      setPayload(response.data);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar el equipo de profesores.', { title: academyName });
    } finally {
      setLoading(false);
    }
  }, [academyName, notify]);

  useEffect(() => { void load(); }, [load]);

  const occupiedByOthers = useMemo(() => new Set(
    (payload?.data || []).filter((professor) => professor.id !== editing?.id && professor.activo)
      .flatMap((professor) => professor.categorias.map((category) => category.id)),
  ), [editing?.id, payload?.data]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (professor: Professor) => {
    setEditing(professor);
    setForm({ nombre_completo: professor.nombre_completo, email: professor.email, telefono: professor.telefono || '', categoria_ids: professor.categorias.map((category) => category.id) });
    setModalOpen(true);
  };

  const toggleCategory = (id: string) => setForm((current) => ({
    ...current,
    categoria_ids: current.categoria_ids.includes(id)
      ? current.categoria_ids.filter((categoryId) => categoryId !== id)
      : [...current.categoria_ids, id],
  }));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.categoria_ids.length) return void notify('Selecciona al menos una categoría.', { title: academyName });
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/profesores/${editing.id}`, form);
        await notify('Profesor y categorías actualizados.', { title: academyName });
      } else {
        const response = await api.post('/api/profesores', form);
        setCredential({ email: form.email, password: response.data.temporary_password, sent: response.data.email_sent });
      }
      setModalOpen(false);
      await load();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar al profesor.', { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (professor: Professor) => {
    const accepted = await confirmAction(
      professor.activo
        ? `Se cerrará el acceso de ${professor.nombre_completo} y sus categorías quedarán disponibles.`
        : `Se reactivará el acceso de ${professor.nombre_completo}. Luego debes revisar sus categorías.`,
      { title: academyName, confirmLabel: professor.activo ? 'Desactivar' : 'Reactivar', tone: professor.activo ? 'danger' : 'default' },
    );
    if (!accepted) return;
    try {
      await api.patch(`/api/profesores/${professor.id}/estado`, { activo: !professor.activo });
      await load();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cambiar el estado.', { title: academyName });
    }
  };

  const resetPassword = async (professor: Professor) => {
    const accepted = await confirmAction(`Se generará una nueva contraseña temporal para ${professor.nombre_completo}.`, { title: academyName, confirmLabel: 'Generar clave' });
    if (!accepted) return;
    try {
      const response = await api.post(`/api/profesores/${professor.id}/reset-password`);
      setCredential({ email: professor.email, password: response.data.temporary_password, sent: response.data.email_sent });
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible restablecer la contraseña.', { title: academyName });
    }
  };

  const copyPassword = async () => {
    if (!credential) return;
    await navigator.clipboard.writeText(credential.password);
    await notify('Contraseña temporal copiada.', { title: academyName });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-[#48d8d0]">Equipo técnico</p>
          <h1 className="text-3xl font-black text-white">Profesores de {academyName}</h1>
          <p className="mt-2 text-sm text-[#8b949e]">Cada profesor ve solo sus categorías y puede pasar asistencia desde el terreno.</p>
        </div>
        <button type="button" onClick={openCreate} disabled={!payload?.cupos.remaining} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">+ Crear acceso</button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5"><p className="text-sm text-[#8b949e]">Plan actual</p><p className="mt-1 text-xl font-black text-white">{payload?.plan || '—'}</p></div>
        <div className="card p-5"><p className="text-sm text-[#8b949e]">Cupos utilizados</p><p className="mt-1 text-2xl font-black text-[#48d8d0]">{payload?.cupos.used || 0} / {payload?.cupos.max || 0}</p></div>
        <div className="card p-5"><p className="text-sm text-[#8b949e]">Categorías sin profesor</p><p className="mt-1 text-2xl font-black text-orange-300">{(payload?.categorias || []).filter((category) => !(payload?.data || []).some((professor) => professor.activo && professor.categorias.some((item) => item.id === category.id))).length}</p></div>
      </section>

      {loading ? <div className="card p-10 text-center text-[#8b949e]">Cargando equipo técnico...</div> : null}
      {!loading && !payload?.data.length ? (
        <div className="card border-dashed p-10 text-center"><div className="text-5xl">🧑‍🏫</div><h2 className="mt-4 text-xl font-black">Aún no hay profesores</h2><p className="mt-2 text-sm text-[#8b949e]">Crea el primer acceso y asígnale una categoría.</p></div>
      ) : null}
      <section className="grid gap-5 lg:grid-cols-2">
        {payload?.data.map((professor) => (
          <article key={professor.id} className={`card overflow-hidden ${professor.activo ? '' : 'opacity-65'}`}>
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#289E9D]/15 text-xl font-black text-[#48d8d0]">{professor.nombre_completo.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0"><h2 className="truncate text-lg font-black">{professor.nombre_completo}</h2><p className="truncate text-sm text-[#8b949e]">{professor.email}</p></div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${professor.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{professor.activo ? 'Activo' : 'Desactivado'}</span>
            </div>
            <div className="border-y border-[#30363d] bg-[#0d1117]/45 px-5 py-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8b949e]">Categorías asignadas</p>
              <div className="flex flex-wrap gap-2">{professor.categorias.length ? professor.categorias.map((category) => <span key={category.id} className="rounded-full border border-[#289E9D]/40 bg-[#289E9D]/10 px-3 py-1 text-sm text-[#67e8df]">{category.nombre}</span>) : <span className="text-sm text-orange-300">Sin categoría activa</span>}</div>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              <button type="button" onClick={() => openEdit(professor)} className="btn-secondary text-sm">Editar asignación</button>
              <button type="button" onClick={() => void resetPassword(professor)} className="btn-secondary text-sm">Nueva clave</button>
              <button type="button" onClick={() => void toggleStatus(professor)} className={`ml-auto text-sm ${professor.activo ? 'btn-danger' : 'btn-primary'}`}>{professor.activo ? 'Desactivar' : 'Reactivar'}</button>
            </div>
          </article>
        ))}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <form onSubmit={save} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#289E9D]/40 bg-[#161b22] p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between"><div><h2 className="text-2xl font-black">{editing ? 'Editar profesor' : 'Nuevo profesor'}</h2><p className="mt-1 text-sm text-[#8b949e]">El acceso quedará aislado al portal de terreno.</p></div><button type="button" onClick={() => setModalOpen(false)} className="text-2xl text-[#8b949e]">×</button></div>
            <div className="space-y-4">
              <label className="block"><span className="label">Nombre completo</span><input className="w-full" required minLength={3} value={form.nombre_completo} onChange={(event) => setForm({ ...form, nombre_completo: event.target.value })} /></label>
              <label className="block"><span className="label">Correo de acceso</span><input className="w-full disabled:opacity-50" type="email" required disabled={Boolean(editing)} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="block"><span className="label">Teléfono</span><input className="w-full" value={form.telefono} onChange={(event) => setForm({ ...form, telefono: event.target.value })} /></label>
              <fieldset><legend className="label">Categorías a cargo</legend><div className="grid gap-2 sm:grid-cols-2">{payload?.categorias.map((category) => {
                const occupied = occupiedByOthers.has(category.id);
                const selected = form.categoria_ids.includes(category.id);
                return <button key={category.id} type="button" disabled={occupied} onClick={() => toggleCategory(category.id)} className={`rounded-xl border p-3 text-left ${selected ? 'border-[#48d8d0] bg-[#289E9D]/15 text-white' : 'border-[#30363d] bg-[#0d1117] text-[#b1bac4]'} disabled:cursor-not-allowed disabled:opacity-35`}><span className="font-bold">{selected ? '✓ ' : ''}{category.nombre}</span>{occupied ? <span className="mt-1 block text-xs">Ya tiene profesor titular</span> : null}</button>;
              })}</div></fieldset>
            </div>
            <div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button><button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear acceso'}</button></div>
          </form>
        </div>
      ) : null}

      {credential ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl border border-[#48d8d0]/50 bg-[#161b22] p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#48d8d0]">Credencial temporal</p><h2 className="mt-2 text-2xl font-black">Acceso listo</h2>
            <p className="mt-3 text-sm text-[#b1bac4]">{credential.sent ? 'También enviamos estas instrucciones por correo.' : 'Compártela de forma segura. Solo se muestra en este momento.'}</p>
            <div className="mt-5 rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><p className="text-xs text-[#8b949e]">Correo</p><p className="break-all font-bold">{credential.email}</p><p className="mt-4 text-xs text-[#8b949e]">Contraseña temporal</p><p className="break-all font-mono text-xl font-black text-[#67e8df]">{credential.password}</p></div>
            <div className="mt-5 flex gap-3"><button type="button" onClick={() => void copyPassword()} className="btn-secondary flex-1">Copiar clave</button><button type="button" onClick={() => setCredential(null)} className="btn-primary flex-1">Entendido</button></div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default Profesores;
