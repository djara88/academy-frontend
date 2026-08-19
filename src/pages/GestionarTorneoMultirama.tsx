import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;reglamento_url?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
type Category={id:string;nombre:string;rama_id?:string|null;sede_id?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null};
type Student={id:string;nombre:string;foto_url?:string|null;avatar_url?:string|null;foto_base64?:string|null;inscripcion?:{id:string;rama_id:string;categoria_id?:string|null;rol_especialidad?:string|null}|null};
type Participant={id:string;jugador_id:string;categoria_id?:string|null;respuesta_participacion:string;estado_pago:string;numero_cuotas?:number|null;jugadores?:{id:string;nombre:string;foto_url?:string|null;foto_base64?:string|null}|null;categorias?:{id:string;nombre:string}|null};
type CompetitionEvent={id:string;rival:string;fecha:string;hora:string;estado:string;goles_favor?:number|null;goles_contra?:number|null;categorias?:{id?:string;nombre:string}|null;sport_profile?:{icon?:string;activityLabel?:string;scoreLabel?:string;usesHeadToHeadScore?:boolean}|null};

const panel='rounded-[24px] border border-white/10 bg-[#151b25]';
const field='w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const photo=(student?:{foto_url?:string|null;foto_base64?:string|null})=>student?.foto_url||student?.foto_base64||'';

export default function GestionarTorneoMultirama(){
  const {id}=useParams();
  const {notify,confirmAction}=useAppDialog();
  const [tournament,setTournament]=useState<Tournament|null>(null);
  const [categories,setCategories]=useState<Category[]>([]);
  const [categoryId,setCategoryId]=useState('');
  const [eligible,setEligible]=useState<Student[]>([]);
  const [participants,setParticipants]=useState<Participant[]>([]);
  const [events,setEvents]=useState<CompetitionEvent[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);

  const reloadParticipants=async()=>{
    if(!id)return;
    const response=await api.get(`/api/torneos/${id}/participantes`);
    setParticipants(response.data.data||[]);
  };

  useEffect(()=>{
    const load=async()=>{
      if(!id)return;
      setLoading(true);
      try{
        const tournamentResponse=await api.get(`/api/torneos/${id}`);
        const t=tournamentResponse.data.data as Tournament;
        setTournament(t);
        const requests:Promise<any>[]=[api.get(`/api/torneos/${id}/participantes`),api.get('/api/partidos',{params:{torneo_id:id}})];
        if(t.rama_id)requests.push(api.get('/api/jugadores/categorias',{params:{rama_id:t.rama_id}}));
        const responses=await Promise.all(requests);
        setParticipants(responses[0].data.data||[]);
        setEvents(responses[1].data.data||[]);
        if(t.rama_id)setCategories(responses[2]?.data?.data||[]);
      }catch(error:any){
        await notify(error.response?.data?.error||'No fue posible cargar la competencia.');
      }finally{setLoading(false);}
    };
    void load();
  },[id,notify]);

  useEffect(()=>{
    const loadEligible=async()=>{
      if(!id||!categoryId){setEligible([]);setSelected([]);return;}
      try{
        const response=await api.get(`/api/torneos/${id}/elegibles`,{params:{categoria_id:categoryId}});
        const students=response.data.data||[];
        setEligible(students);
        const already=new Set(participants.filter((item)=>item.categoria_id===categoryId).map((item)=>String(item.jugador_id)));
        setSelected(students.filter((student:Student)=>!already.has(String(student.id))).map((student:Student)=>student.id));
      }catch(error:any){
        await notify(error.response?.data?.error||'No fue posible cargar alumnos elegibles.');
      }
    };
    void loadEligible();
  },[id,categoryId,participants,notify]);

  const selectedCategory=categories.find((category)=>category.id===categoryId)||null;
  const stats=useMemo(()=>({
    total:participants.length,
    confirmados:participants.filter((item)=>item.respuesta_participacion==='Si').length,
    rechazados:participants.filter((item)=>item.respuesta_participacion==='No').length,
    pagados:participants.filter((item)=>item.estado_pago==='Pagado').length,
  }),[participants]);
  const eventStats=useMemo(()=>({
    total:events.length,
    jugados:events.filter((item)=>item.estado==='Jugado').length,
    pendientes:events.filter((item)=>item.estado!=='Jugado').length,
  }),[events]);
  const toggle=(studentId:string)=>setSelected((current)=>current.includes(studentId)?current.filter((item)=>item!==studentId):[...current,studentId]);

  const send=async()=>{
    if(!id||!categoryId||!selected.length)return void notify('Selecciona categoría y al menos un alumno.');
    const accepted=await confirmAction(`Se convocará a ${selected.length} alumno(s) de ${selectedCategory?.nombre||'la categoría'}. La inscripción del campeonato se cobrará una sola vez por alumno, aunque participe en más de una categoría.`,{confirmLabel:'Enviar convocatoria'});
    if(!accepted)return;
    setSending(true);
    try{
      const response=await api.post(`/api/torneos/${id}/convocar`,{categoria_id:categoryId,jugadoresIds:selected});
      await notify(response.data.message||'Convocatorias enviadas.');
      await reloadParticipants();
      setSelected([]);
    }catch(error:any){
      await notify(error.response?.data?.error||'No fue posible convocar.');
    }finally{setSending(false);}
  };

  if(loading)return <div className="grid min-h-[50vh] place-items-center text-[#D8BE87]">Cargando competencia...</div>;
  if(!tournament)return <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">Competencia no encontrada.</div>;

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link to="/torneos" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-[#c3ccd6]">← Competencias</Link><Link to={`/partidos?torneo_id=${tournament.id}`} className="rounded-xl bg-[#289E9D] px-4 py-2 text-sm font-black text-white">+ Agregar evento competitivo</Link></div>

    <section className="rounded-[28px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.16),transparent_36%),#151b25] p-6 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase text-violet-300">{tournament.ramas?.disciplina||'Competencia'}</span><span className="rounded-full bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase text-sky-300">Seguimiento de la academia</span></div><h1 className="mt-3 text-3xl font-black text-white">{tournament.nombre}</h1><p className="mt-2 text-sm text-[#8b949e]">{tournament.ramas?.nombre||'Sin rama'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''} · {tournament.fecha_inicio||'Fecha por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</p>{tournament.organizador?<p className="mt-1 text-xs text-[#697586]">Organiza: {tournament.organizador}</p>:null}{tournament.ubicacion?<p className="mt-1 text-xs text-[#697586]">Lugar general: {tournament.ubicacion}</p>:null}</div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[9px] uppercase text-[#697586]">Convocados</p><p className="font-black text-white">{stats.total}</p></div><div className="rounded-xl bg-[#289E9D]/10 p-3"><p className="text-[9px] uppercase text-[#70e4df]">Eventos</p><p className="font-black text-[#bff8f5]">{eventStats.total}</p></div><div className="rounded-xl bg-[#C8A96B]/10 p-3"><p className="text-[9px] uppercase text-[#D8BE87]">Inscripción</p><p className="font-black text-[#D8BE87]">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratis'}</p></div></div></div></section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#70e4df]">Eventos de esta competencia</p><h2 className="mt-1 text-xl font-black text-white">Partidos, duelos, pruebas y presentaciones</h2><p className="mt-1 text-xs leading-5 text-[#8b949e]">Cada evento se registra según la disciplina y alimenta los resultados de la academia y de sus alumnos.</p></div><div className="flex gap-2"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">{eventStats.jugados} finalizados</span><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">{eventStats.pendientes} pendientes</span></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{events.slice(0,9).map((event)=><article key={event.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#70e4df]">{event.sport_profile?.icon||'🏅'} {event.sport_profile?.activityLabel||'Evento'}</p><h3 className="mt-1 font-black text-white">{event.rival}</h3><p className="mt-1 text-xs text-[#697586]">{event.categorias?.nombre||'Sin categoría'} · {event.fecha} · {String(event.hora||'').slice(0,5)}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${event.estado==='Jugado'?'bg-emerald-500/10 text-emerald-300':'bg-[#289E9D]/10 text-[#70e4df]'}`}>{event.estado}</span></div>{event.estado==='Jugado'&&event.sport_profile?.usesHeadToHeadScore?<p className="mt-3 rounded-xl bg-emerald-500/10 p-2 text-center text-sm font-black text-emerald-200">{event.goles_favor||0} — {event.goles_contra||0} {event.sport_profile?.scoreLabel||''}</p>:null}</article>)}{!events.length?<div className="col-span-full rounded-2xl border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-black text-white">Aún no hay eventos registrados.</p><p className="mt-1 text-xs text-[#697586]">Agrega el primer partido, duelo, prueba, carrera o presentación de esta competencia.</p><Link to={`/partidos?torneo_id=${tournament.id}`} className="mt-4 inline-flex rounded-xl bg-[#289E9D] px-4 py-2 text-xs font-black text-white">Agregar evento</Link></div>:null}</div>{events.length>9?<div className="mt-4 text-right"><Link to={`/partidos?torneo_id=${tournament.id}`} className="text-xs font-black text-[#70e4df]">Ver todos los eventos →</Link></div>:null}
    </section>

    <section className={`${panel} p-5 sm:p-6`}>
      <div><p className="text-xs font-black uppercase tracking-[.14em] text-[#D8BE87]">Convocatoria al campeonato</p><h2 className="mt-1 text-xl font-black text-white">Seleccionar alumnos por categoría</h2><p className="mt-1 text-xs leading-5 text-[#8b949e]">Esta convocatoria controla la inscripción al campeonato. Las citaciones de fecha/hora se envían después desde cada evento competitivo.</p></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"><select value={categoryId} onChange={(event)=>setCategoryId(event.target.value)} className={field}><option value="">Selecciona categoría</option>{categories.map((category)=><option key={category.id} value={category.id}>{category.nombre}</option>)}</select><button disabled={!selected.length||sending} onClick={()=>void send()} className="min-h-11 rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] disabled:opacity-40">{sending?'Enviando...':`Convocar ${selected.length||''}`}</button></div>
      {categoryId?<div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{eligible.map((student)=>{const checked=selected.includes(student.id);const already=participants.some((item)=>item.categoria_id===categoryId&&String(item.jugador_id)===String(student.id));return <button type="button" disabled={already} onClick={()=>toggle(student.id)} key={student.id} className={`flex items-center gap-3 rounded-xl border p-3 text-left ${already?'border-emerald-400/15 bg-emerald-500/5 opacity-70':checked?'border-[#C8A96B]/50 bg-[#C8A96B]/10':'border-white/10 bg-[#0d1117]'}`}>{photo(student)?<img src={photo(student)} alt="" className="h-10 w-10 rounded-xl object-cover"/>:<div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-sm font-black text-white">{student.nombre?.slice(0,1)||'A'}</div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{student.nombre}</p><p className="text-[10px] text-[#697586]">{already?'Ya convocado':student.inscripcion?.rol_especialidad||'Disponible'}</p></div><span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${already?'border-emerald-400 bg-emerald-500 text-white':checked?'border-[#C8A96B] bg-[#C8A96B] text-[#15120c]':'border-[#596575]'}`}>{already||checked?'✓':''}</span></button>})}{!eligible.length?<div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-[#697586]">No hay alumnos elegibles en esta categoría.</div>:null}</div>:null}
    </section>

    <section className={`${panel} p-5 sm:p-6`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#D8BE87]">Participación registrada</p><h2 className="mt-1 text-xl font-black text-white">Alumnos del campeonato</h2></div><div className="flex gap-2"><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-300">{stats.confirmados} confirmados</span><span className="rounded-full bg-[#C8A96B]/10 px-3 py-1 text-xs font-black text-[#D8BE87]">{stats.pagados} pagados</span>{stats.rechazados?<span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black text-red-300">{stats.rechazados} no participan</span>:null}</div></div><div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{participants.map((participant)=><div key={participant.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3">{photo(participant.jugadores)?<img src={photo(participant.jugadores)} alt="" className="h-10 w-10 rounded-xl object-cover"/>:<div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-sm font-black text-white">{participant.jugadores?.nombre?.slice(0,1)||'A'}</div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{participant.jugadores?.nombre||'Alumno'}</p><p className="text-[10px] text-[#697586]">{participant.categorias?.nombre||'Categoría'} · {participant.respuesta_participacion==='Si'?'Confirmado':participant.respuesta_participacion==='No'?'No participa':'Pendiente'} · {participant.estado_pago||'Pendiente'}</p></div></div>)}{!participants.length?<div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#697586]">Aún no hay alumnos convocados.</div>:null}</div></section>

    {tournament.reglamento_url?<section className="rounded-2xl border border-sky-400/15 bg-sky-500/10 p-4"><p className="text-sm font-black text-sky-200">Bases o reglamento</p><a href={tournament.reglamento_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs text-sky-300 underline">{tournament.reglamento_url}</a></section>:null}
  </div>;
}
