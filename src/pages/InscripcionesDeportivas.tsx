import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, BanknotesIcon, CheckCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Enrollment = {
  id: string;
  jugador_id: string;
  sede_id: string;
  rama_id: string;
  categoria_id?: string | null;
  estado: string;
  monto_mensualidad: number;
  ramas?: { nombre?: string; disciplina?: string } | null;
  sedes?: { nombre?: string } | null;
  categorias?: { nombre?: string } | null;
};
type Player = { id: string; nombre: string; rut?: string | null; fecha_nacimiento?: string | null; foto_url?: string | null; avatar_url?: string | null; inscripciones: Enrollment[] };
type Branch = { id: string; sede_id: string; nombre: string; disciplina: string; activa: boolean; principal: boolean };
type Site = { id: string; nombre: string; activa: boolean; principal: boolean; ramas: Branch[] };
type Category = { id: string; nombre: string; sede_id?: string | null; rama_id?: string | null };

const money = (value: number | string) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const input = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-[#289E9D]';

export default function InscripcionesDeportivas() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ jugador_id: '', sede_id: '', rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' });
  const [message, setMessage] = useState('');

  const playersQuery = useQuery({ queryKey: ['sport-enrollment-players'], queryFn: async () => (await api.get('/api/inscripciones/alumnos')).data.data as Player[] });
  const structureQuery = useQuery({ queryKey: ['sport-enrollment-structure'], queryFn: async () => (await api.get('/api/estructura')).data.data as Site[] });
  const categoriesQuery = useQuery({ queryKey: ['sport-enrollment-categories'], queryFn: async () => (await api.get('/api/jugadores/categorias')).data.data as Category[] });

  const player = useMemo(() => (playersQuery.data || []).find((item) => item.id === form.jugador_id) || null, [playersQuery.data, form.jugador_id]);
  const activeBranchIds = useMemo(() => new Set((player?.inscripciones || []).filter((item) => item.estado === 'Activa').map((item) => item.rama_id)), [player]);
  const sites = (structureQuery.data || []).filter((site) => site.activa);
  const site = sites.find((item) => item.id === form.sede_id);
  const branches = (site?.ramas || []).filter((branch) => branch.activa);
  const categories = (categoriesQuery.data || []).filter((category) => category.rama_id === form.rama_id);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/api/inscripciones', {
      ...form,
      categoria_id: form.categoria_id || null,
      monto_matricula: Number(form.monto_matricula || 0),
      abono_matricula: Number(form.abono_matricula || 0),
      monto_mensualidad: Number(form.monto_mensualidad || 0),
    })).data.data,
    onSuccess: async (data) => {
      setMessage(`${data.jugador?.nombre || 'Alumno'} quedó inscrito en ${data.rama?.disciplina || 'la nueva disciplina'}. Se crearon ${data.cobros_creados || 0} cobros asociados a esta inscripción.`);
      setForm((current) => ({ ...current, rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' }));
      await queryClient.invalidateQueries({ queryKey: ['sport-enrollment-players'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-resumen'] });
    },
    onError: (error: any) => setMessage(error?.response?.data?.error || 'No fue posible crear la inscripción deportiva.'),
  });

  const choosePlayer = (jugador_id: string) => {
    setMessage('');
    setForm({ jugador_id, sede_id: '', rama_id: '', categoria_id: '', monto_matricula: '', abono_matricula: '', monto_mensualidad: '' });
  };
  const chooseSite = (sede_id: string) => {
    const selected = sites.find((item) => item.id === sede_id);
    const firstAvailable = selected?.ramas.find((branch) => branch.activa && !activeBranchIds.has(branch.id));
    setForm((current) => ({ ...current, sede_id, rama_id: firstAvailable?.id || '', categoria_id: '' }));
  };
  const submit = () => {
    setMessage('');
    if (!form.jugador_id || !form.sede_id || !form.rama_id) return setMessage('Selecciona alumno, sede y una rama deportiva nueva.');
    if (activeBranchIds.has(form.rama_id)) return setMessage('Ese alumno ya tiene una inscripción activa en la rama seleccionada.');
    mutation.mutate();
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-[30px] border border-[#289E9D]/30 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.2),transparent_38%),linear-gradient(135deg,#172530,#101620)] p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Multideporte real</p><h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Un alumno. Varias disciplinas.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#9aa6b5]">Reutiliza la ficha del alumno y su apoderado. Cada inscripción conserva sede, rama, categoría, matrícula y mensualidad propias, sin duplicar a la persona.</p></div>
        <a href="/matricula" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white hover:border-[#289E9D]/50">¿Es un alumno nuevo? Ir a matrícula →</a>
      </div>
    </section>

    {message ? <div className={`rounded-2xl border p-4 text-sm font-bold ${mutation.isError ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-[#289E9D]/30 bg-[#289E9D]/10 text-[#b8fffb]'}`}>{message}</div> : null}

    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
        <div className="flex items-center gap-3"><UserPlusIcon className="h-7 w-7 text-[#70e4df]"/><div><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Paso 1</p><h2 className="text-xl font-black text-white">Selecciona el alumno existente</h2></div></div>
        <select className={`${input} mt-5`} value={form.jugador_id} onChange={(e) => choosePlayer(e.target.value)}><option value="">Seleccionar alumno</option>{(playersQuery.data || []).map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.rut ? ` · ${item.rut}` : ''}</option>)}</select>
        {player ? <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-center gap-3">{player.foto_url || player.avatar_url ? <img src={player.foto_url || player.avatar_url || ''} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#289E9D]/15 font-black text-[#70e4df]">{player.nombre.slice(0,1)}</div>}<div><p className="font-black text-white">{player.nombre}</p><p className="text-xs text-[#8995a4]">{player.rut || 'Sin documento informado'}</p></div></div><p className="mt-4 text-xs font-black uppercase tracking-wider text-[#8995a4]">Inscripciones activas</p><div className="mt-2 flex flex-wrap gap-2">{player.inscripciones.length ? player.inscripciones.map((enrollment) => <span key={enrollment.id} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200">{enrollment.ramas?.disciplina || enrollment.ramas?.nombre}{enrollment.categorias?.nombre ? ` · ${enrollment.categorias.nombre}` : ''}</span>) : <span className="text-sm text-[#697586]">Sin inscripciones registradas.</span>}</div></div> : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
        <div className="flex items-center gap-3"><ArrowPathIcon className="h-7 w-7 text-violet-300"/><div><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Paso 2</p><h2 className="text-xl font-black text-white">Agrega otra disciplina</h2></div></div>
        {!player ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-[#8995a4]">Selecciona primero un alumno.</div> : <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold uppercase text-[#8995a4]">Sede<select className={`${input} mt-2`} value={form.sede_id} onChange={(e) => chooseSite(e.target.value)}><option value="">Seleccionar sede</option>{sites.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className="text-xs font-bold uppercase text-[#8995a4]">Rama / disciplina<select className={`${input} mt-2`} value={form.rama_id} onChange={(e) => setForm((current) => ({ ...current, rama_id: e.target.value, categoria_id: '' }))}><option value="">Seleccionar rama</option>{branches.map((branch) => <option key={branch.id} value={branch.id} disabled={activeBranchIds.has(branch.id)}>{branch.disciplina} · {branch.nombre}{activeBranchIds.has(branch.id) ? ' · Ya inscrito' : ''}</option>)}</select></label></div>
          <label className="block text-xs font-bold uppercase text-[#8995a4]">Categoría<select className={`${input} mt-2`} value={form.categoria_id} onChange={(e) => setForm((current) => ({ ...current, categoria_id: e.target.value }))}><option value="">Sin categoría por ahora</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
          <div className="border-t border-white/10 pt-4"><div className="mb-3 flex items-center gap-2"><BanknotesIcon className="h-5 w-5 text-emerald-300"/><p className="font-black text-white">Valores de esta disciplina</p></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs text-[#8995a4]">Matrícula<input type="number" min="0" className={`${input} mt-2`} value={form.monto_matricula} onChange={(e) => setForm((current) => ({ ...current, monto_matricula: e.target.value }))}/></label><label className="text-xs text-[#8995a4]">Abono<input type="number" min="0" className={`${input} mt-2`} value={form.abono_matricula} onChange={(e) => setForm((current) => ({ ...current, abono_matricula: e.target.value }))}/></label><label className="text-xs text-[#8995a4]">Mensualidad<input type="number" min="0" className={`${input} mt-2`} value={form.monto_mensualidad} onChange={(e) => setForm((current) => ({ ...current, monto_mensualidad: e.target.value }))}/></label></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-xs text-[#8995a4]">Saldo inicial</p><p className="mt-1 font-black text-white">{money(Math.max(0, Number(form.monto_matricula || 0)-Number(form.abono_matricula || 0)))}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-xs text-[#8995a4]">Mensualidad adicional</p><p className="mt-1 font-black text-emerald-300">{money(form.monto_mensualidad)}</p></div></div></div>
          <button disabled={mutation.isPending || !form.rama_id} onClick={submit} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#289E9D] px-5 font-black text-white disabled:opacity-40">{mutation.isPending ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <CheckCircleIcon className="h-5 w-5"/>}{mutation.isPending ? 'Creando inscripción...' : 'Inscribir en esta disciplina'}</button>
        </div>}
      </div>
    </section>

    <section className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Cómo funciona</p><div className="mt-4 grid gap-3 md:grid-cols-4">{['La ficha personal no se duplica','Cada disciplina tiene su mensualidad','Asistencia y evaluación conservan su rama','El apoderado mantiene una sola cuenta'].map((item,index)=><div key={item} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><span className="text-xs font-black text-[#70e4df]">0{index+1}</span><p className="mt-2 text-sm font-bold text-white">{item}</p></div>)}</div></section>
  </div>;
}
