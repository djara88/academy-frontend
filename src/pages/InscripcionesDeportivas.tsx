import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, BanknotesIcon, CheckCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { DIRECTOR_BUTTON, DIRECTOR_FIELD, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

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
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

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
  const enrollmentCount = (playersQuery.data || []).reduce((sum, item) => sum + item.inscripciones.filter((enrollment) => enrollment.estado === 'Activa').length, 0);

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

  return <div className="space-y-6">
    <section className="grid gap-3 sm:grid-cols-3">
      <DirectorStat label="Alumnos disponibles" value={(playersQuery.data || []).length} detail="Fichas reutilizables" />
      <DirectorStat label="Inscripciones activas" value={enrollmentCount} detail="En todas las disciplinas" tone="lime" />
      <DirectorStat label="Sedes activas" value={sites.length} detail="Disponibles para inscripción" tone="dark" />
    </section>

    {message ? <div className={`rounded-[16px] border p-4 text-sm font-bold ${mutation.isError ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#cde995] bg-[#f3fadf] text-[#4f6900]'}`}>{message}</div> : null}

    <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <DirectorPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#111711]"><UserPlusIcon className="h-6 w-6 text-[#b7ff00]"/></div><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso 1</p><h2 className="text-xl font-black text-[#111711]">Selecciona el alumno existente</h2></div></div>
        <select className={`${DIRECTOR_FIELD} mt-5`} value={form.jugador_id} onChange={(event) => choosePlayer(event.target.value)}><option value="">Seleccionar alumno</option>{(playersQuery.data || []).map((item) => <option key={item.id} value={item.id}>{item.nombre}{item.rut ? ` · ${item.rut}` : ''}</option>)}</select>
        {player ? <div className="mt-5 rounded-[18px] border border-[#e1e6df] bg-[#f8faf6] p-4"><div className="flex items-center gap-3">{player.foto_url || player.avatar_url ? <img src={player.foto_url || player.avatar_url || ''} alt="" className="h-12 w-12 rounded-[14px] object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#111711] font-black text-[#b7ff00]">{player.nombre.slice(0,1)}</div>}<div><p className="font-black text-[#111711]">{player.nombre}</p><p className="text-xs font-semibold text-[#697468]">{player.rut || 'Sin documento informado'}</p></div></div><p className="mt-4 text-[10px] font-black uppercase tracking-[.12em] text-[#7c867b]">Inscripciones activas</p><div className="mt-2 flex flex-wrap gap-2">{player.inscripciones.filter((item) => item.estado === 'Activa').length ? player.inscripciones.filter((item) => item.estado === 'Activa').map((enrollment) => <span key={enrollment.id} className="rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-1.5 text-xs font-black text-[#4f6900]">{enrollment.ramas?.disciplina || enrollment.ramas?.nombre}{enrollment.categorias?.nombre ? ` · ${enrollment.categorias.nombre}` : ''}</span>) : <span className="text-sm text-[#697468]">Sin inscripciones activas.</span>}</div></div> : <div className="mt-5 rounded-[18px] border border-dashed border-[#d9e0d6] p-8 text-center text-sm text-[#697468]">Selecciona una ficha existente. Si es un alumno nuevo, usa Matrícula.</div>}
      </DirectorPanel>

      <DirectorPanel className="p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#f3fadf]"><ArrowPathIcon className="h-6 w-6 text-[#617b00]"/></div><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso 2</p><h2 className="text-xl font-black text-[#111711]">Agrega otra disciplina</h2></div></div>
        {!player ? <div className="mt-5 rounded-[18px] border border-dashed border-[#d9e0d6] p-8 text-center text-sm text-[#697468]">Selecciona primero un alumno.</div> : <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Sede"><select className={DIRECTOR_FIELD} value={form.sede_id} onChange={(event) => chooseSite(event.target.value)}><option value="">Seleccionar sede</option>{sites.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></Field><Field label="Rama / disciplina"><select className={DIRECTOR_FIELD} value={form.rama_id} onChange={(event) => setForm((current) => ({ ...current, rama_id: event.target.value, categoria_id: '' }))}><option value="">Seleccionar rama</option>{branches.map((branch) => <option key={branch.id} value={branch.id} disabled={activeBranchIds.has(branch.id)}>{branch.disciplina} · {branch.nombre}{activeBranchIds.has(branch.id) ? ' · Ya inscrito' : ''}</option>)}</select></Field></div>
          <Field label="Categoría"><select className={DIRECTOR_FIELD} value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value }))}><option value="">Sin categoría por ahora</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></Field>
          <div className="border-t border-[#e5e9e2] pt-4"><div className="mb-3 flex items-center gap-2"><BanknotesIcon className="h-5 w-5 text-[#617b00]"/><p className="font-black text-[#111711]">Valores de esta disciplina</p></div><div className="grid gap-3 sm:grid-cols-3"><Field label="Matrícula"><input type="number" min="0" className={DIRECTOR_FIELD} value={form.monto_matricula} onChange={(event) => setForm((current) => ({ ...current, monto_matricula: event.target.value }))}/></Field><Field label="Abono"><input type="number" min="0" className={DIRECTOR_FIELD} value={form.abono_matricula} onChange={(event) => setForm((current) => ({ ...current, abono_matricula: event.target.value }))}/></Field><Field label="Mensualidad"><input type="number" min="0" className={DIRECTOR_FIELD} value={form.monto_mensualidad} onChange={(event) => setForm((current) => ({ ...current, monto_mensualidad: event.target.value }))}/></Field></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-[14px] border border-[#e1e6df] bg-[#f8faf6] p-3"><p className="text-xs font-semibold text-[#697468]">Saldo inicial</p><p className="mt-1 font-black text-[#111711]">{money(Math.max(0, Number(form.monto_matricula || 0)-Number(form.abono_matricula || 0)))}</p></div><div className="rounded-[14px] border border-[#cde995] bg-[#f3fadf] p-3"><p className="text-xs font-semibold text-[#566056]">Mensualidad adicional</p><p className="mt-1 font-black text-[#4f6900]">{money(form.monto_mensualidad)}</p></div></div></div>
          <button disabled={mutation.isPending || !form.rama_id} onClick={submit} className={`${DIRECTOR_BUTTON} w-full`}>{mutation.isPending ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <CheckCircleIcon className="h-5 w-5"/>}{mutation.isPending ? 'Creando inscripción...' : 'Inscribir en esta disciplina'}</button>
        </div>}
      </DirectorPanel>
    </section>

    <DirectorPanel className="p-5 sm:p-6"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Cómo funciona</p><div className="mt-4 grid gap-3 md:grid-cols-4">{['La ficha personal no se duplica','Cada disciplina tiene su mensualidad','Asistencia y evaluación conservan su rama','El apoderado mantiene una sola cuenta'].map((item,index)=><div key={item} className="rounded-[16px] border border-[#e1e6df] bg-[#f8faf6] p-4"><span className="text-xs font-black text-[#617b00]">0{index+1}</span><p className="mt-2 text-sm font-black text-[#111711]">{item}</p></div>)}</div></DirectorPanel>
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;}
