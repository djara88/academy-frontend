import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { BuildingOffice2Icon, PlusIcon, MapPinIcon, TrophyIcon } from '@heroicons/react/24/outline';

type Branch = { id:string; sede_id:string; nombre:string; disciplina:string; descripcion?:string|null; activa:boolean; principal:boolean };
type Site = { id:string; nombre:string; codigo?:string|null; direccion?:string|null; ciudad?:string|null; comuna?:string|null; region?:string|null; pais?:string|null; telefono?:string|null; ubicacion_entrenamiento?:string|null; dias_entrenamiento?:string|null; horarios_entrenamiento?:string|null; activa:boolean; principal:boolean; ramas:Branch[] };

const input = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-[#289E9D]';

export default function EstructuraAcademia() {
  const [sites,setSites] = useState<Site[]>([]);
  const [disciplines,setDisciplines] = useState<string[]>([]);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [siteForm,setSiteForm] = useState({ nombre:'', codigo:'', direccion:'', ciudad:'', comuna:'', region:'', telefono:'', ubicacion_entrenamiento:'', dias_entrenamiento:'', horarios_entrenamiento:'' });
  const [branchForm,setBranchForm] = useState({ sede_id:'', nombre:'', disciplina:'Fútbol', descripcion:'' });

  const load = async () => {
    setLoading(true);
    try { const r=await api.get('/api/estructura'); setSites(r.data.data||[]); setDisciplines(r.data.disciplines||[]); }
    catch (e:any) { setMessage(e?.response?.data?.error || 'No fue posible cargar la estructura.'); }
    finally { setLoading(false); }
  };
  useEffect(()=>{ void load(); },[]);
  useEffect(()=>{ if(!branchForm.sede_id && sites[0]?.id) setBranchForm(v=>({...v,sede_id:sites[0].id})); },[sites,branchForm.sede_id]);

  const totalBranches=useMemo(()=>sites.reduce((n,s)=>n+s.ramas.length,0),[sites]);
  const createSite=async()=>{
    if(!siteForm.nombre.trim()) return setMessage('Ingresa el nombre de la sede.');
    try { await api.post('/api/estructura/sedes',siteForm); setSiteForm({ nombre:'',codigo:'',direccion:'',ciudad:'',comuna:'',region:'',telefono:'',ubicacion_entrenamiento:'',dias_entrenamiento:'',horarios_entrenamiento:'' }); setMessage('Sede creada correctamente.'); await load(); }
    catch(e:any){ setMessage(e?.response?.data?.error||'No fue posible crear la sede.'); }
  };
  const createBranch=async()=>{
    if(!branchForm.sede_id || !branchForm.nombre.trim()) return setMessage('Selecciona sede e ingresa el nombre de la rama.');
    try { await api.post('/api/estructura/ramas',branchForm); setBranchForm(v=>({...v,nombre:'',descripcion:''})); setMessage('Rama creada correctamente.'); await load(); }
    catch(e:any){ setMessage(e?.response?.data?.error||'No fue posible crear la rama.'); }
  };
  const setPrincipalSite=async(id:string)=>{ await api.patch(`/api/estructura/sedes/${id}`,{principal:true}); await load(); };
  const setPrincipalBranch=async(id:string)=>{ await api.patch(`/api/estructura/ramas/${id}`,{principal:true}); await load(); };
  const toggleSite=async(site:Site)=>{ await api.patch(`/api/estructura/sedes/${site.id}`,{activa:!site.activa}); await load(); };
  const toggleBranch=async(branch:Branch)=>{ await api.patch(`/api/estructura/ramas/${branch.id}`,{activa:!branch.activa}); await load(); };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.14),transparent_38%),#151b25] p-5 sm:p-7">
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#70e4df]">Estructura organizacional</p>
      <h1 className="mt-2 text-3xl font-black text-white">Sedes y ramas deportivas</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#91a0b2]">Organiza una misma academia en distintas ubicaciones y disciplinas. Cada alumno, categoría, cobro, entrenamiento, torneo y partido puede conservar su sede y rama.</p>
      <div className="mt-5 flex flex-wrap gap-3"><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-2xl font-black text-white">{sites.length}</span><span className="ml-2 text-xs font-bold uppercase text-[#8995a4]">Sedes</span></div><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-2xl font-black text-white">{totalBranches}</span><span className="ml-2 text-xs font-bold uppercase text-[#8995a4]">Ramas</span></div></div>
    </section>

    {message && <div className="rounded-2xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 py-3 text-sm text-[#a7f3ef]">{message}</div>}

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5"><div className="mb-4 flex items-center gap-3"><BuildingOffice2Icon className="h-7 w-7 text-[#70e4df]"/><div><h2 className="font-black text-white">Nueva sede</h2><p className="text-xs text-[#8995a4]">Ej.: Casa Central, Sede Maipú, Sede Viña.</p></div></div><div className="grid gap-3 sm:grid-cols-2"><input className={input} placeholder="Nombre de la sede *" value={siteForm.nombre} onChange={e=>setSiteForm({...siteForm,nombre:e.target.value})}/><input className={input} placeholder="Código opcional" value={siteForm.codigo} onChange={e=>setSiteForm({...siteForm,codigo:e.target.value})}/><input className={`${input} sm:col-span-2`} placeholder="Dirección" value={siteForm.direccion} onChange={e=>setSiteForm({...siteForm,direccion:e.target.value})}/><input className={input} placeholder="Ciudad" value={siteForm.ciudad} onChange={e=>setSiteForm({...siteForm,ciudad:e.target.value})}/><input className={input} placeholder="Comuna" value={siteForm.comuna} onChange={e=>setSiteForm({...siteForm,comuna:e.target.value})}/><input className={`${input} sm:col-span-2`} placeholder="Lugar de entrenamiento" value={siteForm.ubicacion_entrenamiento} onChange={e=>setSiteForm({...siteForm,ubicacion_entrenamiento:e.target.value})}/><input className={input} placeholder="Días de entrenamiento" value={siteForm.dias_entrenamiento} onChange={e=>setSiteForm({...siteForm,dias_entrenamiento:e.target.value})}/><input className={input} placeholder="Horarios" value={siteForm.horarios_entrenamiento} onChange={e=>setSiteForm({...siteForm,horarios_entrenamiento:e.target.value})}/></div><button onClick={()=>void createSite()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#289E9D] px-4 py-3 text-sm font-black text-white"><PlusIcon className="h-5 w-5"/>Crear sede</button></div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5"><div className="mb-4 flex items-center gap-3"><TrophyIcon className="h-7 w-7 text-[#D8BE87]"/><div><h2 className="font-black text-white">Nueva rama deportiva</h2><p className="text-xs text-[#8995a4]">Ej.: Fútbol, Tenis, Vóleibol o Básquetbol dentro de una sede.</p></div></div><div className="space-y-3"><select className={input} value={branchForm.sede_id} onChange={e=>setBranchForm({...branchForm,sede_id:e.target.value})}><option value="">Selecciona sede</option>{sites.filter(s=>s.activa).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select><select className={input} value={branchForm.disciplina} onChange={e=>setBranchForm({...branchForm,disciplina:e.target.value,nombre:e.target.value==='Otro'?branchForm.nombre:e.target.value})}>{disciplines.map(d=><option key={d}>{d}</option>)}</select><input className={input} placeholder="Nombre visible de la rama *" value={branchForm.nombre} onChange={e=>setBranchForm({...branchForm,nombre:e.target.value})}/><textarea className={input} placeholder="Descripción opcional" value={branchForm.descripcion} onChange={e=>setBranchForm({...branchForm,descripcion:e.target.value})}/></div><button onClick={()=>void createBranch()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C8A96B] px-4 py-3 text-sm font-black text-[#151b25]"><PlusIcon className="h-5 w-5"/>Crear rama</button></div>
    </section>

    <section className="space-y-4">{loading ? <div className="rounded-2xl border border-white/10 bg-[#151b25] p-10 text-center text-[#8995a4]">Cargando sedes...</div> : sites.map(site=><article key={site.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-white">{site.nombre}</h3>{site.principal&&<span className="rounded-full bg-[#289E9D]/15 px-2 py-1 text-[10px] font-black uppercase text-[#70e4df]">Principal</span>}{!site.activa&&<span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase text-red-300">Inactiva</span>}</div><p className="mt-1 flex items-center gap-1 text-sm text-[#8995a4]"><MapPinIcon className="h-4 w-4"/>{site.direccion||site.ubicacion_entrenamiento||'Sin ubicación informada'}</p></div><div className="flex flex-wrap gap-2">{!site.principal&&<button onClick={()=>void setPrincipalSite(site.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#b7c0cc]">Marcar principal</button>}<button onClick={()=>void toggleSite(site)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#b7c0cc]">{site.activa?'Desactivar':'Activar'}</button></div></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{site.ramas.length?site.ramas.map(branch=><div key={branch.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{branch.nombre}</p><p className="text-xs text-[#8995a4]">{branch.disciplina}</p></div><div className="text-right">{branch.principal&&<span className="text-[10px] font-black uppercase text-[#D8BE87]">Principal</span>}</div></div><div className="mt-3 flex gap-2">{!branch.principal&&<button onClick={()=>void setPrincipalBranch(branch.id)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-[#b7c0cc]">Principal</button>}<button onClick={()=>void toggleBranch(branch)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-[#b7c0cc]">{branch.activa?'Desactivar':'Activar'}</button></div></div>):<div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-[#657184]">Esta sede todavía no tiene ramas.</div>}</div></article>)}</section>
  </div>;
}
