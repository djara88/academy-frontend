import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch = { id:string; nombre:string; disciplina:string; sede_id?:string|null; sedes?:{id:string;nombre:string}|null };
type Category = { id:string; nombre:string; rama_id:string; sede_id?:string|null };
type FriendlyCompetition = { id:string; nombre:string; fecha_inicio?:string|null; fecha_fin?:string|null; organizador?:string|null; ubicacion?:string|null; estado:string; rama_id:string; ramas?:Branch|null };
type FriendlyEvent = { id:string; torneo_id?:string|null; rival:string; fecha:string; hora:string; hora_citacion?:string|null; ubicacion?:string|null; condicion?:string|null; estado:string; categoria_id:string; rama_id:string; categorias?:{id:string;nombre:string}|null; ramas?:Branch|null; torneos?:{id:string;nombre:string}|null };

type Payload = { eventos:FriendlyEvent[]; competencias:FriendlyCompetition[]; ramas:Branch[]; categorias:Category[] };

const field = 'min-h-11 w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-[#289E9D]';
const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const pad = (v:number|string) => String(v).padStart(2,'0');

const TimeFields = ({ value, onChange, label }:{value:string;onChange:(value:string)=>void;label:string}) => {
  const [h='17',m='00'] = String(value || '17:00').split(':');
  return <div><p className="mb-1 text-[11px] font-black uppercase tracking-wider text-[#7f8c9c]">{label}</p><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><select className={field} value={h} onChange={(e)=>onChange(`${e.target.value}:${m}`)}>{Array.from({length:24},(_,i)=><option key={i} value={pad(i)}>{pad(i)}</option>)}</select><span className="font-black text-[#697586]">:</span><select className={field} value={m} onChange={(e)=>onChange(`${h}:${e.target.value}`)}>{['00','05','10','15','20','25','30','35','40','45','50','55'].map((item)=><option key={item} value={item}>{item}</option>)}</select></div></div>;
};

export default function Amistosos(){
  const { notify } = useAppDialog();
  const [data,setData] = useState<Payload>({eventos:[],competencias:[],ramas:[],categorias:[]});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [tab,setTab] = useState<'evento'|'competencia'>('evento');
  const [event,setEvent] = useState({ torneo_id:'',rama_id:'',categoria_id:'',rival:'',fecha:'',hora:'17:00',hora_citacion:'16:00',ubicacion:'',condicion:'Local' });
  const [competition,setCompetition] = useState({ rama_id:'',nombre:'',fecha_inicio:'',fecha_fin:'',organizador:'',ubicacion:'' });

  const load = async()=>{
    setLoading(true);
    try{
      const response = await api.get('/api/academias/amistosos');
      const next = response.data.data as Payload;
      setData(next);
      setEvent((current)=>({...current,rama_id:current.rama_id || next.ramas[0]?.id || ''}));
      setCompetition((current)=>({...current,rama_id:current.rama_id || next.ramas[0]?.id || ''}));
    }catch(error:any){ await notify(error.response?.data?.error || 'No fue posible cargar los amistosos.'); }
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventCategories = useMemo(()=>data.categorias.filter((item)=>item.rama_id===event.rama_id),[data.categorias,event.rama_id]);
  const eventCompetitions = useMemo(()=>data.competencias.filter((item)=>item.rama_id===event.rama_id && item.estado!=='Archivado'),[data.competencias,event.rama_id]);
  const selectedBranch = data.ramas.find((item)=>item.id===event.rama_id);

  const createCompetition = async()=>{
    if(!competition.rama_id || !competition.nombre) return void notify('Selecciona la rama e ingresa un nombre.');
    setSaving(true);
    try{
      await api.post('/api/academias/amistosos/competencias',competition);
      setCompetition((current)=>({...current,nombre:'',fecha_inicio:'',fecha_fin:'',organizador:'',ubicacion:''}));
      await load();
      await notify('Competencia amistosa programada.',{title:'Amistosos'});
    }catch(error:any){await notify(error.response?.data?.error || 'No fue posible programarla.');}
    finally{setSaving(false);}
  };

  const createEvent = async()=>{
    if(!event.rama_id || !event.categoria_id || !event.rival || !event.fecha || !event.hora) return void notify('Completa rama, categoría, rival/prueba, fecha y hora.');
    setSaving(true);
    try{
      await api.post('/api/academias/amistosos/eventos',{...event,torneo_id:event.torneo_id||null});
      setEvent((current)=>({...current,torneo_id:'',categoria_id:'',rival:'',fecha:'',ubicacion:''}));
      await load();
      await notify('Amistoso programado correctamente.',{title:'Amistosos'});
    }catch(error:any){await notify(error.response?.data?.error || 'No fue posible programar el amistoso.');}
    finally{setSaving(false);}
  };

  const setStatus = async(id:string,estado:string)=>{
    try{await api.patch(`/api/academias/amistosos/eventos/${id}`,{estado});await load();}
    catch(error:any){await notify(error.response?.data?.error || 'No fue posible actualizar el amistoso.');}
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[30px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.18),transparent_38%),#151b25] p-6 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Incluido en Formación</p><h1 className="mt-2 text-3xl font-black text-white">Amistosos</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa6b5]">Programa partidos, controles, exhibiciones o competencias amistosas. Aquí gestionas la agenda básica; las métricas individuales, PB/SB, torneos oficiales y analítica se habilitan en Competencia.</p></div><Link to="/suscripcion" className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-black text-violet-200">Ver qué agrega Competencia →</Link></div>
    </section>

    <div className="grid gap-4 sm:grid-cols-3"><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Próximos amistosos</p><p className="mt-1 text-3xl font-black text-white">{data.eventos.filter((item)=>item.estado==='Programado').length}</p></div><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Competencias amistosas</p><p className="mt-1 text-3xl font-black text-white">{data.competencias.length}</p></div><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Rama activa</p><p className="mt-1 truncate text-xl font-black text-[#70e4df]">{selectedBranch?.nombre || data.ramas[0]?.nombre || 'Sin rama'}</p></div></div>

    <div className="flex rounded-xl border border-white/10 bg-[#0d1117] p-1"><button onClick={()=>setTab('evento')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${tab==='evento'?'bg-[#289E9D] text-white':'text-[#8995a4]'}`}>Programar amistoso</button><button onClick={()=>setTab('competencia')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-black ${tab==='competencia'?'bg-[#289E9D] text-white':'text-[#8995a4]'}`}>Competencia amistosa</button></div>

    {tab==='evento'?<section className={`${panel} p-5 sm:p-6`}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Rama</p><select className={field} value={event.rama_id} onChange={(e)=>setEvent({...event,rama_id:e.target.value,categoria_id:'',torneo_id:''})}>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Categoría</p><select className={field} value={event.categoria_id} onChange={(e)=>setEvent({...event,categoria_id:e.target.value})}><option value="">Selecciona categoría</option>{eventCategories.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Competencia amistosa (opcional)</p><select className={field} value={event.torneo_id} onChange={(e)=>setEvent({...event,torneo_id:e.target.value})}><option value="">Amistoso independiente</option>{eventCompetitions.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div><div className="xl:col-span-2"><p className="mb-1 text-xs font-black text-[#9aa6b5]">Rival / prueba / referencia</p><input className={field} value={event.rival} onChange={(e)=>setEvent({...event,rival:e.target.value})} placeholder="Ej.: Club Deportivo Sur / Control 100 m / Exhibición"/></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Fecha</p><input type="date" className={field} value={event.fecha} onChange={(e)=>setEvent({...event,fecha:e.target.value})}/></div><TimeFields label="Hora de citación / llegada" value={event.hora_citacion} onChange={(value)=>setEvent({...event,hora_citacion:value})}/><TimeFields label="Hora de inicio" value={event.hora} onChange={(value)=>setEvent({...event,hora:value})}/><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Condición</p><select className={field} value={event.condicion} onChange={(e)=>setEvent({...event,condicion:e.target.value})}><option>Local</option><option>Visita</option><option>Neutral</option><option>No aplica</option></select></div><div className="md:col-span-2"><p className="mb-1 text-xs font-black text-[#9aa6b5]">Lugar</p><input className={field} value={event.ubicacion} onChange={(e)=>setEvent({...event,ubicacion:e.target.value})} placeholder="Cancha, estadio, pista, piscina o recinto"/></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#697586]">Formación registra agenda y resultado operativo. Para estadísticas por deportista, marcas personales y análisis usa Competencia/Alto Rendimiento.</p><button disabled={saving} onClick={()=>void createEvent()} className="min-h-11 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white disabled:opacity-40">{saving?'Guardando...':'Programar amistoso'}</button></div></section>:null}

    {tab==='competencia'?<section className={`${panel} p-5 sm:p-6`}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Rama</p><select className={field} value={competition.rama_id} onChange={(e)=>setCompetition({...competition,rama_id:e.target.value})}>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></div><div className="md:col-span-1 xl:col-span-2"><p className="mb-1 text-xs font-black text-[#9aa6b5]">Nombre</p><input className={field} value={competition.nombre} onChange={(e)=>setCompetition({...competition,nombre:e.target.value})} placeholder="Ej.: Encuentro amistoso de invierno"/></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Inicio</p><input type="date" className={field} value={competition.fecha_inicio} onChange={(e)=>setCompetition({...competition,fecha_inicio:e.target.value})}/></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Fin</p><input type="date" className={field} value={competition.fecha_fin} onChange={(e)=>setCompetition({...competition,fecha_fin:e.target.value})}/></div><div><p className="mb-1 text-xs font-black text-[#9aa6b5]">Organizador</p><input className={field} value={competition.organizador} onChange={(e)=>setCompetition({...competition,organizador:e.target.value})}/></div><div className="md:col-span-2 xl:col-span-3"><p className="mb-1 text-xs font-black text-[#9aa6b5]">Lugar</p><input className={field} value={competition.ubicacion} onChange={(e)=>setCompetition({...competition,ubicacion:e.target.value})}/></div></div><div className="mt-5 flex justify-end"><button disabled={saving} onClick={()=>void createCompetition()} className="min-h-11 rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white disabled:opacity-40">{saving?'Guardando...':'Crear competencia amistosa'}</button></div></section>:null}

    <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Agenda amistosa</h2><p className="mt-1 text-sm text-[#7f8c9c]">Todos los amistosos programados desde Formación.</p></div><div className="divide-y divide-white/5">{loading?<p className="p-6 text-[#70e4df]">Cargando...</p>:data.eventos.map((item)=><div key={item.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#289E9D]/10 px-2 py-1 text-[10px] font-black uppercase text-[#70e4df]">{item.ramas?.disciplina || 'Amistoso'}</span><span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black text-[#8995a4]">{item.estado}</span></div><h3 className="mt-2 text-lg font-black text-white">{item.rival}</h3><p className="mt-1 text-xs text-[#8995a4]">{item.categorias?.nombre || 'Categoría'} · {item.fecha} · {String(item.hora||'').slice(0,5)}{item.ubicacion?` · ${item.ubicacion}`:''}{item.torneos?.nombre?` · ${item.torneos.nombre}`:''}</p></div><div className="flex gap-2">{item.estado==='Programado'?<><button onClick={()=>void setStatus(item.id,'Realizado')} className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-black text-emerald-200">Realizado</button><button onClick={()=>void setStatus(item.id,'Cancelado')} className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-black text-red-200">Cancelar</button></>:null}</div></div>)}{!loading&&!data.eventos.length?<p className="p-8 text-center text-sm text-[#697586]">Todavía no has programado amistosos.</p>:null}</div></section>
  </div>;
}
