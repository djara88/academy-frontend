import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};

const field='w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]';
const panel='rounded-[24px] border border-white/10 bg-[#151b25]';

export default function NuevoTorneoMultirama(){
  const navigate=useNavigate();
  const {notify}=useAppDialog();
  const [branches,setBranches]=useState<Branch[]>([]);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    rama_id:'',
    nombre:'',
    organizador:'',
    ubicacion:'',
    reglamento_url:'',
    fecha_inicio:'',
    fecha_fin:'',
    costo_inscripcion:'0',
    permite_cuotas:false,
    max_cuotas:'2',
  });

  useEffect(()=>{
    const load=async()=>{
      try{
        const response=await api.get('/api/academias/rama-principal');
        const data=response.data.data;
        const ramaId=data?.rama_principal_id||data?.ramas?.[0]?.id||'';
        setBranches(data?.ramas||[]);
        setForm((current)=>({...current,rama_id:ramaId}));
      }catch(error){console.error(error);}
    };
    void load();
  },[]);

  const selected=branches.find((branch)=>branch.id===form.rama_id)||null;

  const save=async()=>{
    if(!form.rama_id||!form.nombre.trim())return void notify('Selecciona la rama e ingresa el nombre del campeonato o competencia.');
    setSaving(true);
    try{
      const response=await api.post('/api/torneos',{
        ...form,
        tipo_gestion:'externo',
        formato_competencia:'seguimiento',
        costo_inscripcion:Number(form.costo_inscripcion)||0,
        max_cuotas:Number(form.max_cuotas)||2,
      });
      await notify('Competencia creada. Ahora puedes convocar alumnos y agregar sus partidos, duelos, pruebas o presentaciones.');
      navigate(`/torneos/${response.data.data.id}`);
    }catch(error:any){
      await notify(error.response?.data?.error||'No fue posible crear la competencia.');
    }finally{setSaving(false);}
  };

  return <div className="mx-auto max-w-4xl space-y-6 pb-16">
    <button onClick={()=>navigate('/torneos')} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-[#c3ccd6]">← Volver a competencias</button>

    <section className="rounded-[28px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.15),transparent_38%),#151b25] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Competencias · Lestra</p>
      <h1 className="mt-2 text-3xl font-black text-white">Registrar campeonato o competencia</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Registra una competencia en la que participa tu academia. Después podrás asociarle todos sus eventos deportivos: partidos, duelos, juegos, pruebas, carreras o presentaciones, según la disciplina.</p>
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">1</span><div><h2 className="font-black text-white">Rama deportiva</h2><p className="text-xs text-[#8b949e]">Define qué categorías, alumnos y tipo de resultados estarán disponibles.</p></div></div>
      <label className="mt-5 block"><span className="mb-1 block text-sm font-black text-white">Rama *</span><select value={form.rama_id} onChange={(event)=>setForm({...form,rama_id:event.target.value})} className={field}><option value="">Selecciona rama</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></label>
      {selected?<div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-200">🏅 Competencia de <strong>{selected.disciplina}</strong>. Lestra adaptará automáticamente los eventos, resultados y métricas a esta disciplina.</div>:null}
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">2</span><div><h2 className="font-black text-white">Datos de la competencia</h2><p className="text-xs text-[#8b949e]">Información general para Dirección, profesores y convocatorias.</p></div></div>
      <div className="mt-5 space-y-4">
        <label className="block"><span className="mb-1 block text-sm font-black text-white">Nombre *</span><input value={form.nombre} onChange={(event)=>setForm({...form,nombre:event.target.value})} className={field} placeholder="Ej. Campeonato Comunal 2026"/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Organizador</span><input value={form.organizador} onChange={(event)=>setForm({...form,organizador:event.target.value})} className={field} placeholder="Ej. Asociación, liga o club"/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Lugar / recinto general</span><input value={form.ubicacion} onChange={(event)=>setForm({...form,ubicacion:event.target.value})} className={field} placeholder="Ej. Gimnasio Municipal"/></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha inicio</span><input type="date" value={form.fecha_inicio} onChange={(event)=>setForm({...form,fecha_inicio:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha término</span><input type="date" value={form.fecha_fin} onChange={(event)=>setForm({...form,fecha_fin:event.target.value})} className={field}/></label></div>
        <label className="block"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Reglamento / bases (opcional)</span><input value={form.reglamento_url} onChange={(event)=>setForm({...form,reglamento_url:event.target.value})} className={field} placeholder="https://..."/><span className="mt-1 block text-[11px] leading-4 text-[#697586]">Guarda el enlace oficial para tener las bases de la competencia a mano.</span></label>
      </div>
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">3</span><div><h2 className="font-black text-white">Inscripción del alumno</h2><p className="text-xs text-[#8b949e]">Solo define lo que paga el alumno por participar. Los gastos de la academia se registran en Finanzas → Egresos.</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Valor de inscripción por alumno</span><input type="number" min="0" value={form.costo_inscripcion} onChange={(event)=>setForm({...form,costo_inscripcion:event.target.value})} className={field}/><span className="mt-1 block text-[11px] text-[#697586]">Déjalo en 0 si la participación es gratuita.</span></label><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><label className="flex items-start gap-3 text-sm font-bold text-[#c3ccd6]"><input type="checkbox" checked={form.permite_cuotas} onChange={(event)=>setForm({...form,permite_cuotas:event.target.checked})} className="mt-1 accent-[#C8A96B]"/><span>Permitir pago en cuotas<span className="mt-1 block text-xs font-normal leading-5 text-[#697586]">La familia podrá seleccionar cuotas durante la confirmación por WhatsApp.</span></span></label>{form.permite_cuotas?<label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Máximo de cuotas</span><input type="number" min="2" max="12" value={form.max_cuotas} onChange={(event)=>setForm({...form,max_cuotas:event.target.value})} className={field}/></label>:null}</div></div>
    </section>

    <section className="rounded-2xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-4"><p className="text-sm font-black text-[#bff8f5]">¿Qué ocurre después?</p><p className="mt-1 text-xs leading-5 text-[#8fc9c7]">Desde la competencia podrás convocar alumnos y abrir <strong>Competencias y resultados</strong> para agregar cada evento real: un partido de fútbol, un duelo de tenis o artes marciales, una prueba de natación, una carrera de atletismo o una presentación de gimnasia.</p></section>

    <button disabled={saving} onClick={()=>void save()} className="min-h-12 w-full rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] disabled:opacity-50">{saving?'Creando...':'Crear competencia'}</button>
  </div>;
}
