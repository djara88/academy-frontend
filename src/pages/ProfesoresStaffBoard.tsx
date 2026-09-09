import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { getAcademyName } from '../config/brand';
import DirectorProfessorCasesPanel from '../components/profesor/DirectorProfessorCasesPanel';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

type Category={id:string;nombre:string;descripcion?:string|null;sede_id?:string|null;rama_id?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
type Professor={id:string;nombre_completo:string;email:string;telefono?:string|null;activo:boolean;ultimo_acceso?:string|null;categorias:Category[]};
type Payload={data:Professor[];categorias:Category[];cupos:{used:number;max:number;remaining:number};plan?:string};
type FormState={nombre_completo:string;email:string;telefono:string;categoria_ids:string[]};
type ProfessorActivity={id:string;tipo:'Bitácora'|'Preparación';updated_at:string;objetivo?:string;incidencias?:string;intensidad?:string;sistema_juego?:string;estado?:string;categorias?:{nombre:string}|null;usuarios?:{nombre_completo:string}|null;entrenamientos?:{fecha:string;hora?:string|null}|null;partidos?:{rival:string;fecha:string;hora?:string|null}|null};

const emptyForm:FormState={nombre_completo:'',email:'',telefono:'',categoria_ids:[]};
const branchLabel=(category:Category)=>`${category.ramas?.disciplina||'Sin disciplina'} · ${category.ramas?.nombre||'Rama pendiente'}`;
const lastAccess=(value?:string|null)=>value?new Date(value).toLocaleString('es-CL',{dateStyle:'short',timeStyle:'short'}):'Sin acceso registrado';

export default function ProfesoresStaffBoard(){
  const {user}=useAuth();
  const {notify,confirmAction}=useAppDialog();
  const location=useLocation();
  const navigate=useNavigate();
  const fromSetup=new URLSearchParams(location.search).get('setup')==='1';
  const academyName=getAcademyName(user?.nombre_academia);
  const [payload,setPayload]=useState<Payload|null>(null);
  const [activity,setActivity]=useState<ProfessorActivity[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [modalOpen,setModalOpen]=useState(false);
  const [editing,setEditing]=useState<Professor|null>(null);
  const [form,setForm]=useState<FormState>(emptyForm);
  const [credential,setCredential]=useState<{email:string;password:string;sent:boolean}|null>(null);
  const [branchFilter,setBranchFilter]=useState('Todas');
  const [setupModalHandled,setSetupModalHandled]=useState(false);

  const load=useCallback(async()=>{setLoading(true);try{const [professorsResponse,activityResponse]=await Promise.all([api.get('/api/profesores'),api.get('/api/profesores/actividad')]);setPayload(professorsResponse.data);setActivity(activityResponse.data.data||[]);}catch(error:any){await notify(error.response?.data?.error||'No fue posible cargar el equipo técnico.',{title:academyName});}finally{setLoading(false);}},[academyName,notify]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{if(!fromSetup||setupModalHandled||loading||!payload)return;setSetupModalHandled(true);if(!payload.cupos.remaining)return;setEditing(null);setForm(emptyForm);setModalOpen(true);},[fromSetup,setupModalHandled,loading,payload]);

  const branches=useMemo(()=>{const map=new Map<string,{id:string;label:string}>();for(const category of payload?.categorias||[])if(category.rama_id)map.set(category.rama_id,{id:category.rama_id,label:branchLabel(category)});return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,'es'));},[payload]);
  const groupedCategories=useMemo(()=>{const groups=new Map<string,{label:string;site:string;categories:Category[]}>();for(const category of payload?.categorias||[]){const key=category.rama_id||'sin-rama';const current=groups.get(key)||{label:branchLabel(category),site:category.sedes?.nombre||'Sin sede',categories:[]};current.categories.push(category);groups.set(key,current);}return [...groups.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'es'));},[payload]);
  const occupiedByOthers=useMemo(()=>new Set((payload?.data||[]).filter(professor=>professor.id!==editing?.id&&professor.activo).flatMap(professor=>professor.categorias.map(category=>category.id))),[payload?.data,editing?.id]);
  const visibleProfessors=useMemo(()=>branchFilter==='Todas'?(payload?.data||[]):(payload?.data||[]).filter(professor=>professor.categorias.some(category=>category.rama_id===branchFilter)),[payload?.data,branchFilter]);
  const activeAssignmentIds=useMemo(()=>new Set((payload?.data||[]).filter(professor=>professor.activo).flatMap(professor=>professor.categorias.map(category=>category.id))),[payload?.data]);
  const coverage=useMemo(()=>branches.map(branch=>{const categories=(payload?.categorias||[]).filter(category=>category.rama_id===branch.id);const covered=categories.filter(category=>activeAssignmentIds.has(category.id)).length;return {...branch,total:categories.length,covered,pending:Math.max(0,categories.length-covered)};}),[branches,payload?.categorias,activeAssignmentIds]);

  const openCreate=()=>{setEditing(null);setForm(emptyForm);setModalOpen(true);};
  const openEdit=(professor:Professor)=>{setEditing(professor);setForm({nombre_completo:professor.nombre_completo,email:professor.email,telefono:professor.telefono||'',categoria_ids:professor.categorias.map(category=>category.id)});setModalOpen(true);};
  const toggleCategory=(id:string)=>setForm(current=>({...current,categoria_ids:current.categoria_ids.includes(id)?current.categoria_ids.filter(item=>item!==id):[...current.categoria_ids,id]}));
  const save=async(event:FormEvent)=>{event.preventDefault();if(!form.categoria_ids.length)return void notify('Selecciona al menos una categoría de una rama.',{title:academyName});setSaving(true);try{if(editing){await api.put(`/api/profesores/${editing.id}`,form);await notify('Profesor y categorías por rama actualizados.',{title:academyName});}else{const response=await api.post('/api/profesores',form);setCredential({email:form.email,password:response.data.temporary_password,sent:response.data.email_sent});}setModalOpen(false);await load();}catch(error:any){await notify(error.response?.data?.error||'No fue posible guardar al profesor.',{title:academyName});}finally{setSaving(false);}};
  const toggleStatus=async(professor:Professor)=>{const accepted=await confirmAction(professor.activo?`Se cerrará el acceso de ${professor.nombre_completo}.`:`Se reactivará el acceso de ${professor.nombre_completo}.`,{title:academyName,confirmLabel:professor.activo?'Desactivar':'Reactivar',tone:professor.activo?'danger':'default'});if(!accepted)return;try{await api.patch(`/api/profesores/${professor.id}/estado`,{activo:!professor.activo});await load();}catch(error:any){await notify(error.response?.data?.error||'No fue posible cambiar el estado.',{title:academyName});}};
  const resetPassword=async(professor:Professor)=>{const accepted=await confirmAction(`Se generará una nueva contraseña temporal para ${professor.nombre_completo}.`,{title:academyName,confirmLabel:'Generar clave'});if(!accepted)return;try{const response=await api.post(`/api/profesores/${professor.id}/reset-password`);setCredential({email:professor.email,password:response.data.temporary_password,sent:response.data.email_sent});}catch(error:any){await notify(error.response?.data?.error||'No fue posible restablecer la contraseña.',{title:academyName});}};

  return <DirectorPage className="max-w-[1450px]">
    <div className="staff-board">
      {fromSetup?<button type="button" onClick={()=>navigate('/puesta-en-marcha')} className={DIRECTOR_BUTTON_GHOST}>← Volver a Puesta en Marcha</button>:null}
      <header className="staff-board-command">
        <div className="staff-board-command-copy"><p className="staff-board-kicker">Staff Board · Equipo técnico</p><h1>Quién está a cargo de cada plantel</h1><p>La unidad de trabajo no es el “usuario profesor”: es la cobertura real de rama, sede y categoría, con acceso, carga asignada y actividad reciente.</p></div>
        <div className="staff-board-command-actions"><button type="button" disabled={!payload?.cupos.remaining} onClick={openCreate} className={DIRECTOR_BUTTON}>+ Incorporar profesor</button></div>
      </header>

      <section className="staff-board-toolbar">
        <label className="staff-board-field"><span>Filtrar por rama</span><select value={branchFilter} onChange={event=>setBranchFilter(event.target.value)} className={DIRECTOR_FIELD}><option value="Todas">Todo el equipo técnico</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.label}</option>)}</select></label>
        <div className="staff-board-capacity" aria-label="Capacidad de profesores"><span><small>Asignados</small><strong>{payload?.cupos.used||0}</strong></span><span><small>Límite</small><strong>{payload?.cupos.max||0}</strong></span><span className="is-open"><small>Disponibles</small><strong>{payload?.cupos.remaining||0}</strong></span></div>
      </section>

      <section className="staff-board-layout">
        <div className="staff-board-roster">
          <div className="staff-board-section-head"><div><p className="staff-board-kicker" style={{color:'var(--ls-accent-text)'}}>Roster técnico</p><h2>Profesores y categorías a cargo</h2><p>Una categoría muestra su titular operativo; los accesos desactivados quedan explícitos.</p></div><div className="staff-board-section-count"><strong>{visibleProfessors.length}</strong><small>profesores</small></div></div>
          {loading?<div className="staff-board-loading">Cargando equipo técnico…</div>:<div className="staff-board-list">{visibleProfessors.map(professor=><article key={professor.id} className={`staff-board-row ${professor.activo?'':'is-disabled'}`}>
            <span className="staff-board-avatar">{professor.nombre_completo.slice(0,1).toUpperCase()}</span>
            <div className="staff-board-person"><strong>{professor.nombre_completo}</strong><small>{professor.email}</small><span className={`staff-board-status ${professor.activo?'':'is-off'}`}>{professor.activo?'Acceso activo':'Acceso cerrado'}</span><small>{lastAccess(professor.ultimo_acceso)}</small></div>
            <div className="staff-board-assignment">{professor.categorias.length?professor.categorias.map(category=><span key={category.id}><strong>{category.ramas?.disciplina||'Rama'}</strong>{category.nombre}{category.sedes?.nombre?` · ${category.sedes.nombre}`:''}</span>):<span>Sin categoría asignada</span>}</div>
            <div className="staff-board-load"><strong>{professor.categorias.length}</strong><small>categorías</small></div>
            <div className="staff-board-actions"><button type="button" onClick={()=>openEdit(professor)} className={DIRECTOR_BUTTON_GHOST}>Asignación</button><button type="button" onClick={()=>void resetPassword(professor)} className={DIRECTOR_BUTTON_GHOST}>Clave</button><button type="button" onClick={()=>void toggleStatus(professor)} className={professor.activo?DIRECTOR_BUTTON_DARK:DIRECTOR_BUTTON}>{professor.activo?'Desactivar':'Reactivar'}</button></div>
          </article>)}{!visibleProfessors.length?<div className="staff-board-empty"><strong>No hay profesores en este contexto.</strong><span>{branchFilter==='Todas'?'Incorpora el primer profesor y asígnale una categoría.':'Prueba otra rama o asigna un profesor a sus categorías.'}</span></div>:null}</div>}
        </div>

        <aside className="staff-board-side">
          <section className="staff-board-coverage"><div className="staff-board-section-head"><div><p className="staff-board-kicker" style={{color:'var(--ls-accent-text)'}}>Cobertura</p><h3>Ramas y categorías</h3><p>Detecta categorías sin profesor activo antes de que afecten la operación.</p></div></div><div className="staff-board-coverage-list">{coverage.map(row=><div key={row.id} className="staff-board-coverage-row"><div><strong>{row.label}</strong><small>{row.covered}/{row.total} categorías cubiertas</small></div><span>{row.pending?`${row.pending} pendiente${row.pending===1?'':'s'}`:'Completa'}</span></div>)}{!coverage.length?<div className="staff-board-empty">Sin ramas configuradas.</div>:null}</div></section>
          <section className="staff-board-activity"><div className="staff-board-section-head"><div><p className="staff-board-kicker" style={{color:'var(--ls-accent-text)'}}>Actividad</p><h3>Último trabajo técnico</h3><p>Bitácoras y preparaciones registradas por el equipo.</p></div></div><div className="staff-board-activity-list">{activity.slice(0,8).map(item=><article key={`${item.tipo}-${item.id}`} className="staff-board-activity-row"><small>{new Date(item.updated_at).toLocaleString('es-CL')} · {item.tipo}</small><strong>{item.categorias?.nombre||'Categoría'}{item.tipo==='Preparación'?` · ${item.partidos?.rival||'competencia'}`:''}</strong><p>{item.usuarios?.nombre_completo||'Profesor'} · {item.entrenamientos?.fecha||item.partidos?.fecha||'Sin fecha'}{item.objetivo?` · ${item.objetivo}`:''}</p></article>)}{!activity.length?<div className="staff-board-empty">La actividad aparecerá cuando el equipo registre trabajo técnico.</div>:null}</div></section>
        </aside>
      </section>

      <DirectorProfessorCasesPanel />

      {modalOpen?<div className="staff-board-dialog-backdrop"><form onSubmit={save} className="staff-board-dialog" role="dialog" aria-modal="true" aria-label={editing?'Editar profesor':'Nuevo profesor'}><div className="staff-board-dialog-head"><div><p className="staff-board-kicker" style={{color:'var(--ls-accent-text)'}}>Permisos por plantel</p><h2>{editing?'Editar profesor':'Incorporar profesor'}</h2><p>Selecciona exactamente las categorías que tendrá a cargo.</p></div><button type="button" onClick={()=>setModalOpen(false)} className="staff-board-dialog-close" aria-label="Cerrar">×</button></div><div className="staff-board-dialog-fields"><input className={DIRECTOR_FIELD} required minLength={3} placeholder="Nombre completo" value={form.nombre_completo} onChange={event=>setForm({...form,nombre_completo:event.target.value})}/><input className={DIRECTOR_FIELD} type="email" required disabled={Boolean(editing)} placeholder="Correo" value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/><input className={`${DIRECTOR_FIELD} span-2`} placeholder="Teléfono" value={form.telefono} onChange={event=>setForm({...form,telefono:event.target.value})}/></div><div className="staff-board-category-groups">{groupedCategories.map(([branchId,group])=><fieldset key={branchId} className="staff-board-category-group"><legend>{group.label} · {group.site}</legend><div className="staff-board-category-grid">{group.categories.map(category=>{const occupied=occupiedByOthers.has(category.id);const selected=form.categoria_ids.includes(category.id);return <label key={category.id} className={`staff-board-category-choice ${selected?'is-selected':''} ${occupied?'is-occupied':''}`}><input type="checkbox" disabled={occupied} checked={selected} onChange={()=>toggleCategory(category.id)}/><span><strong>{category.nombre}</strong><small>{occupied?'Ya tiene profesor titular':'Disponible para asignar'}</small></span></label>;})}</div></fieldset>)}{!groupedCategories.length?<div className="staff-board-empty"><strong>Faltan categorías.</strong><span>Configura la estructura antes de incorporar profesores.</span></div>:null}</div><div className="staff-board-dialog-actions"><button type="button" onClick={()=>setModalOpen(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button disabled={saving||!groupedCategories.length} className={DIRECTOR_BUTTON}>{saving?'Guardando…':'Guardar profesor'}</button></div></form></div>:null}

      {credential?<div className="staff-board-dialog-backdrop"><div className="staff-board-credential" role="dialog" aria-modal="true" aria-label="Credencial temporal"><p className="staff-board-kicker" style={{color:'var(--ls-accent-text)'}}>Credencial temporal</p><h2>Acceso listo</h2><p>{credential.sent?'También enviamos estas credenciales por correo.':'Comparte la clave por un canal seguro.'}</p><div className="staff-board-credential-box"><small>Correo</small><strong>{credential.email}</strong><small style={{marginTop:9}}>Contraseña temporal</small><code>{credential.password}</code></div><div className="staff-board-credential-actions"><button type="button" onClick={async()=>{await navigator.clipboard.writeText(credential.password);await notify('Contraseña temporal copiada.',{title:academyName});}} className={DIRECTOR_BUTTON_GHOST}>Copiar</button><button type="button" onClick={()=>setCredential(null)} className={DIRECTOR_BUTTON}>Cerrar</button></div></div></div>:null}
    </div>
  </DirectorPage>;
}
