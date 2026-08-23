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

type Branch = {
  id:string;
  sede_id:string;
  nombre:string;
  disciplina:string;
  descripcion?:string|null;
  activa:boolean;
  principal:boolean;
};
type Site = {
  id:string;
  nombre:string;
  codigo?:string|null;
  direccion?:string|null;
  ciudad?:string|null;
  comuna?:string|null;
  region?:string|null;
  pais?:string|null;
  telefono?:string|null;
  ubicacion_entrenamiento?:string|null;
  dias_entrenamiento?:string|null;
  horarios_entrenamiento?:string|null;
  activa:boolean;
  principal:boolean;
  ramas:Branch[];
};
type Category = { id:string; nombre:string; descripcion?:string|null; sede_id?:string|null; rama_id?:string|null };
type StructureLimits = { sites:number|null; branches:number|null; plan?:{ name:string; trial?:boolean } };

const input = 'w-full rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-[#289E9D]';
const limitLabel = (used:number, limit:number|null) => `${used} / ${limit === null ? '∞' : limit}`;

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
      const [structureResponse, categoriesResponse] = await Promise.all([
        api.get('/api/estructura'),
        api.get('/api/jugadores/categorias'),
      ]);
      setSites(structureResponse.data.data || []);
      setDisciplines(structureResponse.data.disciplines || []);
      setLimits(structureResponse.data.limits || { sites:null, branches:null });
      setCategories(categoriesResponse.data.data || []);
    } catch (error:any) {
      setMessage(error?.response?.data?.error || 'No fue posible cargar la estructura.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!branchForm.sede_id && sites[0]?.id) setBranchForm((current) => ({ ...current, sede_id:sites[0].id }));
  }, [sites, branchForm.sede_id]);

  const activeSites = useMemo(() => sites.filter((site) => site.activa).length, [sites]);
  const activeBranches = useMemo(() => sites.reduce((count, site) => count + site.ramas.filter((branch) => branch.activa).length, 0), [sites]);
  const branchOptions = useMemo(() => sites
    .flatMap((site) => site.ramas
      .filter((branch) => branch.activa)
      .map((branch) => ({ ...branch, siteName:site.nombre, siteActive:site.activa })))
    .filter((branch) => branch.siteActive), [sites]);
  const canCreateSite = limits.sites === null || activeSites < limits.sites;
  const canCreateBranch = limits.branches === null || activeBranches < limits.branches;

  useEffect(() => {
    if (!categoryForm.rama_id && branchOptions.length === 1) setCategoryForm((current) => ({ ...current, rama_id:branchOptions[0].id }));
    if (categoryForm.rama_id && !branchOptions.some((branch) => branch.id === categoryForm.rama_id)) setCategoryForm((current) => ({ ...current, rama_id:'' }));
  }, [branchOptions, categoryForm.rama_id]);

  const createSite = async () => {
    if (!siteForm.nombre.trim()) return setMessage('Ingresa el nombre de la sede.');
    if (!canCreateSite) return setMessage(`Tu plan ${limits.plan?.name || ''} alcanzó el máximo de sedes activas.`);
    try {
      await api.post('/api/estructura/sedes', siteForm);
      setSiteForm({ nombre:'', codigo:'', direccion:'', ciudad:'', comuna:'', region:'', telefono:'', ubicacion_entrenamiento:'', dias_entrenamiento:'', horarios_entrenamiento:'' });
      setMessage('Sede creada correctamente.');
      await load();
    } catch (error:any) {
      setMessage(error?.response?.data?.error || 'No fue posible crear la sede.');
    }
  };

  const createBranch = async () => {
    if (!branchForm.sede_id || !branchForm.nombre.trim()) return setMessage('Selecciona sede e ingresa el nombre de la rama.');
    if (!canCreateBranch) return setMessage(`Tu plan ${limits.plan?.name || ''} alcanzó el máximo de ramas activas.`);
    try {
      await api.post('/api/estructura/ramas', branchForm);
      setBranchForm((current) => ({ ...current, nombre:'', descripcion:'' }));
      setMessage('Rama creada correctamente. Agrega una categoría para completar la rama.');
      await load();
    } catch (error:any) {
      setMessage(error?.response?.data?.error || 'No fue posible crear la rama.');
    }
  };

  const createCategory = async () => {
    if (!categoryForm.rama_id) return setMessage('Selecciona la rama deportiva de la categoría.');
    if (!categoryForm.nombre.trim()) return setMessage('Ingresa el nombre de la categoría.');
    try {
      await api.post('/api/jugadores/categorias', categoryForm);
      setCategoryForm((current) => ({ ...current, nombre:'', descripcion:'' }));
      setMessage('Categoría creada correctamente.');
      await load();
    } catch (error:any) {
      setMessage(error?.response?.data?.error || 'No fue posible crear la categoría.');
    }
  };

  const openCategoryModal = (site:Site, branch:Branch) => {
    setCategoryModal({ site, branch });
    setCategoryModalForm({ nombre:'', descripcion:'' });
    setMessage('');
  };

  const createCategoryForBranch = async () => {
    if (!categoryModal) return;
    if (!categoryModalForm.nombre.trim()) return setMessage('Ingresa el nombre de la categoría.');
    setCategorySaving(true);
    try {
      await api.post('/api/jugadores/categorias', {
        rama_id:categoryModal.branch.id,
        nombre:categoryModalForm.nombre.trim(),
        descripcion:categoryModalForm.descripcion.trim(),
      });
      const branchName = categoryModal.branch.nombre;
      setCategoryModal(null);
      setCategoryModalForm({ nombre:'', descripcion:'' });
      setMessage(`Categoría creada en ${branchName}.`);
      await load();
    } catch (error:any) {
      setMessage(error?.response?.data?.error || 'No fue posible crear la categoría.');
    } finally {
      setCategorySaving(false);
    }
  };

  const setPrincipalSite = async (id:string) => { await api.patch(`/api/estructura/sedes/${id}`, { principal:true }); await load(); };
  const setPrincipalBranch = async (id:string) => { await api.patch(`/api/estructura/ramas/${id}`, { principal:true }); await load(); };
  const toggleSite = async (site:Site) => {
    try { await api.patch(`/api/estructura/sedes/${site.id}`, { activa:!site.activa }); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible cambiar el estado de la sede.'); }
  };
  const toggleBranch = async (branch:Branch) => {
    try { await api.patch(`/api/estructura/ramas/${branch.id}`, { activa:!branch.activa }); await load(); }
    catch (error:any) { setMessage(error?.response?.data?.error || 'No fue posible cambiar el estado de la rama.'); }
  };
  const categoriesForBranch = (branchId:string) => categories.filter((category) => category.rama_id === branchId);

  const CategoryChips = ({ branch }:{ branch:Branch }) => {
    const branchCategories = categoriesForBranch(branch.id);
    return <div className="flex flex-wrap gap-1.5">{branchCategories.length
      ? branchCategories.map((category) => <span key={category.id} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-200">{category.nombre}</span>)
      : <span className="text-[11px] text-[#657184]">Sin categorías</span>}
    </div>;
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.14),transparent_38%),#151b25] p-5 sm:p-7">
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#70e4df]">{categoryMode ? 'Configuración deportiva' : 'Estructura de la academia'}</p>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">{categoryMode ? 'Categorías' : 'Sedes, ramas y categorías'}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#91a0b2]">{categoryMode
            ? 'Agrega y revisa las categorías de cada rama.'
            : 'Administra las sedes, disciplinas y categorías de tu academia.'}</p>
        </div>
        {categoryMode
          ? <button onClick={() => navigate('/configuracion/estructura')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white">Volver a Sedes y Ramas</button>
          : <button onClick={() => navigate('/configuracion/estructura?modo=categorias')} className="inline-flex items-center gap-2 rounded-xl bg-[#caff00] px-4 py-3 text-sm font-black text-[#11170f]"><UserGroupIcon className="h-5 w-5" /> Administrar categorías</button>}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-2xl font-black text-white">{limitLabel(activeSites, limits.sites)}</span><span className="ml-2 text-xs font-bold uppercase text-[#8995a4]">Sedes activas</span></div>
        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-2xl font-black text-white">{limitLabel(activeBranches, limits.branches)}</span><span className="ml-2 text-xs font-bold uppercase text-[#8995a4]">Ramas activas</span></div>
        <div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3"><span className="text-2xl font-black text-white">{categories.length}</span><span className="ml-2 text-xs font-bold uppercase text-[#8995a4]">Categorías</span></div>
        {limits.plan?.name ? <div className="rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/10 px-4 py-3"><span className="text-sm font-black text-[#D8BE87]">{limits.plan.trial ? 'Prueba Full' : limits.plan.name}</span><span className="ml-2 text-xs text-[#a99a7a]">capacidad actual</span></div> : null}
      </div>
    </section>

    {message ? <div className="rounded-2xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-4 py-3 text-sm text-[#a7f3ef]">{message}</div> : null}

    {!categoryMode ? <section className="grid gap-5 xl:grid-cols-3">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5">
        <div className="mb-4 flex items-center gap-3"><BuildingOffice2Icon className="h-7 w-7 text-[#70e4df]"/><div><h2 className="font-black text-white">1 · Nueva sede</h2><p className="text-xs text-[#8995a4]">Agrega una ubicación de la academia.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <input className={input} placeholder="Nombre de la sede *" value={siteForm.nombre} onChange={(event) => setSiteForm({ ...siteForm, nombre:event.target.value })}/>
          <input className={input} placeholder="Código opcional" value={siteForm.codigo} onChange={(event) => setSiteForm({ ...siteForm, codigo:event.target.value })}/>
          <input className={`${input} sm:col-span-2 xl:col-span-1 2xl:col-span-2`} placeholder="Dirección" value={siteForm.direccion} onChange={(event) => setSiteForm({ ...siteForm, direccion:event.target.value })}/>
          <input className={input} placeholder="Ciudad" value={siteForm.ciudad} onChange={(event) => setSiteForm({ ...siteForm, ciudad:event.target.value })}/>
          <input className={input} placeholder="Comuna" value={siteForm.comuna} onChange={(event) => setSiteForm({ ...siteForm, comuna:event.target.value })}/>
          <input className={`${input} sm:col-span-2 xl:col-span-1 2xl:col-span-2`} placeholder="Lugar de entrenamiento" value={siteForm.ubicacion_entrenamiento} onChange={(event) => setSiteForm({ ...siteForm, ubicacion_entrenamiento:event.target.value })}/>
        </div>
        <button disabled={!canCreateSite} onClick={() => void createSite()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#289E9D] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><PlusIcon className="h-5 w-5"/>{canCreateSite ? 'Crear sede' : 'Límite de sedes alcanzado'}</button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5">
        <div className="mb-4 flex items-center gap-3"><TrophyIcon className="h-7 w-7 text-[#D8BE87]"/><div><h2 className="font-black text-white">2 · Nueva rama deportiva</h2><p className="text-xs text-[#8995a4]">Selecciona la sede y define la disciplina.</p></div></div>
        <div className="space-y-3">
          <select className={input} value={branchForm.sede_id} onChange={(event) => setBranchForm({ ...branchForm, sede_id:event.target.value })}><option value="">Selecciona sede</option>{sites.filter((site) => site.activa).map((site) => <option key={site.id} value={site.id}>{site.nombre}</option>)}</select>
          <select className={input} value={branchForm.disciplina} onChange={(event) => setBranchForm({ ...branchForm, disciplina:event.target.value, nombre:event.target.value === 'Otro' ? branchForm.nombre : event.target.value })}>{disciplines.map((discipline) => <option key={discipline}>{discipline}</option>)}</select>
          <input className={input} placeholder="Nombre visible de la rama *" value={branchForm.nombre} onChange={(event) => setBranchForm({ ...branchForm, nombre:event.target.value })}/>
          <textarea className={input} placeholder="Descripción opcional" value={branchForm.descripcion} onChange={(event) => setBranchForm({ ...branchForm, descripcion:event.target.value })}/>
        </div>
        <button disabled={!canCreateBranch} onClick={() => void createBranch()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#C8A96B] px-4 py-3 text-sm font-black text-[#151b25] disabled:cursor-not-allowed disabled:opacity-40"><PlusIcon className="h-5 w-5"/>{canCreateBranch ? 'Crear rama' : 'Límite de ramas alcanzado'}</button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5">
        <div className="mb-4 flex items-center gap-3"><UserGroupIcon className="h-7 w-7 text-violet-300"/><div><h2 className="font-black text-white">3 · Nueva categoría</h2><p className="text-xs text-[#8995a4]">Crea una categoría dentro de una rama.</p></div></div>
        {branchOptions.length === 0
          ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm leading-6 text-[#8995a4]">Crea primero una sede y una rama activa.</div>
          : <div className="space-y-3">
              <select className={input} value={categoryForm.rama_id} onChange={(event) => setCategoryForm({ ...categoryForm, rama_id:event.target.value })}><option value="">Selecciona la rama *</option>{branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.siteName} · {branch.nombre} ({branch.disciplina})</option>)}</select>
              <input className={input} placeholder="Nombre de categoría * · Ej: U15" value={categoryForm.nombre} onChange={(event) => setCategoryForm({ ...categoryForm, nombre:event.target.value })}/>
              <textarea className={input} placeholder="Descripción opcional" value={categoryForm.descripcion} onChange={(event) => setCategoryForm({ ...categoryForm, descripcion:event.target.value })}/>
              <button onClick={() => void createCategory()} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-black text-white hover:bg-violet-400"><PlusIcon className="h-5 w-5"/>Crear categoría</button>
            </div>}
      </div>
    </section> : null}

    {categoryMode ? <section className="space-y-4">
      <div><p className="text-xs font-black uppercase tracking-[.16em] text-[#7d8999]">Categorías por rama</p><h2 className="mt-1 text-xl font-black text-white">Selecciona una rama</h2></div>
      {loading
        ? <div className="rounded-2xl border border-white/10 bg-[#151b25] p-10 text-center text-[#8995a4]">Cargando categorías...</div>
        : sites.filter((site) => site.activa).map((site) => <article key={site.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-white">{site.nombre}</h3>{site.principal ? <span className="rounded-full bg-[#289E9D]/15 px-2 py-1 text-[10px] font-black uppercase text-[#70e4df]">Principal</span> : null}</div><p className="mt-1 flex items-center gap-1 text-sm text-[#8995a4]"><MapPinIcon className="h-4 w-4"/>{site.direccion || site.ubicacion_entrenamiento || 'Sin ubicación informada'}</p></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{site.ramas.filter((branch) => branch.activa).length
            ? site.ramas.filter((branch) => branch.activa).map((branch) => <div key={branch.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{branch.nombre}</p><p className="text-xs text-[#8995a4]">{branch.disciplina}</p></div><button onClick={() => openCategoryModal(site, branch)} aria-label={`Agregar categoría a ${branch.nombre}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#caff00] text-[#10160f] transition hover:scale-105"><PlusIcon className="h-5 w-5"/></button></div><div className="mt-4"><p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-[#7d8999]">Categorías</p><CategoryChips branch={branch}/></div></div>)
            : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-[#657184]">Esta sede no tiene ramas activas.</div>}</div>
        </article>)}
    </section> : <section className="space-y-4">
      {loading ? <div className="rounded-2xl border border-white/10 bg-[#151b25] p-10 text-center text-[#8995a4]">Cargando sedes...</div> : sites.map((site) => <article key={site.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black text-white">{site.nombre}</h3>{site.principal ? <span className="rounded-full bg-[#289E9D]/15 px-2 py-1 text-[10px] font-black uppercase text-[#70e4df]">Principal</span> : null}{!site.activa ? <span className="rounded-full bg-red-500/15 px-2 py-1 text-[10px] font-black uppercase text-red-300">Inactiva</span> : null}</div><p className="mt-1 flex items-center gap-1 text-sm text-[#8995a4]"><MapPinIcon className="h-4 w-4"/>{site.direccion || site.ubicacion_entrenamiento || 'Sin ubicación informada'}</p></div>
          <div className="flex flex-wrap gap-2">{!site.principal ? <button onClick={() => void setPrincipalSite(site.id)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#b7c0cc]">Marcar principal</button> : null}<button onClick={() => void toggleSite(site)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#b7c0cc]">{site.activa ? 'Desactivar' : 'Activar'}</button></div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{site.ramas.length
          ? site.ramas.map((branch) => <div key={branch.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{branch.nombre}</p><p className="text-xs text-[#8995a4]">{branch.disciplina}</p></div><div className="text-right">{branch.principal ? <span className="text-[10px] font-black uppercase text-[#D8BE87]">Principal</span> : null}</div></div>
              <div className="mt-3 rounded-xl border border-white/5 bg-white/[.025] p-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase tracking-[.13em] text-[#7d8999]">Categorías</p><button onClick={() => openCategoryModal(site, branch)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#caff00] px-2.5 py-1.5 text-[10px] font-black text-[#11170f]"><PlusIcon className="h-3.5 w-3.5"/>Categoría</button></div><CategoryChips branch={branch}/></div>
              <button onClick={() => setEditingEvaluationBranch(branch)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/8 px-3 py-2.5 text-left text-xs font-black text-[#70e4df] transition hover:border-[#289E9D]/45 hover:bg-[#289E9D]/12"><span className="inline-flex items-center gap-2"><AdjustmentsHorizontalIcon className="h-4 w-4"/>Criterios de evaluación</span><span>→</span></button>
              <div className="mt-3 flex gap-2">{!branch.principal ? <button onClick={() => void setPrincipalBranch(branch.id)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-[#b7c0cc]">Principal</button> : null}<button onClick={() => void toggleBranch(branch)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-[#b7c0cc]">{branch.activa ? 'Desactivar' : 'Activar'}</button></div>
            </div>)
          : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-[#657184]">Esta sede todavía no tiene ramas.</div>}</div>
      </article>)}
    </section>}

    {editingEvaluationBranch ? <EvaluationCriteriaEditor branch={editingEvaluationBranch} onClose={() => setEditingEvaluationBranch(null)} onSaved={load} /> : null}

    {categoryModal ? <div className="fixed inset-0 z-[120] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) setCategoryModal(null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="category-modal-title" className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#151b25] shadow-[0_30px_90px_rgba(0,0,0,.48)]">
        <div className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#caff00]">Nueva categoría</p><h2 id="category-modal-title" className="mt-1 text-2xl font-black text-white">{categoryModal.branch.nombre}</h2><p className="mt-1 text-sm text-[#9aa6a0]">{categoryModal.site.nombre} · {categoryModal.branch.disciplina}</p></div><button onClick={() => setCategoryModal(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-[#b8c1b9] hover:bg-white/5 hover:text-white"><XMarkIcon className="h-5 w-5"/></button></div>
        <div className="space-y-4 p-5 sm:p-6">
          <div><label className="text-xs font-black text-[#c9d1cb]">Nombre de la categoría *</label><input autoFocus className={`${input} mt-2`} placeholder="Ej.: Sub 12, U15, Adultos" value={categoryModalForm.nombre} onChange={(event) => setCategoryModalForm((current) => ({ ...current, nombre:event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter' && !categorySaving) void createCategoryForBranch(); }}/></div>
          <div><label className="text-xs font-black text-[#c9d1cb]">Descripción <span className="font-semibold text-[#768278]">(opcional)</span></label><textarea className={`${input} mt-2 min-h-24 resize-y`} placeholder="Información útil para identificar esta categoría" value={categoryModalForm.descripcion} onChange={(event) => setCategoryModalForm((current) => ({ ...current, descripcion:event.target.value }))}/></div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-white/10 p-5 sm:flex-row sm:justify-end"><button onClick={() => setCategoryModal(null)} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-[#c3ccc4]">Cancelar</button><button disabled={categorySaving || !categoryModalForm.nombre.trim()} onClick={() => void createCategoryForBranch()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#caff00] px-5 py-3 text-sm font-black text-[#10160f] disabled:cursor-not-allowed disabled:opacity-40"><PlusIcon className="h-5 w-5"/>{categorySaving ? 'Creando…' : 'Crear categoría'}</button></div>
      </div>
    </div> : null}
  </div>;
}
