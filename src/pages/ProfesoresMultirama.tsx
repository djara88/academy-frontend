import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import DirectorProfessorCasesPanel from '../components/profesor/DirectorProfessorCasesPanel';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

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
const branchLabel = (category:Category) => `${category.ramas?.disciplina || 'Sin disciplina'} · ${category.ramas?.nombre || 'Rama pendiente'}`;
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]';

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
      current.categories.push(category);
      groups.set(key,current);
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
      setModalOpen(false);
      await load();
    } catch(error:any) {
      await notify(error.response?.data?.error||'No fue posible guardar al profesor.',{title:academyName});
    } finally { setSaving(false); }
  };

  const toggleStatus=async(professor:Professor)=>{
    const accepted=await confirmAction(professor.activo?`Se cerrará el acceso de ${professor.nombre_completo}.`:`Se reactivará el acceso de ${professor.nombre_completo}.`,{title:academyName,confirmLabel:professor.activo?'Desactivar':'Reactivar',tone:professor.activo?'danger':'default'});
    if(!accepted)return;
    try {
      await api.patch(`/api/profesores/${professor.id}/estado`,{activo:!professor.activo});
      await load();
    } catch(error:any){
      await notify(error.response?.data?.error||'No fue posible cambiar el estado.',{title:academyName});
    }
  };

  const resetPassword=async(professor:Professor)=>{
    const accepted=await confirmAction(`Se generará una nueva contraseña temporal para ${professor.nombre_completo}.`,{title:academyName,confirmLabel:'Generar clave'});
    if(!accepted)return;
    try {
      const response=await api.post(`/api/profesores/${professor.id}/reset-password`);
      setCredential({email:professor.email,password:response.data.temporary_password,sent:response.data.email_sent});
    } catch(error:any){
      await notify(error.response?.data?.error||'No fue posible restablecer la contraseña.',{title:academyName});
    }
  };

  return <DirectorPage>
    {fromSetup?<button type="button" onClick={()=>navigate('/puesta-en-marcha')} className={DIRECTOR_BUTTON_GHOST}>← Volver a Puesta en Marcha</button>:null}

    <DirectorHero
      eyebrow="Equipo técnico"
      title="Profesores"
      description={`Administra quién tiene acceso y qué categorías puede gestionar en ${academyName}.`}
      actions={<button type="button" disabled={!payload?.cupos.remaining} onClick={openCreate} className={DIRECTOR_BUTTON}>+ Crear profesor</button>}
    />

    <section className="grid gap-3 md:grid-cols-[1fr_1fr_minmax(260px,1.2fr)]">
      <DirectorStat label="Cupos utilizados" value={`${payload?.cupos.used||0} / ${payload?.cupos.max||0}`} detail={`Plan ${payload?.plan||'—'}`} tone="lime" />
      <DirectorStat label="Ramas con categorías" value={branches.length} detail="Disponibles para asignación" />
      <DirectorPanel className="p-4"><label><span className={labelClass}>Filtrar por rama</span><select value={branchFilter} onChange={(event)=>setBranchFilter(event.target.value)} className={DIRECTOR_FIELD}><option value="Todas">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label></DirectorPanel>
    </section>

    {loading?<DirectorPanel className="p-10 text-center text-sm font-semibold text-[#697468]">Cargando equipo técnico…</DirectorPanel>:null}
    {!loading&&!visibleProfessors.length?<DirectorPanel className="border-dashed p-10 text-center"><h2 className="text-xl font-black text-[#111711]">Aún no hay profesores</h2><p className="mt-2 text-sm text-[#697468]">Crea un acceso y asigna las categorías que tendrá a cargo.</p><button type="button" disabled={!payload?.cupos.remaining} onClick={openCreate} className={`${DIRECTOR_BUTTON} mt-5`}>Crear primer profesor</button></DirectorPanel>:null}

    <section className="grid gap-4 lg:grid-cols-2">{visibleProfessors.map((professor)=><DirectorPanel key={professor.id} className={`overflow-hidden ${professor.activo?'':'opacity-60'}`}>
      <div className="flex items-start justify-between gap-4 p-5"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#d6e5a8] bg-[#f0f7dc] font-black text-[#607900]">{professor.nombre_completo.slice(0,1).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-base font-black text-[#111711]">{professor.nombre_completo}</h2><p className="truncate text-sm text-[#697468]">{professor.email}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${professor.activo?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{professor.activo?'Activo':'Desactivado'}</span></div>
      <div className="border-y border-[#e2e7df] bg-[#fafbf9] p-4"><p className="mb-2 text-[10px] font-black uppercase tracking-[.12em] text-[#748073]">Categorías a cargo</p><div className="grid gap-2">{professor.categorias.length?professor.categorias.map((category)=><div key={category.id} className="rounded-xl border border-[#dfe5dc] bg-white px-3 py-2"><p className="text-[10px] font-black uppercase text-[#6d8700]">{branchLabel(category)}</p><p className="mt-0.5 text-sm font-bold text-[#111711]">{category.nombre}<span className="font-normal text-[#697468]"> · {category.sedes?.nombre||'Sede sin definir'}</span></p></div>):<span className="text-sm font-bold text-amber-800">Sin categoría activa</span>}</div></div>
      <div className="flex flex-wrap gap-2 p-4"><button type="button" onClick={()=>openEdit(professor)} className={DIRECTOR_BUTTON_GHOST}>Editar asignación</button><button type="button" onClick={()=>void resetPassword(professor)} className={DIRECTOR_BUTTON_GHOST}>Nueva clave</button><button type="button" onClick={()=>void toggleStatus(professor)} className={professor.activo?'ml-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-800 transition hover:bg-rose-50':`${DIRECTOR_BUTTON_DARK} ml-auto`}>{professor.activo?'Desactivar':'Reactivar'}</button></div>
    </DirectorPanel>)}</section>

    <DirectorPanel className="p-5 sm:p-6"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#6d8700]">Seguimiento técnico</p><h2 className="mt-1 text-xl font-black text-[#111711]">Actividad reciente</h2>{!activity.length?<p className="mt-4 text-sm text-[#697468]">Las bitácoras y preparaciones aparecerán aquí.</p>:<div className="mt-4 divide-y divide-[#e1e5dd]">{activity.slice(0,8).map((item)=><article key={`${item.tipo}-${item.id}`} className="py-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#dce2d8] bg-[#f4f7f1] px-2.5 py-1 text-[10px] font-black text-[#596456]">{item.tipo}</span><span className="text-[11px] text-[#7a8478]">{new Date(item.updated_at).toLocaleString('es-CL')}</span></div><p className="mt-2 text-sm font-black text-[#111711]">{item.categorias?.nombre||'Categoría'}{item.tipo==='Preparación'?` · ${item.partidos?.rival||'competencia'}`:''}</p><p className="mt-1 text-xs text-[#697468]">{item.usuarios?.nombre_completo||'Profesor'} · {item.entrenamientos?.fecha||item.partidos?.fecha||'Sin fecha'}</p>{item.objetivo?<p className="mt-1 text-sm text-[#596456]">{item.objetivo}</p>:null}</article>)}</div>}</DirectorPanel>

    <DirectorProfessorCasesPanel />

    {modalOpen?<div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#0b100c]/55 p-4"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,.22)] sm:p-7" role="dialog" aria-modal="true" aria-label={editing?'Editar profesor':'Nuevo profesor'}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#6d8700]">Permisos por categoría</p><h2 className="mt-1 text-2xl font-black text-[#111711]">{editing?'Editar profesor':'Nuevo profesor'}</h2><p className="mt-1 text-sm text-[#697468]">Completa los datos y selecciona las categorías que tendrá a cargo.</p></div><button type="button" onClick={()=>setModalOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-[#d7ded4] bg-white text-xl text-[#596456]">×</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><input className={DIRECTOR_FIELD} required minLength={3} placeholder="Nombre completo" value={form.nombre_completo} onChange={(event)=>setForm({...form,nombre_completo:event.target.value})}/><input className={`${DIRECTOR_FIELD} disabled:opacity-50`} type="email" required disabled={Boolean(editing)} placeholder="Correo" value={form.email} onChange={(event)=>setForm({...form,email:event.target.value})}/><input className={`${DIRECTOR_FIELD} sm:col-span-2`} placeholder="Teléfono" value={form.telefono} onChange={(event)=>setForm({...form,telefono:event.target.value})}/></div><div className="mt-5 space-y-3">{groupedCategories.length?groupedCategories.map(([branchId,group])=><fieldset key={branchId} className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4"><legend className="px-2 text-[10px] font-black uppercase tracking-[.12em] text-[#6d8700]">{group.label} · {group.site}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{group.categories.map((category)=>{const occupied=occupiedByOthers.has(category.id);const selected=form.categoria_ids.includes(category.id);return <label key={category.id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${selected?'border-[#9bc900] bg-[#f3fadf]':'border-[#dfe5dc] bg-white'} ${occupied?'opacity-45':''}`}><input type="checkbox" disabled={occupied} checked={selected} onChange={()=>toggleCategory(category.id)} className="mt-1 accent-[#8eb700]"/><span><span className="block text-sm font-black text-[#111711]">{category.nombre}</span>{occupied?<span className="text-[10px] font-semibold text-amber-800">Ya tiene profesor titular</span>:null}</span></label>})}</div></fieldset>):<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Primero debes crear al menos una categoría antes de agregar profesores.</div>}</div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={()=>setModalOpen(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button disabled={saving||!groupedCategories.length} className={DIRECTOR_BUTTON}>{saving?'Guardando…':'Guardar profesor'}</button></div></form></div>:null}

    {credential?<div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b100c]/55 p-4"><div className="w-full max-w-md rounded-[26px] border border-[#d9e0d6] bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Credencial temporal"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#6d8700]">Credencial temporal</p><h2 className="mt-2 text-xl font-black text-[#111711]">Acceso listo</h2><p className="mt-2 text-sm text-[#697468]">{credential.sent?'También enviamos estas credenciales por correo.':'Comparte la clave por un canal seguro.'}</p><div className="mt-4 rounded-xl border border-[#dfe5dc] bg-[#fafbf9] p-4"><p className="text-xs text-[#697468]">Correo</p><p className="font-bold text-[#111711]">{credential.email}</p><p className="mt-3 text-xs text-[#697468]">Contraseña temporal</p><code className="mt-1 block break-all text-lg font-black text-[#607900]">{credential.password}</code></div><div className="mt-5 flex gap-2"><button type="button" onClick={async()=>{await navigator.clipboard.writeText(credential.password);await notify('Contraseña temporal copiada.',{title:academyName});}} className={`${DIRECTOR_BUTTON_GHOST} flex-1`}>Copiar</button><button type="button" onClick={()=>setCredential(null)} className={`${DIRECTOR_BUTTON} flex-1`}>Cerrar</button></div></div></div>:null}
  </DirectorPage>;
}