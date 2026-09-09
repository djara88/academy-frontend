import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};

export default function NuevoTorneoMultirama(){
  const navigate=useNavigate();
  const {notify}=useAppDialog();
  const [branches,setBranches]=useState<Branch[]>([]);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({rama_id:'',nombre:'',organizador:'',ubicacion:'',reglamento_url:'',fecha_inicio:'',fecha_fin:'',costo_inscripcion:'0',permite_cuotas:false,max_cuotas:'2'});

  useEffect(()=>{const load=async()=>{try{const response=await api.get('/api/academias/rama-principal');const data=response.data.data;const ramaId=data?.rama_principal_id||data?.ramas?.[0]?.id||'';setBranches(data?.ramas||[]);setForm(current=>({...current,rama_id:ramaId}));}catch(error){console.error(error);}};void load();},[]);
  const selected=branches.find(branch=>branch.id===form.rama_id)||null;

  const save=async()=>{
    if(!form.rama_id||!form.nombre.trim())return void notify('Selecciona la rama e ingresa el nombre del campeonato o competencia.');
    if(form.fecha_inicio&&form.fecha_fin&&form.fecha_fin<form.fecha_inicio)return void notify('La fecha de término no puede ser anterior a la fecha de inicio.');
    setSaving(true);
    try{
      const response=await api.post('/api/torneos',{...form,tipo_gestion:'externo',formato_competencia:'seguimiento',costo_inscripcion:Number(form.costo_inscripcion)||0,max_cuotas:Number(form.max_cuotas)||2});
      await notify('Competencia creada. El siguiente paso es definir quiénes participarán. No necesitas tener partidos programados para enviar la convocatoria.');
      navigate(`/torneos/${response.data.data.id}`);
    }catch(error:any){
      await notify(error.response?.data?.error||'No fue posible crear la competencia.');
    }finally{
      setSaving(false);
    }
  };

  return <DirectorPage className="max-w-[1250px]">
    <div className="competition-record competition-intake">
      <header className="competition-record-command">
        <div className="competition-record-command-copy">
          <p className="competition-record-kicker">Competition Intake</p>
          <h1>Registrar competencia</h1>
          <p>Define la competencia una sola vez. Después Lestra abre el control operacional para convocatoria, pagos, eventos, resultados e historial.</p>
        </div>
        <div className="competition-record-actions"><button type="button" onClick={()=>navigate('/torneos')} className={DIRECTOR_BUTTON_DARK}>← Volver a temporada</button></div>
      </header>

      <section className="competition-intake-track" aria-label="Flujo de registro de competencia">
        <span><small>01</small><strong>Rama</strong></span>
        <span><small>02</small><strong>Competencia</strong></span>
        <span><small>03</small><strong>Inscripción</strong></span>
        <span className="is-next"><small>Después</small><strong>Convocatoria</strong></span>
      </section>

      <section className="competition-intake-workbench">
        <div className="competition-intake-form">
          <section className="competition-intake-section">
            <p className="competition-record-kicker" style={{color:'var(--ls-accent-text)'}}>01 · Contexto deportivo</p>
            <h2>Rama de la competencia</h2>
            <p>Esta decisión determina categorías elegibles, plantel y modelo de resultados.</p>
            <div className="competition-intake-fields"><label className="span-2"><span>Rama *</span><select value={form.rama_id} onChange={(event)=>setForm({...form,rama_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Selecciona rama</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select><small>{selected?`Lestra utilizará el modelo deportivo de ${selected.disciplina}.`:'Selecciona la rama antes de continuar.'}</small></label></div>
          </section>

          <section className="competition-intake-section">
            <p className="competition-record-kicker" style={{color:'var(--ls-accent-text)'}}>02 · Identidad</p>
            <h2>Datos de la competencia</h2>
            <p>Lo que Dirección necesita reconocer rápido durante toda la temporada.</p>
            <div className="competition-intake-fields">
              <label className="span-2"><span>Nombre *</span><input value={form.nombre} onChange={(event)=>setForm({...form,nombre:event.target.value})} className={DIRECTOR_FIELD} placeholder="Ej. Campeonato Comunal 2026"/></label>
              <label><span>Organizador</span><input value={form.organizador} onChange={(event)=>setForm({...form,organizador:event.target.value})} className={DIRECTOR_FIELD} placeholder="Liga, asociación o club"/></label>
              <label><span>Lugar / recinto general</span><input value={form.ubicacion} onChange={(event)=>setForm({...form,ubicacion:event.target.value})} className={DIRECTOR_FIELD} placeholder="Ej. Gimnasio Municipal"/></label>
              <label><span>Fecha inicio</span><input type="date" value={form.fecha_inicio} onChange={(event)=>setForm({...form,fecha_inicio:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label><span>Fecha término</span><input type="date" value={form.fecha_fin} onChange={(event)=>setForm({...form,fecha_fin:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label className="span-2"><span>Reglamento / bases</span><input value={form.reglamento_url} onChange={(event)=>setForm({...form,reglamento_url:event.target.value})} className={DIRECTOR_FIELD} placeholder="https://..."/><small>Opcional. Se mantendrá disponible dentro del Competition Control Room.</small></label>
            </div>
          </section>

          <section className="competition-intake-section">
            <p className="competition-record-kicker" style={{color:'var(--ls-accent-text)'}}>03 · Compromiso económico</p>
            <h2>Inscripción por deportista</h2>
            <p>Solo el valor asociado a participar en esta competencia. Los gastos internos continúan en Finanzas.</p>
            <div className="competition-intake-fields">
              <label><span>Valor por deportista</span><input type="number" min="0" value={form.costo_inscripcion} onChange={(event)=>setForm({...form,costo_inscripcion:event.target.value})} className={DIRECTOR_FIELD}/><small>0 = participación gratuita.</small></label>
              <div className="competition-intake-payment"><label><input type="checkbox" checked={form.permite_cuotas} onChange={(event)=>setForm({...form,permite_cuotas:event.checked})}/><span>Permitir cuotas<small>La familia podrá seleccionar modalidad de pago durante su confirmación.</small></span></label>{form.permite_cuotas?<label style={{display:'block',marginTop:10}}><span style={{display:'block',marginBottom:5}}>Máximo de cuotas</span><input type="number" min="2" max="12" value={form.max_cuotas} onChange={(event)=>setForm({...form,max_cuotas:event.target.value})} className={DIRECTOR_FIELD}/></label>:null}</div>
            </div>
          </section>
        </div>

        <aside className="competition-intake-side">
          <section className="competition-intake-preview">
            <p className="competition-record-kicker">Registro en preparación</p>
            <strong>{form.nombre.trim()||'Nueva competencia'}</strong>
            <span>{selected?`${selected.disciplina} · ${selected.nombre}${selected.sedes?.nombre?` · ${selected.sedes.nombre}`:''}`:'Rama por definir'}</span>
            <span>{form.fecha_inicio||'Inicio por definir'}{form.fecha_fin?` → ${form.fecha_fin}`:''}</span>
          </section>
          <section className="competition-intake-next"><strong>Qué ocurre al crearla</strong><p>Entrarás al Competition Control Room. Ahí defines el plantel por categoría, envías convocatorias y sigues respuestas, pagos y próximos eventos.</p></section>
          <button disabled={saving} onClick={()=>void save()} className={`${DIRECTOR_BUTTON} w-full`}>{saving?'Creando…':'Crear y abrir control de competencia'}</button>
        </aside>
      </section>
    </div>
  </DirectorPage>;
}
