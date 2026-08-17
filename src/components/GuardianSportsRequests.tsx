import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, CheckCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Enrollment = { id: string; rama_id: string; ramas?: { nombre?: string; disciplina?: string } | null; categorias?: { nombre?: string } | null };
type Player = { id: string; nombre: string; inscripciones: Enrollment[] };
type Category = { id: string; nombre: string };
type Branch = { id: string; sede_id: string; nombre: string; disciplina: string; categorias: Category[] };
type Site = { id: string; nombre: string; ramas: Branch[] };
type Request = { id: string; jugador_id: string; rama_id: string; estado: string; mensaje?: string | null; respuesta?: string | null; created_at: string; ramas?: { nombre?: string; disciplina?: string } | null; categorias?: { nombre?: string } | null };
type Payload = { jugadores: Player[]; estructura: Site[]; solicitudes: Request[] };

const field = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/60';

export default function GuardianSportsRequests() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ jugador_id: '', sede_id: '', rama_id: '', categoria_id: '', mensaje: '' });
  const [notice, setNotice] = useState('');
  const query = useQuery({ queryKey: ['guardian-sport-enrollments'], queryFn: async () => (await api.get('/api/apoderados/me/inscripciones-deportivas')).data.data as Payload });
  const data = query.data;
  const player = useMemo(() => data?.jugadores.find((item) => item.id === form.jugador_id) || null, [data, form.jugador_id]);
  const activeBranches = useMemo(() => new Set((player?.inscripciones || []).map((item) => item.rama_id)), [player]);
  const site = data?.estructura.find((item) => item.id === form.sede_id);
  const branches = (site?.ramas || []).filter((branch) => !activeBranches.has(branch.id));
  const branch = branches.find((item) => item.id === form.rama_id);

  const mutation = useMutation({
    mutationFn: async () => (await api.post('/api/apoderados/me/inscripciones-deportivas/solicitudes', { ...form, categoria_id: form.categoria_id || null })).data,
    onSuccess: async (response) => {
      setNotice(response.message || 'Solicitud enviada.');
      setForm({ jugador_id: '', sede_id: '', rama_id: '', categoria_id: '', mensaje: '' });
      await queryClient.invalidateQueries({ queryKey: ['guardian-sport-enrollments'] });
    },
    onError: (err: any) => setNotice(err.response?.data?.error || 'No fue posible enviar la solicitud.'),
  });

  if (query.isLoading) return <section className="rounded-3xl border border-white/10 bg-[#151b25] p-6 text-[#8995a4]">Cargando disciplinas...</section>;
  if (query.isError || !data) return null;

  return <section className="rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.13),transparent_35%),#151b25] p-5 sm:p-6">
    <div className="flex items-start gap-3"><PlusCircleIcon className="h-7 w-7 shrink-0 text-violet-300"/><div><h2 className="text-xl font-black text-white">Solicitar otra disciplina</h2><p className="mt-1 text-sm leading-6 text-[#9aa6b5]">Elige uno de tus alumnos y una disciplina disponible. La academia revisará la solicitud y definirá categoría, matrícula y mensualidad antes de activarla.</p></div></div>

    <div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold uppercase tracking-wider text-[#8995a4]">Alumno<select className={`${field} mt-2`} value={form.jugador_id} onChange={(e)=>setForm({ jugador_id:e.target.value,sede_id:'',rama_id:'',categoria_id:'',mensaje:form.mensaje })}><option value="">Seleccionar alumno</option>{data.jugadores.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-[#8995a4]">Sede<select className={`${field} mt-2`} value={form.sede_id} onChange={(e)=>setForm({...form,sede_id:e.target.value,rama_id:'',categoria_id:''})}><option value="">Seleccionar sede</option>{data.estructura.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-[#8995a4]">Disciplina<select className={`${field} mt-2`} value={form.rama_id} onChange={(e)=>setForm({...form,rama_id:e.target.value,categoria_id:''})}><option value="">Seleccionar disciplina</option>{branches.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-wider text-[#8995a4]">Categoría preferida<select className={`${field} mt-2`} value={form.categoria_id} onChange={(e)=>setForm({...form,categoria_id:e.target.value})}><option value="">Que la academia la defina</option>{(branch?.categorias || []).map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label></div>
    <textarea className={`${field} mt-3 min-h-24`} value={form.mensaje} onChange={(e)=>setForm({...form,mensaje:e.target.value})} placeholder="Comentario opcional: horarios, experiencia previa, etc."/>
    <button disabled={mutation.isPending || !form.jugador_id || !form.sede_id || !form.rama_id} onClick={()=>mutation.mutate()} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-xl bg-violet-500 px-5 font-black text-white disabled:opacity-40">{mutation.isPending?<ArrowPathIcon className="h-5 w-5 animate-spin"/>:<CheckCircleIcon className="h-5 w-5"/>}{mutation.isPending?'Enviando...':'Enviar solicitud'}</button>
    {notice ? <p className="mt-3 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-violet-100">{notice}</p> : null}

    <div className="mt-6 border-t border-white/10 pt-5"><p className="text-xs font-black uppercase tracking-wider text-[#8995a4]">Tus solicitudes recientes</p><div className="mt-3 space-y-2">{data.solicitudes.slice(0,6).map((request)=><div key={request.id} className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-white">{data.jugadores.find((item)=>item.id===request.jugador_id)?.nombre || 'Alumno'} · {request.ramas?.disciplina || request.ramas?.nombre}</p><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${request.estado==='aprobada'?'bg-emerald-500/15 text-emerald-300':request.estado==='rechazada'?'bg-red-500/15 text-red-300':'bg-amber-500/15 text-amber-300'}`}>{request.estado}</span></div>{request.respuesta?<p className="mt-2 text-xs text-[#aab4c1]">{request.respuesta}</p>:null}</div>)}{!data.solicitudes.length?<p className="text-sm text-[#697586]">Aún no has enviado solicitudes.</p>:null}</div></div>
  </section>;
}
