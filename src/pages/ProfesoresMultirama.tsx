import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import DirectorProfessorCasesPanel from '../components/profesor/DirectorProfessorCasesPanel';

type Category = {
  id: string;
  nombre: string;
  descripcion?: string | null;
  sede_id?: string | null;
  rama_id?: string | null;
  ramas?: { id:string; nombre:string; disciplina:string } | null;
  sedes?: { id:string; nombre:string } | null;
};
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
type FormState = { nombre_completo:string; email:string; telefono:string; categoria_ids:string[] };
type ProfessorActivity = {
  id:string; tipo:'Bitácora'|'Preparación'; updated_at:string; objetivo?:string; incidencias?:string; intensidad?:string;
  sistema_juego?:string; estado?:string; categorias?:{nombre:string}|null; usuarios?:{nombre_completo:string}|null;
  entrenamientos?:{fecha:string;hora?:string|null}|null; partidos?:{rival:string;fecha:string;hora?:string|null}|null;
};

const emptyForm:FormState = { nombre_completo:'', email:'', telefono:'', categoria_ids:[] };
const card = 'rounded-2xl border border-[#30363d] bg-[#161b22]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const branchLabel = (category:Category) => `${category.ramas?.disciplina || 'Sin disciplina'} · ${category.ramas?.nombre || 'Rama pendiente'}`;

export default function ProfesoresMultirama() {
  const { user } = useAuth();
  const { notify, confirmAction } = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);
  const [payload,setPayload] = useState<Payload|null>(null);
  const [activity,setActivity] = useState<ProfessorActivity[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [modalOpen,setModalOpen] = useState(false);
  const [editing,setEditing] = useState<Professor|null>(null);
  const [form,setForm] = useState<FormState>(emptyForm);
  const [credential,setCredential] = useState<{email:string;password:string;sent:boolean}|null>(null);
  const [branchFilter,setBranchFilter] = useState('Todas');

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [professorsResponse,activityResponse] = await Promise.all([
        api.get('/api/profesores'),
        api.get('/api/profesores/actividad'),
      ]);
      setPayload(professorsResponse.data);
      setActivity(activityResponse.data.data || []);
    } catch(error:any) {
      await notify(error.response?.data?.error || 'No fue posible cargar el equipo de profesores.', {title:academyName});
    } finally { setLoading(false); }
  },[academyName,notify]);

  useEffect(()=>{ void load(); },[load]);

  const branches = useMemo(()=>{
    const map = new Map<string,{id:string;label:string}>();
    for (const category of payload?.categorias || []) if (category.rama_id) map.set(category.rama_id,{id:category.rama_id,label:branchLabel(category)});
    return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'es'));
  },[payload]);

  const groupedCategories = useMemo(()=>{
    const groups = new Map<string,{label:string;site:string;categories:Category[]}>();
    for (const category of payload?.categorias || []) {
      const key = category.rama_id || 'sin-rama';
      const current = groups.get(key) || { label:branchLabel(category), site:category.sedes?.nombre || 'Sin sede', categories:[] };
      current.categories.push(category); groups.set(key,current);
    }
    return [...groups.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'es'));
  },[payload]);

  const occupiedByOthers = useMemo(()=>new Set(
    (payload?.data || []).filter((professor)=>professor.id!==editing?.id).flatMap((professor)=>professor.categorias.map((category)=>category.id)),
  ),[payload?.data,editing?.id]);

  const visibleProfessors = useMemo(()=>{
    if (branchFilter==='Todas') return payload?.data || [];
    return (payload?.data || []).filter((professor)=>professor.categorias.some((category)=>category.rama_id===branchFilter));
  },[payload?.data,branchFilter]);

  const openCreate = ()=>{ setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (professor:Professor)=>{
    setEditing(professor);
    setForm({nombre_completo:professor.nombre_completo,email:professor.email,telefono:professor.telefono||'',categoria_ids:professor.categorias.map((category)=>category.id)});
    setModalOpen(true);
  };
  const toggleCategory=(id:string)=>setForm((current)=>({...current,categoria_ids:current.categoria_ids.includes(id)?current.categoria_ids.filter((item)=>item!==id):[...current.categoria_ids,id]}));

  const save=async(event:FormEvent)=>{
    event.preventDefault();
    if(!form.categoria_ids.length) return void notify('Selecciona al menos una categoría de una rama.',{title:academyName});
    setSaving(true);
    try {
      if(editing) {
        await api.put(`/api/profesores/${editing.id}`,form);
        await notify('Profesor y categorías por rama actualizados.',{title:academyName});
      } else {
        const response=await api.post('/api/profesores',form);
        setCredential({email:form.email,password:response.data.temporary_password,sent:response.data.email_sent});
      }
      setModalOpen(false); await load();
    } catch(error:any) {
      await notify(error.response?.data?.error||'No fue posible guardar al profesor.',{title:academyName});
    } finally { setSaving(false); }
  };

  const toggleStatus=async(professor:Professor)=>{
    const accepted=await confirmAction(professor.activo?`Se cerrará el acceso de ${professor.nombre_completo}.`:`Se reactivará el acceso de ${professor.nombre_completo}.`,{title:academyName,confirmLabel:professor.activo?'Desactivar':'Reactivar',tone:professor.activo?'danger':'default'});
    if(!accepted)return;
    try { await api.patch(`/api/profesores/${professor.id}/estado`,{activo:!professor.activo}); await load(); }
    catch(error:any){ await notify(error.response?.data?.error||'No fue posible cambiar el estado.',{title:academyName}); }
  };
  const resetPassword=async(professor:Professor)=>{
    const accepted=await confirmAction(`Se generará una nueva contraseña temporal para ${professor.nombre_completo}.`,{title:academyName,confirmLabel:'Generar clave'});
    if(!accepted)return;
    try { const response=await api.post(`/api/profesores/${professor.id}/reset-password`); setCredential({email:professor.email,password:response.data.temporary_password,sent:response.data.email_sent}); }
    catch(error:any){ await notify(error.response?.data?.error||'No fue posible restablecer la contraseña.',{title:academyName}); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.17),transparent_36%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Equipo técnico multirrama</p><h1 className="mt-2 text-3xl font-black text-white">Profesores de {academyName}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Un profesor puede trabajar en una o varias ramas. El permiso se asigna a categorías concretas, por lo que fútbol, karate, básquetbol u otra disciplina quedan separados sin crear usuarios duplicados.</p></div><button disabled={!payload?.cupos.remaining} onClick={openCreate} className="min-h-11 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white disabled:opacity-40">+ Crear acceso</button></div>
    </section>

    <section className="grid gap-3 md:grid-cols-4">
      <div className={`${card} p-4`}><p className="text-xs uppercase text-[#697586]">Plan</p><p className="mt-1 font-black text-white">{payload?.plan||'—'}</p></div>
      <div className={`${card} p-4`}><p className="text-xs uppercase text-[#697586]">Profesores</p><p className="mt-1 text-xl font-black text-[#70e4df]">{payload?.cupos.used||0} / {payload?.cupos.max||0}</p></div>
      <div className={`${card} p-4`}><p className="text-xs uppercase text-[#697586]">Ramas con categorías</p><p className="mt-1 text-xl font-black text-violet-300">{branches.length}</p></div>
      <label className={`${card} p-3`}><span className="text-[10px] font-black uppercase text-[#697586]">Filtrar rama</span><select value={branchFilter} onChange={(event)=>setBranchFilter(event.target.value)} className={`${field} mt-1 py-2`}><option value="Todas">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label>
    </section>

    {loading?<div className={`${card} p-10 text-center text-[#8b949e]`}>Cargando equipo técnico...</div>:null}
    {!loading&&!visibleProfessors.length?<div className={`${card} border-dashed p-10 text-center text-[#8b949e]`}>No hay profesores para el filtro seleccionado.</div>:null}

    <section className="grid gap-5 lg:grid-cols-2">{visibleProfessors.map((professor)=><article key={professor.id} className={`${card} overflow-hidden ${professor.activo?'':'opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#289E9D]/15 font-black text-[#70e4df]">{professor.nombre_completo.slice(0,1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-lg font-black text-white">{professor.nombre_completo}</h2><p className="truncate text-sm text-[#8b949e]">{professor.email}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${professor.activo?'bg-emerald-500/15 text-emerald-300':'bg-red-500/15 text-red-300'}`}>{professor.activo?'Activo':'Desactivado'}</span></div>
      <div className="border-y border-[#30363d] bg-[#0d1117]/45 p-5"><p className="mb-3 text-[10px] font-black uppercase tracking-[.15em] text-[#697586]">Asignaciones por rama</p><div className="space-y-2">{professor.categorias.length?professor.categorias.map((category)=><div key={category.id} className="rounded-xl border border-white/10 bg-[#151b25] px-3 py-2"><p className="text-xs font-black text-[#70e4df]">{branchLabel(category)}</p><p className="mt-0.5 text-sm font-bold text-white">{category.nombre}<span className="font-normal text-[#697586]"> · {category.sedes?.nombre||'Sede sin definir'}</span></p></div>):<span className="text-sm text-orange-300">Sin categoría activa</span>}</div></div>
      <div className="flex flex-wrap gap-2 p-4"><button onClick={()=>openEdit(professor)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#c3ccd6]">Editar asignación</button><button onClick={()=>void resetPassword(professor)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#c3ccd6]">Nueva clave</button><button onClick={()=>void toggleStatus(professor)} className={`ml-auto rounded-xl px-3 py-2 text-xs font-black ${professor.activo?'border border-red-400/20 text-red-300':'bg-[#289E9D] text-white'}`}>{professor.activo?'Desactivar':'Reactivar'}</button></div>
    </article>)}</section>

    <section className={`${card} p-5 sm:p-6`}><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Seguimiento técnico</p><h2 className="mt-1 text-xl font-black text-white">Actividad reciente</h2>{!activity.length?<p className="mt-4 text-sm text-[#8b949e]">Las bitácoras y preparaciones aparecerán aquí.</p>:<div className="mt-4 divide-y divide-[#30363d]">{activity.map((item)=><article key={`${item.tipo}-${item.id}`} className="py-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.tipo==='Bitácora'?'bg-[#289E9D]/15 text-[#70e4df]':'bg-orange-500/15 text-orange-300'}`}>{item.tipo}</span><span className="text-xs text-[#697586]">{new Date(item.updated_at).toLocaleString('es-CL')}</span></div><p className="mt-2 font-black text-white">{item.categorias?.nombre||'Categoría'}{item.tipo==='Preparación'?` · ${item.partidos?.rival||'competencia'}`:''}</p><p className="mt-1 text-sm text-[#8b949e]">{item.usuarios?.nombre_completo||'Profesor'} · {item.entrenamientos?.fecha||item.partidos?.fecha||'Sin fecha'}</p>{item.objetivo?<p className="mt-2 text-sm text-[#b1bac4]">{item.objetivo}</p>:null}</article>)}</div>}</section>

    <DirectorProfessorCasesPanel />

    {modalOpen?<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-white/10 bg-[#151b25] p-5 sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-[#70e4df]">Permisos por categoría</p><h2 className="mt-1 text-2xl font-black text-white">{editing?'Editar profesor':'Nuevo profesor'}</h2></div><button type="button" onClick={()=>setModalOpen(false)} className="text-2xl text-[#8995a4]">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={field} required minLength={3} placeholder="Nombre completo" value={form.nombre_completo} onChange={(event)=>setForm({...form,nombre_completo:event.target.value})}/><input className={`${field} disabled:opacity-50`} type="email" required disabled={Boolean(editing)} placeholder="Correo" value={form.email} onChange={(event)=>setForm({...form,email:event.target.value})}/><input className={`${field} sm:col-span-2`} placeholder="Teléfono" value={form.telefono} onChange={(event)=>setForm({...form,telefono:event.target.value})}/></div><div className="mt-5 space-y-4">{groupedCategories.map(([branchId,group])=><fieldset key={branchId} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><legend className="px-2 text-xs font-black uppercase tracking-[.13em] text-violet-300">{group.label} · {group.site}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{group.categories.map((category)=>{const occupied=occupiedByOthers.has(category.id);const selected=form.categoria_ids.includes(category.id);return <label key={category.id} className={`flex items-start gap-3 rounded-xl border p-3 ${selected?'border-[#289E9D]/50 bg-[#289E9D]/10':'border-white/10'} ${occupied?'opacity-45':''}`}><input type="checkbox" disabled={occupied} checked={selected} onChange={()=>toggleCategory(category.id)} className="mt-1 accent-[#289E9D]"/><span><span className="block text-sm font-black text-white">{category.nombre}</span>{occupied?<span className="text-[10px] text-orange-300">Ya tiene profesor titular</span>:null}</span></label>})}</div></fieldset>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setModalOpen(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#c3ccd6]">Cancelar</button><button disabled={saving} className="rounded-xl bg-[#289E9D] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving?'Guardando...':'Guardar profesor'}</button></div></form></div>:null}

    {credential?<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-md rounded-2xl border border-[#289E9D]/40 bg-[#161b22] p-6"><h2 className="text-xl font-black text-white">Acceso temporal</h2><p className="mt-2 text-sm text-[#8b949e]">{credential.sent?'También enviamos estas credenciales por correo.':'Comparte la clave por un canal seguro.'}</p><div className="mt-4 rounded-xl bg-[#0d1117] p-4"><p className="text-xs text-[#697586]">Correo</p><p className="font-bold text-white">{credential.email}</p><p className="mt-3 text-xs text-[#697586]">Contraseña temporal</p><code className="mt-1 block break-all text-lg font-black text-[#70e4df]">{credential.password}</code></div><div className="mt-5 flex gap-2"><button onClick={async()=>{await navigator.clipboard.writeText(credential.password);await notify('Contraseña temporal copiada.',{title:academyName});}} className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black">Copiar</button><button onClick={()=>setCredential(null)} className="flex-1 rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black">Cerrar</button></div></div></div>:null}
  </div>;
}
