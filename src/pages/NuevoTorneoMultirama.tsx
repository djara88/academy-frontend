import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_FIELD, DirectorHero, DirectorPage, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

export default function NuevoTorneoMultirama(){
  const navigate=useNavigate();
  const {notify}=useAppDialog();
  const [branches,setBranches]=useState<Branch[]>([]);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({rama_id:'',nombre:'',organizador:'',ubicacion:'',reglamento_url:'',fecha_inicio:'',fecha_fin:'',costo_inscripcion:'0',permite_cuotas:false,max_cuotas:'2'});

  useEffect(()=>{const load=async()=>{try{const response=await api.get('/api/academias/rama-principal');const data=response.data.data;const ramaId=data?.rama_principal_id||data?.ramas?.[0]?.id||'';setBranches(data?.ramas||[]);setForm(current=>({...current,rama_id:ramaId}));}catch(error){console.error(error);}};void load();},[]);
  const selected=branches.find(branch=>branch.id===form.rama_id)||null;
  const save=async()=>{if(!form.rama_id||!form.nombre.trim())return void notify('Selecciona la rama e ingresa el nombre del campeonato o competencia.');setSaving(true);try{const response=await api.post('/api/torneos',{...form,tipo_gestion:'externo',formato_competencia:'seguimiento',costo_inscripcion:Number(form.costo_inscripcion)||0,max_cuotas:Number(form.max_cuotas)||2});await notify('Competencia creada. Ahora puedes convocar alumnos y agregar sus partidos, duelos, pruebas o presentaciones.');navigate(`/torneos/${response.data.data.id}`);}catch(error:any){await notify(error.response?.data?.error||'No fue posible crear la competencia.');}finally{setSaving(false);}};

  return <DirectorPage className="max-w-5xl">
    <DirectorHero eyebrow="Competencias · Lestra" title="Registrar competencia" description="Crea el contenedor deportivo y luego agrega sus eventos reales: partidos, duelos, pruebas, carreras o presentaciones según la disciplina." actions={<button onClick={()=>navigate('/torneos')} className={DIRECTOR_BUTTON_DARK}>← Competencias</button>} aside={selected?<div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Rama seleccionada</p><p className="mt-2 text-xl font-black text-white">{selected.nombre}</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{selected.disciplina}{selected.sedes?.nombre?` · ${selected.sedes.nombre}`:''}</p></div>:null}/>

    <section className="grid gap-3 sm:grid-cols-3"><DirectorStat label="Paso 1" value="Rama" tone="lime"/><DirectorStat label="Paso 2" value="Datos"/><DirectorStat label="Paso 3" value="Inscripción" tone="dark"/></section>

    <DirectorPanel className="p-5 sm:p-6">
      <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso 1</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Rama deportiva</h2><p className="mt-1 text-sm text-[#697468]">Define qué categorías, alumnos y tipo de resultados estarán disponibles.</p></div>
      <label className="mt-5 block"><span className={labelClass}>Rama *</span><select value={form.rama_id} onChange={(event)=>setForm({...form,rama_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Selecciona rama</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></label>
      {selected?<div className="mt-3 rounded-[16px] border border-[#cde995] bg-[#f3fadf] p-3 text-sm text-[#4f6900]">Lestra adaptará automáticamente los eventos, resultados y métricas a <strong>{selected.disciplina}</strong>.</div>:null}
    </DirectorPanel>

    <DirectorPanel className="p-5 sm:p-6">
      <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso 2</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Datos de la competencia</h2><p className="mt-1 text-sm text-[#697468]">Información general para Dirección, profesores y convocatorias.</p></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className={labelClass}>Nombre *</span><input value={form.nombre} onChange={(event)=>setForm({...form,nombre:event.target.value})} className={DIRECTOR_FIELD} placeholder="Ej. Campeonato Comunal 2026"/></label>
        <label><span className={labelClass}>Organizador</span><input value={form.organizador} onChange={(event)=>setForm({...form,organizador:event.target.value})} className={DIRECTOR_FIELD} placeholder="Ej. Asociación, liga o club"/></label>
        <label><span className={labelClass}>Lugar / recinto general</span><input value={form.ubicacion} onChange={(event)=>setForm({...form,ubicacion:event.target.value})} className={DIRECTOR_FIELD} placeholder="Ej. Gimnasio Municipal"/></label>
        <label><span className={labelClass}>Fecha inicio</span><input type="date" value={form.fecha_inicio} onChange={(event)=>setForm({...form,fecha_inicio:event.target.value})} className={DIRECTOR_FIELD}/></label>
        <label><span className={labelClass}>Fecha término</span><input type="date" value={form.fecha_fin} onChange={(event)=>setForm({...form,fecha_fin:event.target.value})} className={DIRECTOR_FIELD}/></label>
        <label className="sm:col-span-2"><span className={labelClass}>Reglamento / bases (opcional)</span><input value={form.reglamento_url} onChange={(event)=>setForm({...form,reglamento_url:event.target.value})} className={DIRECTOR_FIELD} placeholder="https://..."/><span className="mt-1.5 block text-[11px] leading-4 text-[#758074]">Guarda el enlace oficial para tener las bases a mano.</span></label>
      </div>
    </DirectorPanel>

    <DirectorPanel className="p-5 sm:p-6">
      <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso 3</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Inscripción del alumno</h2><p className="mt-1 text-sm text-[#697468]">Define solo lo que paga el alumno por participar. Los gastos de la academia se registran en Finanzas → Egresos.</p></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className={labelClass}>Valor de inscripción por alumno</span><input type="number" min="0" value={form.costo_inscripcion} onChange={(event)=>setForm({...form,costo_inscripcion:event.target.value})} className={DIRECTOR_FIELD}/><span className="mt-1.5 block text-[11px] text-[#758074]">Déjalo en 0 si la participación es gratuita.</span></label>
        <div className="rounded-[18px] border border-[#dfe5dc] bg-[#f6f8f4] p-4"><label className="flex items-start gap-3 text-sm font-bold text-[#111711]"><input type="checkbox" checked={form.permite_cuotas} onChange={(event)=>setForm({...form,permite_cuotas:event.target.checked})} className="mt-1 accent-[#9fcf00]"/><span>Permitir pago en cuotas<span className="mt-1 block text-xs font-normal leading-5 text-[#697468]">La familia podrá seleccionar cuotas durante la confirmación.</span></span></label>{form.permite_cuotas?<label className="mt-3 block"><span className={labelClass}>Máximo de cuotas</span><input type="number" min="2" max="12" value={form.max_cuotas} onChange={(event)=>setForm({...form,max_cuotas:event.target.value})} className={DIRECTOR_FIELD}/></label>:null}</div>
      </div>
    </DirectorPanel>

    <DirectorPanel className="border-[#cde995] bg-[#f3fadf] p-4"><p className="text-sm font-black text-[#435b00]">¿Qué ocurre después?</p><p className="mt-1 text-xs leading-5 text-[#5f6f4c]">Desde la competencia podrás convocar alumnos y abrir <strong>Eventos y resultados</strong> para registrar cada encuentro o prueba real.</p></DirectorPanel>
    <button disabled={saving} onClick={()=>void save()} className={`${DIRECTOR_BUTTON} w-full`}>{saving?'Creando...':'Crear competencia'}</button>
  </DirectorPage>;
}
