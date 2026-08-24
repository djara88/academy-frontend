import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
  DirectorTabButton,
  DirectorTabs,
} from '../components/director/DirectorModule';

type Branch = { id:string; nombre:string; disciplina:string; sede_id?:string|null; sedes?:{id:string;nombre:string}|null };
type Category = { id:string; nombre:string; rama_id:string; sede_id?:string|null };
type FriendlyCompetition = { id:string; nombre:string; fecha_inicio?:string|null; fecha_fin?:string|null; organizador?:string|null; ubicacion?:string|null; estado:string; rama_id:string; ramas?:Branch|null };
type FriendlyEvent = { id:string; torneo_id?:string|null; rival:string; fecha:string; hora:string; hora_citacion?:string|null; ubicacion?:string|null; condicion?:string|null; estado:string; categoria_id:string; rama_id:string; categorias?:{id:string;nombre:string}|null; ramas?:Branch|null; torneos?:{id:string;nombre:string}|null };
type Payload = { eventos:FriendlyEvent[]; competencias:FriendlyCompetition[]; ramas:Branch[]; categorias:Category[] };

const pad = (v:number|string) => String(v).padStart(2,'0');
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

const TimeFields = ({ value, onChange, label }:{value:string;onChange:(value:string)=>void;label:string}) => {
  const [h='17',m='00'] = String(value || '17:00').split(':');
  return (
    <label className="min-w-0">
      <span className={labelClass}>{label}</span>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <select className={DIRECTOR_FIELD} value={h} onChange={(e)=>onChange(`${e.target.value}:${m}`)}>
          {Array.from({length:24},(_,i)=><option key={i} value={pad(i)}>{pad(i)}</option>)}
        </select>
        <span className="font-black text-[#758074]">:</span>
        <select className={DIRECTOR_FIELD} value={m} onChange={(e)=>onChange(`${h}:${e.target.value}`)}>
          {['00','05','10','15','20','25','30','35','40','45','50','55'].map((item)=><option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </label>
  );
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
  const programmed = data.eventos.filter((item)=>item.estado==='Programado').length;

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

  return (
    <DirectorPage>
      <DirectorHero
        eyebrow="Plan Formación · agenda deportiva"
        title="Amistosos"
        description="Programa partidos, controles, exhibiciones o encuentros amistosos sin mezclar esta agenda con el motor competitivo avanzado."
        actions={<Link to="/suscripcion" className={DIRECTOR_BUTTON_GHOST}>Comparar con Competencia →</Link>}
        aside={
          <div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Rama activa</p>
            <p className="mt-2 truncate text-xl font-black text-white">{selectedBranch?.nombre || data.ramas[0]?.nombre || 'Sin rama'}</p>
            <p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{selectedBranch?.disciplina || data.ramas[0]?.disciplina || 'Configura una rama para comenzar'}</p>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <DirectorStat label="Próximos amistosos" value={programmed} tone="lime" />
        <DirectorStat label="Competencias amistosas" value={data.competencias.length} />
        <DirectorStat label="Agenda total" value={data.eventos.length} detail="Encuentros registrados" tone="dark" />
      </section>

      <DirectorTabs className="grid-cols-2">
        <DirectorTabButton active={tab==='evento'} onClick={()=>setTab('evento')}>Programar amistoso</DirectorTabButton>
        <DirectorTabButton active={tab==='competencia'} onClick={()=>setTab('competencia')}>Competencia amistosa</DirectorTabButton>
      </DirectorTabs>

      {tab==='evento' ? (
        <DirectorPanel className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nuevo encuentro</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Agenda un amistoso</h2>
            <p className="mt-1 text-sm leading-6 text-[#697468]">Completa solo la información operativa necesaria para convocar y organizar el encuentro.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label><span className={labelClass}>Rama</span><select className={DIRECTOR_FIELD} value={event.rama_id} onChange={(e)=>setEvent({...event,rama_id:e.target.value,categoria_id:'',torneo_id:''})}>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></label>
            <label><span className={labelClass}>Categoría</span><select className={DIRECTOR_FIELD} value={event.categoria_id} onChange={(e)=>setEvent({...event,categoria_id:e.target.value})}><option value="">Selecciona categoría</option>{eventCategories.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <label><span className={labelClass}>Competencia amistosa</span><select className={DIRECTOR_FIELD} value={event.torneo_id} onChange={(e)=>setEvent({...event,torneo_id:e.target.value})}><option value="">Amistoso independiente</option>{eventCompetitions.map((item)=><option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
            <label className="xl:col-span-2"><span className={labelClass}>Rival / prueba / referencia</span><input className={DIRECTOR_FIELD} value={event.rival} onChange={(e)=>setEvent({...event,rival:e.target.value})} placeholder="Ej.: Club Deportivo Sur / Control 100 m / Exhibición"/></label>
            <label><span className={labelClass}>Fecha</span><input type="date" className={DIRECTOR_FIELD} value={event.fecha} onChange={(e)=>setEvent({...event,fecha:e.target.value})}/></label>
            <TimeFields label="Hora de citación / llegada" value={event.hora_citacion} onChange={(value)=>setEvent({...event,hora_citacion:value})}/>
            <TimeFields label="Hora de inicio" value={event.hora} onChange={(value)=>setEvent({...event,hora:value})}/>
            <label><span className={labelClass}>Condición</span><select className={DIRECTOR_FIELD} value={event.condicion} onChange={(e)=>setEvent({...event,condicion:e.target.value})}><option>Local</option><option>Visita</option><option>Neutral</option><option>No aplica</option></select></label>
            <label className="md:col-span-2"><span className={labelClass}>Lugar</span><input className={DIRECTOR_FIELD} value={event.ubicacion} onChange={(e)=>setEvent({...event,ubicacion:e.target.value})} placeholder="Cancha, estadio, pista, piscina o recinto"/></label>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[#e2e7df] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-3xl text-xs leading-5 text-[#697468]">Formación registra agenda y resultado operativo. Las métricas individuales y analítica avanzada se gestionan en los planes superiores.</p>
            <button disabled={saving} onClick={()=>void createEvent()} className={DIRECTOR_BUTTON}>{saving?'Guardando...':'Programar amistoso'}</button>
          </div>
        </DirectorPanel>
      ) : null}

      {tab==='competencia' ? (
        <DirectorPanel className="p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Agrupación opcional</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Competencia amistosa</h2>
            <p className="mt-1 text-sm leading-6 text-[#697468]">Agrupa varios encuentros amistosos bajo un mismo nombre, fecha y organizador.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label><span className={labelClass}>Rama</span><select className={DIRECTOR_FIELD} value={competition.rama_id} onChange={(e)=>setCompetition({...competition,rama_id:e.target.value})}>{data.ramas.map((item)=><option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}</option>)}</select></label>
            <label className="md:col-span-1 xl:col-span-2"><span className={labelClass}>Nombre</span><input className={DIRECTOR_FIELD} value={competition.nombre} onChange={(e)=>setCompetition({...competition,nombre:e.target.value})} placeholder="Ej.: Encuentro amistoso de invierno"/></label>
            <label><span className={labelClass}>Inicio</span><input type="date" className={DIRECTOR_FIELD} value={competition.fecha_inicio} onChange={(e)=>setCompetition({...competition,fecha_inicio:e.target.value})}/></label>
            <label><span className={labelClass}>Fin</span><input type="date" className={DIRECTOR_FIELD} value={competition.fecha_fin} onChange={(e)=>setCompetition({...competition,fecha_fin:e.target.value})}/></label>
            <label><span className={labelClass}>Organizador</span><input className={DIRECTOR_FIELD} value={competition.organizador} onChange={(e)=>setCompetition({...competition,organizador:e.target.value})}/></label>
            <label className="md:col-span-2 xl:col-span-3"><span className={labelClass}>Lugar</span><input className={DIRECTOR_FIELD} value={competition.ubicacion} onChange={(e)=>setCompetition({...competition,ubicacion:e.target.value})}/></label>
          </div>
          <div className="mt-6 flex justify-end border-t border-[#e2e7df] pt-5"><button disabled={saving} onClick={()=>void createCompetition()} className={DIRECTOR_BUTTON}>{saving?'Guardando...':'Crear competencia amistosa'}</button></div>
        </DirectorPanel>
      ) : null}

      <DirectorPanel className="overflow-hidden">
        <div className="border-b border-[#e2e7df] p-5 sm:p-6">
          <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Calendario</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Agenda amistosa</h2>
          <p className="mt-1 text-sm text-[#697468]">Todos los encuentros programados desde Formación.</p>
        </div>
        <div className="divide-y divide-[#e5e9e2]">
          {loading ? <p className="p-6 text-sm font-bold text-[#697468]">Cargando agenda...</p> : data.eventos.map((item)=>(
            <article key={item.id} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black uppercase text-[#5f7900]">{item.ramas?.disciplina || 'Amistoso'}</span>
                  <span className="rounded-full border border-[#dde3da] bg-[#f5f7f3] px-2.5 py-1 text-[10px] font-black text-[#697468]">{item.estado}</span>
                </div>
                <h3 className="mt-2 text-lg font-black text-[#111711]">{item.rival}</h3>
                <p className="mt-1 text-xs leading-5 text-[#697468]">{item.categorias?.nombre || 'Categoría'} · {item.fecha} · {String(item.hora||'').slice(0,5)}{item.ubicacion?` · ${item.ubicacion}`:''}{item.torneos?.nombre?` · ${item.torneos.nombre}`:''}</p>
              </div>
              {item.estado==='Programado' ? (
                <div className="flex flex-wrap gap-2">
                  <button onClick={()=>void setStatus(item.id,'Realizado')} className={DIRECTOR_BUTTON}>Marcar realizado</button>
                  <button onClick={()=>void setStatus(item.id,'Cancelado')} className={DIRECTOR_BUTTON_DARK}>Cancelar</button>
                </div>
              ) : null}
            </article>
          ))}
          {!loading && !data.eventos.length ? <p className="p-8 text-center text-sm font-semibold text-[#697468]">Todavía no has programado amistosos.</p> : null}
        </div>
      </DirectorPanel>
    </DirectorPage>
  );
}
