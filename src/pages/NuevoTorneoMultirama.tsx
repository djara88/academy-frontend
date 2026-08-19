import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};
type CompetitionFormat={code:string;label:string;description:string;structure:boolean;recommended?:boolean};
type Architecture={
  sport:{code:string;label:string;icon:string;usesHeadToHeadScore:boolean};
  managementTypes:{code:'externo'|'organizado';label:string;description:string}[];
  formats:CompetitionFormat[];
};

const field='w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]';
const panel='rounded-[24px] border border-white/10 bg-[#151b25]';

export default function NuevoTorneoMultirama(){
  const navigate=useNavigate();
  const {notify}=useAppDialog();
  const [branches,setBranches]=useState<Branch[]>([]);
  const [architecture,setArchitecture]=useState<Architecture|null>(null);
  const [loadingArchitecture,setLoadingArchitecture]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    rama_id:'',
    tipo_gestion:'externo' as 'externo'|'organizado',
    formato_competencia:'seguimiento',
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

  useEffect(()=>{
    const load=async()=>{
      if(!form.rama_id){setArchitecture(null);return;}
      setLoadingArchitecture(true);
      try{
        const response=await api.get('/api/torneos/formatos',{params:{rama_id:form.rama_id}});
        const data=response.data.data as Architecture;
        setArchitecture(data);
        setForm((current)=>{
          const allowed=data.formats.some((item)=>item.code===current.formato_competencia);
          if(current.tipo_gestion==='externo') return {...current,formato_competencia:'seguimiento'};
          if(allowed&&current.formato_competencia!=='seguimiento') return current;
          const firstStructured=data.formats.find((item)=>item.structure);
          return {...current,formato_competencia:firstStructured?.code||'personalizado'};
        });
      }catch(error:any){
        console.error(error);
        setArchitecture(null);
        await notify(error.response?.data?.error||'No fue posible cargar los formatos disponibles para esta rama.');
      }finally{setLoadingArchitecture(false);}
    };
    void load();
  },[form.rama_id,notify]);

  const selected=branches.find((branch)=>branch.id===form.rama_id)||null;
  const availableFormats=useMemo(()=>architecture?.formats||[],[architecture]);
  const selectedFormat=availableFormats.find((item)=>item.code===form.formato_competencia)||null;

  const changeManagement=(type:'externo'|'organizado')=>{
    if(type==='externo'){
      setForm((current)=>({...current,tipo_gestion:type,formato_competencia:'seguimiento'}));
      return;
    }
    const firstStructured=availableFormats.find((item)=>item.structure);
    setForm((current)=>({...current,tipo_gestion:type,formato_competencia:firstStructured?.code||'personalizado'}));
  };

  const save=async()=>{
    if(!form.rama_id||!form.nombre.trim())return void notify('Selecciona la rama e ingresa el nombre del campeonato o torneo.');
    if(form.tipo_gestion==='organizado'&&!form.formato_competencia)return void notify('Selecciona cómo se organizará la competencia.');
    setSaving(true);
    try{
      const response=await api.post('/api/torneos',{
        ...form,
        costo_inscripcion:Number(form.costo_inscripcion)||0,
        max_cuotas:Number(form.max_cuotas)||2,
      });
      await notify(form.tipo_gestion==='organizado'
        ?'Competencia creada. Ahora podrás configurar divisiones, participantes y fases.'
        :'Campeonato registrado. Lestra hará seguimiento de nuestros deportistas, citaciones, cobros y resultados.');
      navigate(`/torneos/${response.data.data.id}`);
    }catch(error:any){
      await notify(error.response?.data?.error||'No fue posible crear la competencia.');
    }finally{setSaving(false);}
  };

  return <div className="mx-auto max-w-4xl space-y-6 pb-16">
    <button onClick={()=>navigate('/torneos')} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-[#c3ccd6]">← Volver a competencias</button>

    <section className="rounded-[28px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.15),transparent_38%),#151b25] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Competition Engine · Lestra</p>
      <h1 className="mt-2 text-3xl font-black text-white">Crear campeonato o torneo</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Primero define el contexto deportivo y quién administra la competencia. Lestra adapta después la estructura, convocatorias y resultados a cada disciplina.</p>
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">1</span><div><h2 className="font-black text-white">Contexto deportivo</h2><p className="text-xs text-[#8b949e]">La rama define categorías, deportistas y modelo de resultados.</p></div></div>
      <label className="mt-5 block"><span className="mb-1 block text-sm font-black text-white">Rama deportiva *</span><select value={form.rama_id} onChange={(event)=>setForm({...form,rama_id:event.target.value})} className={field}><option value="">Selecciona rama</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></label>
      {selected?<div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-200">{architecture?.sport?.icon||'🏆'} Perfil competitivo: <strong>{architecture?.sport?.label||selected.disciplina}</strong>. Las categorías de otras ramas quedarán fuera de esta competencia.</div>:null}
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">2</span><div><h2 className="font-black text-white">¿Quién administra la competencia?</h2><p className="text-xs text-[#8b949e]">Esta elección determina cuánto debe organizar Lestra.</p></div></div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{(architecture?.managementTypes||[
        {code:'externo' as const,label:'Participamos en un campeonato externo',description:'Un tercero administra fixture, llaves o ranking; Lestra sigue a nuestros deportistas.'},
        {code:'organizado' as const,label:'La academia organiza la competencia',description:'Lestra administrará divisiones, competidores, fases, fixture o llaves.'},
      ]).map((type)=><button type="button" key={type.code} onClick={()=>changeManagement(type.code)} className={`rounded-2xl border p-4 text-left transition ${form.tipo_gestion===type.code?'border-[#289E9D]/60 bg-[#289E9D]/10':'border-white/10 bg-[#0d1117] hover:border-white/20'}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{type.label}</p><p className="mt-2 text-xs leading-5 text-[#8b949e]">{type.description}</p></div><span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${form.tipo_gestion===type.code?'border-[#289E9D] bg-[#289E9D] text-white':'border-[#596575]'}`}>{form.tipo_gestion===type.code?'✓':''}</span></div></button>)}</div>

      {form.tipo_gestion==='organizado'?<div className="mt-5"><p className="mb-2 text-sm font-black text-white">Arquitectura del campeonato *</p>{loadingArchitecture?<div className="rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-3 text-sm text-[#70e4df]">Analizando formatos para la disciplina…</div>:<div className="grid gap-2 sm:grid-cols-2">{availableFormats.filter((item)=>item.structure).map((item)=><button type="button" key={item.code} onClick={()=>setForm({...form,formato_competencia:item.code})} className={`rounded-xl border p-3 text-left ${form.formato_competencia===item.code?'border-[#C8A96B]/60 bg-[#C8A96B]/10':'border-white/10 bg-[#0d1117]'}`}><div className="flex items-center gap-2"><p className="text-sm font-black text-white">{item.label}</p>{item.recommended?<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-300">Recomendado</span>:null}</div><p className="mt-1 text-xs leading-5 text-[#8b949e]">{item.description}</p></button>)}</div>}{selectedFormat?<div className="mt-3 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-xs leading-5 text-[#9aa6b5]">Después de crear la competencia configurarás <strong className="text-white">divisiones/categorías, competidores y fases</strong>. Lestra no generará partidos o llaves hasta que esa estructura sea revisada.</div>:null}</div>:<div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4"><p className="text-sm font-black text-sky-200">Modo seguimiento externo</p><p className="mt-1 text-xs leading-5 text-sky-100/70">No necesitas recrear el fixture oficial. Registraremos únicamente los encuentros, pruebas o combates de nuestros deportistas y sus resultados dentro del campeonato.</p></div>}
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">3</span><div><h2 className="font-black text-white">Información de la competencia</h2><p className="text-xs text-[#8b949e]">Datos que verá Dirección al gestionar calendario y convocatorias.</p></div></div>
      <div className="mt-5 space-y-4"><label className="block"><span className="mb-1 block text-sm font-black text-white">Nombre *</span><input value={form.nombre} onChange={(event)=>setForm({...form,nombre:event.target.value})} className={field} placeholder="Ej. Campeonato Comunal 2026"/></label><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Organizador</span><input value={form.organizador} onChange={(event)=>setForm({...form,organizador:event.target.value})} className={field} placeholder={form.tipo_gestion==='organizado'?'Ej. Nuestra academia':'Ej. Asociación / club organizador'}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Lugar / recinto general</span><input value={form.ubicacion} onChange={(event)=>setForm({...form,ubicacion:event.target.value})} className={field} placeholder="Ej. Gimnasio Municipal"/></label></div><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha inicio</span><input type="date" value={form.fecha_inicio} onChange={(event)=>setForm({...form,fecha_inicio:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha término</span><input type="date" value={form.fecha_fin} onChange={(event)=>setForm({...form,fecha_fin:event.target.value})} className={field}/></label></div><label className="block"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Reglamento / bases (opcional)</span><input value={form.reglamento_url} onChange={(event)=>setForm({...form,reglamento_url:event.target.value})} className={field} placeholder="https://..."/><span className="mt-1 block text-[11px] leading-4 text-[#697586]">Puedes guardar el enlace oficial para que Dirección tenga siempre las bases del campeonato a mano.</span></label></div>
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#C8A96B]/15 text-sm font-black text-[#D8BE87]">4</span><div><h2 className="font-black text-white">Inscripción del deportista</h2><p className="text-xs text-[#8b949e]">Solo define lo que debe pagar el alumno. Los gastos internos de la academia se registran en Finanzas → Egresos.</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Valor de inscripción por alumno</span><input type="number" min="0" value={form.costo_inscripcion} onChange={(event)=>setForm({...form,costo_inscripcion:event.target.value})} className={field}/><span className="mt-1 block text-[11px] text-[#697586]">Déjalo en 0 si la participación es gratuita.</span></label><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><label className="flex items-start gap-3 text-sm font-bold text-[#c3ccd6]"><input type="checkbox" checked={form.permite_cuotas} onChange={(event)=>setForm({...form,permite_cuotas:event.target.checked})} className="mt-1 accent-[#C8A96B]"/><span>Permitir pago en cuotas<span className="mt-1 block text-xs font-normal leading-5 text-[#697586]">La familia podrá seleccionar cuotas durante la confirmación por WhatsApp.</span></span></label>{form.permite_cuotas?<label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Máximo de cuotas</span><input type="number" min="2" max="12" value={form.max_cuotas} onChange={(event)=>setForm({...form,max_cuotas:event.target.value})} className={field}/></label>:null}</div></div>
    </section>

    <button disabled={saving||loadingArchitecture} onClick={()=>void save()} className="min-h-12 w-full rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] shadow-lg shadow-[#C8A96B]/10 disabled:opacity-50">{saving?'Creando competencia...':form.tipo_gestion==='organizado'?'Crear y configurar competencia':'Registrar campeonato externo'}</button>
  </div>;
}
