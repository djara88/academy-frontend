import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import {
  AdjustmentsHorizontalIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import EvaluationCriteriaEditor from '../components/EvaluationCriteriaEditor';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DIRECTOR_TEXTAREA,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

type Branch = { id:string; sede_id:string; nombre:string; disciplina:string; descripcion?:string|null; activa:boolean; principal:boolean };
type Site = { id:string; nombre:string; codigo?:string|null; direccion?:string|null; ciudad?:string|null; comuna?:string|null; region?:string|null; pais?:string|null; telefono?:string|null; ubicacion_entrenamiento?:string|null; dias_entrenamiento?:string|null; horarios_entrenamiento?:string|null; activa:boolean; principal:boolean; ramas:Branch[] };
type Category = { id:string; nombre:string; descripcion?:string|null; sede_id?:string|null; rama_id?:string|null };
type StructureLimits = { sites:number|null; branches:number|null; plan?:{ name:string; trial?:boolean } };

const limitLabel = (used:number, limit:number|null) => `${used} / ${limit === null ? '∞' : limit}`;
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

export default function EstructuraAcademia() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryMode = searchParams.get('modo') === 'categorias';
  const [sites,setSites] = useState<Site[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [disciplines,setDisciplines] = useState<string[]>([]);
  const [limits,setLimits] = useState<StructureLimits>({ sites:null, branches:null });
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState('');
  const [editingEvaluationBranch,setEditingEvaluationBranch] = useState<Branch|null>(null);
  const [categoryModal,setCategoryModal] = useState<{ site:Site; branch:Branch }|null>(null);
  const [categoryModalForm,setCategoryModalForm] = useState({ nombre:'', descripcion:'' });
  const [categorySaving,setCategorySaving] = useState(false);
  const [siteForm,setSiteForm] = useState({ nombre:'', codigo:'', direccion:'', ciudad:'', comuna:'', region:'', telefono:'', ubicacion_entrenamiento:'', dias_entrenamiento:'', horarios_entrenamiento:'' });
  const [branchForm,setBranchForm] = useState({ sede_id:'', nombre:'', disciplina:'Fútbol', descripcion:'' });
  const [categoryForm,setCategoryForm] = useState({ rama_id:'', nombre:'', descripcion:'' });

  const load = async () => {
    setLoading(true);
    try {
      const [structureResponse, categoriesResponse] = await Promise.all([api.get('/api/estructura'),api.get('/api/jugadores/categorias')]);
      setSites(structureResponse.data.data || []);
      setDisciplines(structureResponse.data.disciplines || []);
      setLimits(structureResponse.data.limits || { sites:null, branches:null });
      setCategories(categoriesResponse.data.data || []);
    } catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible cargar la estructura.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!branchForm.sede_id && sites[0]?.id) setBranchForm((current) => ({ ...current, sede_id:sites[0].id })); }, [sites, branchForm.sede_id]);

  const activeSites = useMemo(() => sites.filter((site) => site.activa).length, [sites]);
  const activeBranches = useMemo(() => sites.reduce((count, site) => count + site.ramas.filter((branch) => branch.activa).length, 0), [sites]);
  const branchOptions = useMemo(() => sites.flatMap((site) => site.ramas.filter((branch) => branch.activa).map((branch) => ({ ...branch, siteName:site.nombre, siteActive:site.activa }))).filter((branch) => branch.siteActive), [sites]);
  const canCreateSite = limits.sites === null || activeSites < limits.sites;
  const canCreateBranch = limits.branches === null || activeBranches < limits.branches;

  useEffect(() => {
    if (!categoryForm.rama_id && branchOptions.length === 1) setCategoryForm((current) => ({ ...current, rama_id:branchOptions[0].id }));
    if (categoryForm.rama_id && !branchOptions.some((branch) => branch.id === categoryForm.rama_id)) setCategoryForm((current) => ({ ...current, rama_id:'' }));
  }, [branchOptions, categoryForm.rama_id]);

  const createSite = async () => {
    if (!siteForm.nombre.trim()) return setMessage('Ingresa el nombre de la sede.');
    if (!canCreateSite) return setMessage(`Tu plan ${limits.plan?.name || ''} alcanzó el máximo de sedes activas.`);
    try { await api.post('/api/estructura/sedes', siteForm); setSiteForm({ nombre:'', codigo:'', direccion:'', ciudad:'', comuna:'', region:'', telefono:'', ubicacion_entrenamiento:'', dias_entrenamiento:'', horarios_entrenamiento:'' }); setMessage('Sede creada correctamente.'); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible crear la sede.'); }
  };
  const createBranch = async () => {
    if (!branchForm.sede_id || !branchForm.nombre.trim()) return setMessage('Selecciona sede e ingresa el nombre de la rama.');
    if (!canCreateBranch) return setMessage(`Tu plan ${limits.plan?.name || ''} alcanzó el máximo de ramas activas.`);
    try { await api.post('/api/estructura/ramas', branchForm); setBranchForm((current) => ({ ...current, nombre:'', descripcion:'' })); setMessage('Rama creada correctamente. Agrega una categoría para completar la rama.'); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible crear la rama.'); }
  };
  const createCategory = async () => {
    if (!categoryForm.rama_id) return setMessage('Selecciona la rama deportiva de la categoría.');
    if (!categoryForm.nombre.trim()) return setMessage('Ingresa el nombre de la categoría.');
    try { await api.post('/api/jugadores/categorias', categoryForm); setCategoryForm((current) => ({ ...current, nombre:'', descripcion:'' })); setMessage('Categoría creada correctamente.'); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible crear la categoría.'); }
  };
  const openCategoryModal = (site:Site, branch:Branch) => { setCategoryModal({ site, branch }); setCategoryModalForm({ nombre:'', descripcion:'' }); setMessage(''); };
  const createCategoryForBranch = async () => {
    if (!categoryModal) return;
    if (!categoryModalForm.nombre.trim()) return setMessage('Ingresa el nombre de la categoría.');
    setCategorySaving(true);
    try { await api.post('/api/jugadores/categorias', { rama_id:categoryModal.branch.id, nombre:categoryModalForm.nombre.trim(), descripcion:categoryModalForm.descripcion.trim() }); const branchName=categoryModal.branch.nombre; setCategoryModal(null); setCategoryModalForm({ nombre:'', descripcion:'' }); setMessage(`Categoría creada en ${branchName}.`); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible crear la categoría.'); }
    finally { setCategorySaving(false); }
  };
  const setPrincipalSite = async (id:string) => { await api.patch(`/api/estructura/sedes/${id}`, { principal:true }); await load(); };
  const setPrincipalBranch = async (id:string) => { await api.patch(`/api/estructura/ramas/${id}`, { principal:true }); await load(); };
  const toggleSite = async (site:Site) => { try { await api.patch(`/api/estructura/sedes/${site.id}`, { activa:!site.activa }); await load(); } catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible cambiar el estado de la sede.'); } };
  const toggleBranch = async (branch:Branch) => { try { await api.patch(`/api/estructura/ramas/${branch.id}`, { activa:!branch.activa }); await load(); } catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible cambiar el estado de la rama.'); } };
  const categoriesForBranch = (branchId:string) => categories.filter((category) => category.rama_id === branchId);

  const CategoryChips = ({ branch }:{ branch:Branch }) => {
    const branchCategories = categoriesForBranch(branch.id);
    return <div className="flex flex-wrap gap-1.5">{branchCategories.length ? branchCategories.map((category) => <span key={category.id} className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black text-[#5f7900]">{category.nombre}</span>) : <span className="text-[11px] font-semibold text-[#758074]">Sin categorías</span>}</div>;
  };

  if (loading) return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]">Cargando estructura...</DirectorPanel>;

  return <DirectorPage>
    <DirectorHero eyebrow={categoryMode ? 'Configuración deportiva' : 'Estructura de la academia'} title={categoryMode ? 'Categorías' : 'Sedes, ramas y categorías'} description={categoryMode ? 'Agrega y revisa las categorías de cada rama activa.' : 'Administra ubicaciones, disciplinas y categorías sin duplicar alumnos ni mezclar la estructura deportiva.'} actions={categoryMode ? <button onClick={() => navigate('/configuracion/estructura')} className={DIRECTOR_BUTTON_DARK}>← Sedes y ramas</button> : <button onClick={() => navigate('/configuracion/estructura?modo=categorias')} className={DIRECTOR_BUTTON}><UserGroupIcon className="h-5 w-5"/>Administrar categorías</button>} aside={limits.plan?.name ? <div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Capacidad actual</p><p className="mt-2 text-xl font-black text-white">{limits.plan.trial ? 'Prueba Full' : limits.plan.name}</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">La estructura se conserva aunque cambies de plan.</p></div> : null}/>

    <section className="grid gap-3 sm:grid-cols-3"><DirectorStat label="Sedes activas" value={limitLabel(activeSites, limits.sites)} tone="lime"/><DirectorStat label="Ramas activas" value={limitLabel(activeBranches, limits.branches)}/><DirectorStat label="Categorías" value={categories.length} tone="dark"/></section>
    {message ? <div className="rounded-[18px] border border-[#cde995] bg-[#f3fadf] px-4 py-3 text-sm font-bold text-[#4e6900]">{message}</div> : null}

    {!categoryMode ? <section className="grid gap-5 xl:grid-cols-3">
      <DirectorPanel className="p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#111711] text-white"><BuildingOffice2Icon className="h-6 w-6"/></div><div><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#789600]">Paso 1</p><h2 className="font-black text-[#111711]">Nueva sede</h2></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><input className={DIRECTOR_FIELD} placeholder="Nombre de la sede *" value={siteForm.nombre} onChange={(event) => setSiteForm({ ...siteForm, nombre:event.target.value })}/><input className={DIRECTOR_FIELD} placeholder="Código opcional" value={siteForm.codigo} onChange={(event) => setSiteForm({ ...siteForm, codigo:event.target.value })}/><input className={`${DIRECTOR_FIELD} sm:col-span-2 xl:col-span-1 2xl:col-span-2`} placeholder="Dirección" value={siteForm.direccion} onChange={(event) => setSiteForm({ ...siteForm, direccion:event.target.value })}/><input className={DIRECTOR_FIELD} placeholder="Ciudad" value={siteForm.ciudad} onChange={(event) => setSiteForm({ ...siteForm, ciudad:event.target.value })}/><input className={DIRECTOR_FIELD} placeholder="Comuna" value={siteForm.comuna} onChange={(event) => setSiteForm({ ...siteForm, comuna:event.target.value })}/><input className={`${DIRECTOR_FIELD} sm:col-span-2 xl:col-span-1 2xl:col-span-2`} placeholder="Lugar de entrenamiento" value={siteForm.ubicacion_entrenamiento} onChange={(event) => setSiteForm({ ...siteForm, ubicacion_entrenamiento:event.target.value })}/></div><button disabled={!canCreateSite} onClick={() => void createSite()} className={`${DIRECTOR_BUTTON} mt-4`}><PlusIcon className="h-5 w-5"/>{canCreateSite ? 'Crear sede' : 'Límite alcanzado'}</button></DirectorPanel>
      <DirectorPanel className="p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#111711] text-white"><TrophyIcon className="h-6 w-6"/></div><div><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#789600]">Paso 2</p><h2 className="font-black text-[#111711]">Nueva rama deportiva</h2></div></div><div className="grid gap-3"><select className={DIRECTOR_FIELD} value={branchForm.sede_id} onChange={(event)=>setBranchForm({...branchForm,sede_id:event.target.value})}><option value="">Selecciona sede</option>{sites.filter(s=>s.activa).map(site=><option key={site.id} value={site.id}>{site.nombre}</option>)}</select><select className={DIRECTOR_FIELD} value={branchForm.disciplina} onChange={(event)=>setBranchForm({...branchForm,disciplina:event.target.value})}>{disciplines.map(item=><option key={item} value={item}>{item}</option>)}</select><input className={DIRECTOR_FIELD} placeholder="Nombre visible de la rama *" value={branchForm.nombre} onChange={(event)=>setBranchForm({...branchForm,nombre:event.target.value})}/><textarea className={DIRECTOR_TEXTAREA} placeholder="Descripción opcional" value={branchForm.descripcion} onChange={(event)=>setBranchForm({...branchForm,descripcion:event.target.value})}/></div><button disabled={!canCreateBranch} onClick={() => void createBranch()} className={`${DIRECTOR_BUTTON} mt-4`}><PlusIcon className="h-5 w-5"/>{canCreateBranch ? 'Crear rama' : 'Límite alcanzado'}</button></DirectorPanel>
      <DirectorPanel className="p-5"><div className="mb-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#111711] text-white"><UserGroupIcon className="h-6 w-6"/></div><div><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#789600]">Paso 3</p><h2 className="font-black text-[#111711]">Nueva categoría</h2></div></div><div className="grid gap-3"><select className={DIRECTOR_FIELD} value={categoryForm.rama_id} onChange={(event)=>setCategoryForm({...categoryForm,rama_id:event.target.value})}><option value="">Selecciona rama</option>{branchOptions.map(branch=><option key={branch.id} value={branch.id}>{branch.siteName} · {branch.disciplina} · {branch.nombre}</option>)}</select><input className={DIRECTOR_FIELD} placeholder="Nombre de categoría *" value={categoryForm.nombre} onChange={(event)=>setCategoryForm({...categoryForm,nombre:event.target.value})}/><textarea className={DIRECTOR_TEXTAREA} placeholder="Descripción opcional" value={categoryForm.descripcion} onChange={(event)=>setCategoryForm({...categoryForm,descripcion:event.target.value})}/></div><button onClick={() => void createCategory()} className={`${DIRECTOR_BUTTON} mt-4`}><PlusIcon className="h-5 w-5"/>Crear categoría</button></DirectorPanel>
    </section> : null}

    {categoryMode ? <DirectorPanel className="p-5 sm:p-6"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Categorías</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Agregar categoría a una rama</h2><p className="mt-1 text-sm text-[#697468]">Selecciona una rama y crea tantas categorías como necesites.</p></div><div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr]"><select className={DIRECTOR_FIELD} value={categoryForm.rama_id} onChange={(event)=>setCategoryForm({...categoryForm,rama_id:event.target.value})}><option value="">Selecciona rama</option>{branchOptions.map(branch=><option key={branch.id} value={branch.id}>{branch.siteName} · {branch.disciplina} · {branch.nombre}</option>)}</select><input className={DIRECTOR_FIELD} placeholder="Nombre de categoría *" value={categoryForm.nombre} onChange={(event)=>setCategoryForm({...categoryForm,nombre:event.target.value})}/><textarea className={`${DIRECTOR_TEXTAREA} md:col-span-2`} placeholder="Descripción opcional" value={categoryForm.descripcion} onChange={(event)=>setCategoryForm({...categoryForm,descripcion:event.target.value})}/></div><div className="mt-4 flex justify-end"><button onClick={() => void createCategory()} className={DIRECTOR_BUTTON}><PlusIcon className="h-5 w-5"/>Crear categoría</button></div></DirectorPanel> : null}

    <section className="space-y-4"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Estructura actual</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Cómo está construida tu academia</h2></div>{sites.length ? sites.map(site=><DirectorPanel key={site.id} className={`${site.activa?'':'opacity-65'} overflow-hidden`}><div className="flex flex-col gap-4 border-b border-[#e2e7df] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"><div className="flex min-w-0 items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#111711] text-[#b7ff00]"><MapPinIcon className="h-5 w-5"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-[#111711]">{site.nombre}</h3>{site.principal?<span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[9px] font-black uppercase text-[#5f7900]">Principal</span>:null}</div><p className="mt-1 text-sm text-[#697468]">{[site.direccion,site.comuna,site.ciudad].filter(Boolean).join(' · ')||'Ubicación pendiente'} · {site.ramas.filter(branch=>branch.activa).length} rama(s) activa(s)</p></div></div><div className="flex flex-wrap gap-2">{!site.principal&&site.activa?<button onClick={()=>void setPrincipalSite(site.id)} className={DIRECTOR_BUTTON_GHOST}>Hacer principal</button>:null}<button onClick={()=>void toggleSite(site)} className={site.activa?DIRECTOR_BUTTON_DARK:DIRECTOR_BUTTON}>{site.activa?'Desactivar':'Reactivar'}</button></div></div><div className="grid gap-3 p-5 sm:p-6 lg:grid-cols-2">{site.ramas.length?site.ramas.map(branch=><article key={branch.id} className={`rounded-[18px] border p-4 ${branch.activa?'border-[#d9e0d6] bg-[#f8faf6]':'border-[#e1e5df] bg-[#f4f5f2] opacity-65'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#789600]">{branch.disciplina}</p><div className="mt-1 flex flex-wrap items-center gap-2"><h4 className="font-black text-[#111711]">{branch.nombre}</h4>{branch.principal?<span className="rounded-full bg-[#111711] px-2 py-1 text-[9px] font-black uppercase text-[#b7ff00]">Principal</span>:null}</div></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${branch.activa?'bg-[#e8f6d0] text-[#416400]':'bg-[#e8ebe6] text-[#697468]'}`}>{branch.activa?'Activa':'Inactiva'}</span></div><div className="mt-3"><CategoryChips branch={branch}/></div><div className="mt-4 flex flex-wrap gap-2 border-t border-[#e2e7df] pt-4"><button onClick={()=>openCategoryModal(site,branch)} className={DIRECTOR_BUTTON}><PlusIcon className="h-4 w-4"/>Categoría</button><button onClick={()=>setEditingEvaluationBranch(branch)} className={DIRECTOR_BUTTON_GHOST}><AdjustmentsHorizontalIcon className="h-4 w-4"/>Criterios</button>{!branch.principal&&branch.activa?<button onClick={()=>void setPrincipalBranch(branch.id)} className={DIRECTOR_BUTTON_GHOST}>Principal</button>:null}<button onClick={()=>void toggleBranch(branch)} className={DIRECTOR_BUTTON_DARK}>{branch.activa?'Desactivar':'Reactivar'}</button></div></article>):<div className="rounded-[18px] border border-dashed border-[#d9e0d6] p-5 text-sm text-[#697468]">Esta sede todavía no tiene ramas.</div>}</div></DirectorPanel>):<DirectorPanel className="p-10 text-center text-sm text-[#697468]">Aún no hay sedes configuradas.</DirectorPanel>}</section>

    {editingEvaluationBranch ? <EvaluationCriteriaEditor branch={editingEvaluationBranch} onClose={() => setEditingEvaluationBranch(null)} onSaved={load} /> : null}

    {categoryModal ? <div className="fixed inset-0 z-[120] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setCategoryModal(null); }}><div role="dialog" aria-modal="true" aria-labelledby="category-modal-title" className="w-full max-w-lg overflow-hidden rounded-[28px] border border-[#d9e0d6] bg-white shadow-[0_30px_90px_rgba(0,0,0,.30)]"><div className="flex items-start justify-between border-b border-[#e2e7df] p-5 sm:p-6"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#789600]">Nueva categoría</p><h2 id="category-modal-title" className="mt-1 text-2xl font-black text-[#111711]">{categoryModal.branch.nombre}</h2><p className="mt-1 text-sm text-[#697468]">{categoryModal.site.nombre} · {categoryModal.branch.disciplina}</p></div><button onClick={() => setCategoryModal(null)} className={`${DIRECTOR_BUTTON_GHOST} min-h-10 px-3`}><XMarkIcon className="h-5 w-5"/></button></div><div className="space-y-4 p-5 sm:p-6"><label><span className={labelClass}>Nombre de categoría</span><input autoFocus className={DIRECTOR_FIELD} placeholder="Ej.: SUB-10" value={categoryModalForm.nombre} onChange={(event)=>setCategoryModalForm({...categoryModalForm,nombre:event.target.value})}/></label><label><span className={labelClass}>Descripción opcional</span><textarea className={DIRECTOR_TEXTAREA} placeholder="Información adicional" value={categoryModalForm.descripcion} onChange={(event)=>setCategoryModalForm({...categoryModalForm,descripcion:event.target.value})}/></label><div className="grid gap-2 sm:grid-cols-2"><button onClick={()=>setCategoryModal(null)} className={DIRECTOR_BUTTON_DARK}>Cancelar</button><button disabled={categorySaving} onClick={()=>void createCategoryForBranch()} className={DIRECTOR_BUTTON}>{categorySaving?'Guardando...':'Crear categoría'}</button></div></div></div></div> : null}
  </DirectorPage>;
}
