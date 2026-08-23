import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
const card = 'rounded-[24px] !border !border-[#d7dcd2] !bg-white shadow-[0_14px_34px_rgba(25,34,24,.05)]';
const field = 'w-full rounded-xl !border !border-[#cfd5ca] !bg-[#f4f6f1] px-3 py-2.5 text-sm !text-[#172018] outline-none placeholder:!text-[#929b8d] focus:!border-[#8fa83f] focus:!ring-2 focus:!ring-[#b9e937]/20';
const branchLabel = (category:Category) => `${category.ramas?.disciplina || 'Sin disciplina'} · ${category.ramas?.nombre || 'Rama pendiente'}`;

export default function ProfesoresMultirama() {
  const { user } = useAuth();
  const { notify, confirmAction } = useAppDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const fromSetup = new URLSearchParams(location.search).get('setup') === '1';
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
  const [setupModalHandled,setSetupModalHandled] = useState(false);

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

  useEffect(()=>{
    if(!fromSetup || setupModalHandled || loading || !payload) return;
    setSetupModalHandled(true);
    if(!payload.cupos.remaining) return;
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  },[fromSetup,setupModalHandled,loading,payload]);

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

  return <div className="mx-auto max-w-7xl space-y-6 pb-16 !text-[#172018]">
    {fromSetup?<button type="button" onClick={()=>navigate('/puesta-en-marcha')} className="inline-flex min-h-10 items-center gap-2 rounded-full !border !border-[#cfd5c7] !bg-white px-4 py-2 text-sm font-black !text-[#35402f] shadow-sm transition hover:!border-[#9bab85] hover:!bg-[#f6f8f1]"><span aria-hidden="true">←</span>Volver a Puesta en Marcha</button>:null}

    <section className="relative overflow-hidden rounded-[32px] !border !border-[#2b342a] !bg-[#151b16] p-6 shadow-[0_22px_55px_rgba(20,28,20,.16)] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full border-[34px] border-[#b9e937]/15"/>
      <div className="pointer-events-none absolute bottom-0 right-[22%] h-px w-72 -rotate-6 bg-[#b9e937]/35"/>
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.19em] !text-[#b9e937]">Equipo técnico multirrama</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight !text-white sm:text-4xl">Profesores de {academyName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 !text-[#c3cbc0]">Asigna a cada profesor las categorías que tendrá a cargo, incluso cuando trabaje en distintas ramas deportivas.</p>
        </div>
        <button type="button" disabled={!payload?.cupos.remaining} onClick={openCreate} className="min-h-12 rounded-2xl !border !border-[#b9e937] !bg-[#b9e937] px-6 text-sm font-black !text-[#11170f] shadow-[0_12px_28px_rgba(185,233,55,.2)] transition hover:!bg-[#c7f34a] disabled:cursor-not-allowed disabled:opacity-40">+ Crear profesor</button>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-4">
      <div className={`${card} p-5`}><p className="text-[10px] font-black uppercase tracking-[.15em] !text-[#7a8375]">Plan</p><p className="mt-2 text-lg font-black !text-[#172018]">{payload?.plan||'—'}</p></div>
      <div className={`${card} p-5`}><p className="text-[10px] font-black uppercase tracking-[.15em] !text-[#7a8375]">Profesores</p><p className="mt-2 text-2xl font-black !text-[#526b10]">{payload?.cupos.used||0} / {payload?.cupos.max||0}</p></div>
      <div className={`${card} p-5`}><p className="text-[10px] font-black uppercase tracking-[.15em] !text-[#7a8375]">Ramas con categorías</p><p className="mt-2 text-2xl font-black !text-[#172018]">{branches.length}</p></div>
      <label className={`${card} p-4`}><span className="text-[10px] font-black uppercase tracking-[.15em] !text-[#7a8375]">Filtrar rama</span><select value={branchFilter} onChange={(event)=>setBranchFilter(event.target.value)} className={`${field} mt-2`}><option value="Todas">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label>
    </section>

    {loading?<div className={`${card} p-10 text-center !text-[#6f786b]`}>Cargando equipo técnico...</div>:null}
    {!loading&&!visibleProfessors.length?<div className={`${card} !border-dashed p-10 text-center`}><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl !bg-[#edf7ce] text-2xl">+</div><h2 className="mt-4 text-xl font-black !text-[#172018]">Aún no hay profesores</h2><p className="mt-2 text-sm !text-[#737d70]">Crea un acceso y asigna las categorías que tendrá a cargo.</p><button type="button" disabled={!payload?.cupos.remaining} onClick={openCreate} className="mt-5 min-h-11 rounded-xl !bg-[#172018] px-5 text-sm font-black !text-white disabled:opacity-40">Crear primer profesor</button></div>:null}

    <section className="grid gap-5 lg:grid-cols-2">{visibleProfessors.map((professor)=><article key={professor.id} className={`${card} overflow-hidden ${professor.activo?'':'opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full !bg-[#edf7ce] font-black !text-[#4d6319]">{professor.nombre_completo.slice(0,1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-lg font-black !text-[#172018]">{professor.nombre_completo}</h2><p className="truncate text-sm !text-[#788174]">{professor.email}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${professor.activo?'!bg-[#e8f6d0] !text-[#3d6b1e]':'!bg-red-50 !text-red-700'}`}>{professor.activo?'Activo':'Desactivado'}</span></div>
      <div className="!border-y !border-[#e0e4dc] !bg-[#f6f8f3] p-5"><p className="mb-3 text-[10px] font-black uppercase tracking-[.15em] !text-[#7b8477]">Asignaciones por rama</p><div className="space-y-2">{professor.categorias.length?professor.categorias.map((category)=><div key={category.id} className="rounded-xl !border !border-[#dbe2d3] !bg-white px-3 py-2"><p className="text-xs font-black !text-[#526b10]">{branchLabel(category)}</p><p className="mt-0.5 text-sm font-bold !text-[#172018]">{category.nombre}<span className="font-normal !text-[#7a8375]"> · {category.sedes?.nombre||'Sede sin definir'}</span></p></div>):<span className="text-sm font-bold !text-[#93631a]">Sin categoría activa</span>}</div></div>
      <div className="flex flex-wrap gap-2 p-4"><button type="button" onClick={()=>openEdit(professor)} className="rounded-xl !border !border-[#d4d9cf] !bg-white px-3 py-2 text-xs font-black !text-[#263025] hover:!bg-[#f1f4ed]">Editar asignación</button><button type="button" onClick={()=>void resetPassword(professor)} className="rounded-xl !border !border-[#d4d9cf] !bg-white px-3 py-2 text-xs font-black !text-[#263025] hover:!bg-[#f1f4ed]">Nueva clave</button><button type="button" onClick={()=>void toggleStatus(professor)} className={`ml-auto rounded-xl px-3 py-2 text-xs font-black ${professor.activo?'!border !border-red-200 !bg-red-50 !text-red-700':'!bg-[#172018] !text-white'}`}>{professor.activo?'Desactivar':'Reactivar'}</button></div>
    </article>)}</section>

    <section className={`${card} p-5 sm:p-6`}><p className="text-xs font-black uppercase tracking-[.16em] !text-[#526b10]">Seguimiento técnico</p><h2 className="mt-1 text-xl font-black !text-[#172018]">Actividad reciente</h2>{!activity.length?<p className="mt-4 text-sm !text-[#788174]">Las bitácoras y preparaciones aparecerán aquí.</p>:<div className="mt-4 divide-y divide-[#e1e5dd]">{activity.map((item)=><article key={`${item.tipo}-${item.id}`} className="py-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${item.tipo==='Bitácora'?'!bg-[#edf7ce] !text-[#526b10]':'!bg-[#eef0eb] !text-[#455044]'}`}>{item.tipo}</span><span className="text-xs !text-[#889184]">{new Date(item.updated_at).toLocaleString('es-CL')}</span></div><p className="mt-2 font-black !text-[#172018]">{item.categorias?.nombre||'Categoría'}{item.tipo==='Preparación'?` · ${item.partidos?.rival||'competencia'}`:''}</p><p className="mt-1 text-sm !text-[#788174]">{item.usuarios?.nombre_completo||'Profesor'} · {item.entrenamientos?.fecha||item.partidos?.fecha||'Sin fecha'}</p>{item.objetivo?<p className="mt-2 text-sm !text-[#515c4f]">{item.objetivo}</p>:null}</article>)}</div>}</section>

    <DirectorProfessorCasesPanel />

    {modalOpen?<div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0c100d]/80 p-4 backdrop-blur-sm"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] !border !border-[#d8ddd3] !bg-[#f8f9f5] p-5 shadow-[0_30px_90px_rgba(0,0,0,.28)] sm:p-7"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] !text-[#526b10]">Permisos por categoría</p><h2 className="mt-1 text-2xl font-black !text-[#172018]">{editing?'Editar profesor':'Nuevo profesor'}</h2><p className="mt-1 text-sm !text-[#758071]">Completa los datos y selecciona las categorías que tendrá a cargo.</p></div><button type="button" onClick={()=>setModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full !bg-white text-2xl !text-[#5d675a] shadow-sm">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={field} required minLength={3} placeholder="Nombre completo" value={form.nombre_completo} onChange={(event)=>setForm({...form,nombre_completo:event.target.value})}/><input className={`${field} disabled:opacity-50`} type="email" required disabled={Boolean(editing)} placeholder="Correo" value={form.email} onChange={(event)=>setForm({...form,email:event.target.value})}/><input className={`${field} sm:col-span-2`} placeholder="Teléfono" value={form.telefono} onChange={(event)=>setForm({...form,telefono:event.target.value})}/></div><div className="mt-5 space-y-4">{groupedCategories.length?groupedCategories.map(([branchId,group])=><fieldset key={branchId} className="rounded-2xl !border !border-[#d9ded4] !bg-white p-4"><legend className="px-2 text-xs font-black uppercase tracking-[.13em] !text-[#526b10]">{group.label} · {group.site}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{group.categories.map((category)=>{const occupied=occupiedByOthers.has(category.id);const selected=form.categoria_ids.includes(category.id);return <label key={category.id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${selected?'!border-[#b9e937] !bg-[#f0f8d8]':'!border-[#dce1d7] !bg-[#fafbf8]'} ${occupied?'opacity-45':''}`}><input type="checkbox" disabled={occupied} checked={selected} onChange={()=>toggleCategory(category.id)} className="mt-1 accent-[#7f9f22]"/><span><span className="block text-sm font-black !text-[#172018]">{category.nombre}</span>{occupied?<span className="text-[10px] font-semibold !text-[#99611a]">Ya tiene profesor titular</span>:null}</span></label>})}</div></fieldset>):<div className="rounded-2xl !border !border-amber-200 !bg-amber-50 p-4 text-sm font-semibold !text-amber-800">Primero debes crear al menos una categoría antes de agregar profesores.</div>}</div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={()=>setModalOpen(false)} className="min-h-11 rounded-xl !border !border-[#d1d7cc] !bg-white px-4 py-2.5 text-sm font-black !text-[#35402f]">Cancelar</button><button disabled={saving||!groupedCategories.length} className="min-h-11 rounded-xl !border !border-[#b9e937] !bg-[#b9e937] px-5 py-2.5 text-sm font-black !text-[#11170f] shadow-[0_10px_24px_rgba(185,233,55,.18)] disabled:opacity-50">{saving?'Guardando...':'Guardar profesor'}</button></div></form></div>:null}

    {credential?<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"><div className="w-full max-w-md rounded-[26px] !border !border-[#344231] !bg-[#151b16] p-6 shadow-2xl"><p className="text-xs font-black uppercase tracking-[.16em] !text-[#b9e937]">Credencial temporal</p><h2 className="mt-2 text-xl font-black !text-white">Acceso listo</h2><p className="mt-2 text-sm !text-[#c0c8bd]">{credential.sent?'También enviamos estas credenciales por correo.':'Comparte la clave por un canal seguro.'}</p><div className="mt-4 rounded-xl !border !border-white/10 !bg-[#0e130f] p-4"><p className="text-xs !text-[#96a093]">Correo</p><p className="font-bold !text-white">{credential.email}</p><p className="mt-3 text-xs !text-[#96a093]">Contraseña temporal</p><code className="mt-1 block break-all text-lg font-black !text-[#b9e937]">{credential.password}</code></div><div className="mt-5 flex gap-2"><button type="button" onClick={async()=>{await navigator.clipboard.writeText(credential.password);await notify('Contraseña temporal copiada.',{title:academyName});}} className="flex-1 rounded-xl !border !border-white/15 !bg-transparent px-4 py-2.5 text-sm font-black !text-white">Copiar</button><button type="button" onClick={()=>setCredential(null)} className="flex-1 rounded-xl !bg-[#b9e937] px-4 py-2.5 text-sm font-black !text-[#11170f]">Cerrar</button></div></div></div>:null}
  </div>;
}
