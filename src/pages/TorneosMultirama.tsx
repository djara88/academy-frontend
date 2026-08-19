import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;tipo_gestion?:'externo'|'organizado';formato_competencia?:string;estructura_estado?:string;organizador?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
const panel='rounded-[24px] border border-white/10 bg-[#151b25]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const formatLabel=(code?:string)=>({seguimiento:'Seguimiento externo',liga:'Liga',grupos_eliminacion:'Grupos + eliminación',eliminacion_directa:'Eliminación directa',doble_eliminacion:'Doble eliminación',pools:'Pools',repechaje:'Repechaje',rondas_clasificacion:'Rondas',pruebas_ranking:'Pruebas + ranking',personalizado:'Personalizado'}[code||'']||'Sin formato');

export default function TorneosMultirama(){
  const [items,setItems]=useState<Tournament[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    const load=async()=>{setLoading(true);setError('');try{const response=await api.get('/api/torneos',{params:branchId?{rama_id:branchId}:undefined});setItems(response.data.data||[]);setBranches(response.data.ramas||[]);}catch(err:any){setError(err.response?.data?.error||'No fue posible cargar las competencias.');}finally{setLoading(false);}};void load();
  },[branchId]);

  const counts=useMemo(()=>({
    total:items.length,
    externos:items.filter((item)=>(item.tipo_gestion||'externo')==='externo').length,
    organizados:items.filter((item)=>item.tipo_gestion==='organizado').length,
    conCosto:items.filter((item)=>Number(item.costo_inscripcion)>0).length,
  }),[items]);

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.17),transparent_38%),#151b25] p-6 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Partidos y competencias</p><h1 className="mt-2 text-3xl font-black text-white">Campeonatos y torneos</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Registra campeonatos externos donde participa tu academia o construye competencias propias con la arquitectura adecuada para cada deporte.</p></div><Link to="/nuevo-torneo" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c]">+ Nueva competencia</Link></div></section>

    <section className={`${panel} p-4`}><div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]"><select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className="min-h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-[#C8A96B]"><option value="">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select><div className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-center text-xs text-[#8995a4]">Total <strong className="ml-1 text-white">{counts.total}</strong></div><div className="rounded-xl border border-sky-400/15 bg-sky-500/10 px-4 py-3 text-center text-xs text-sky-300">Externos <strong className="ml-1">{counts.externos}</strong></div><div className="rounded-xl border border-violet-400/15 bg-violet-500/10 px-4 py-3 text-center text-xs text-violet-300">Organizados <strong className="ml-1">{counts.organizados}</strong></div><div className="rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/10 px-4 py-3 text-center text-xs text-[#D8BE87]">Con inscripción <strong className="ml-1">{counts.conCosto}</strong></div></div></section>

    {error?<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>:null}
    {loading?<div className={`${panel} p-10 text-center text-[#8b949e]`}>Cargando competencias...</div>:<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((tournament)=>{
      const external=(tournament.tipo_gestion||'externo')==='externo';
      return <Link key={tournament.id} to={`/torneos/${tournament.id}`} className={`${panel} group p-5 transition hover:-translate-y-0.5 hover:border-[#C8A96B]/40`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">{tournament.ramas?.disciplina||'Histórico'}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${external?'bg-sky-500/10 text-sky-300':'bg-emerald-500/10 text-emerald-300'}`}>{external?'Externo':'Organizado'}</span></div><h2 className="mt-3 text-xl font-black text-white">{tournament.nombre}</h2><p className="mt-1 text-xs text-[#8b949e]">{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</p>{tournament.organizador?<p className="mt-1 text-xs text-[#697586]">Organiza: {tournament.organizador}</p>:null}</div><span className="text-2xl">🏆</span></div><div className="mt-4 rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#697586]">Arquitectura</p><p className="mt-1 text-sm font-black text-white">{formatLabel(tournament.formato_competencia||'seguimiento')}</p><p className="mt-1 text-[11px] text-[#697586]">{external?'Lestra sigue a nuestra academia dentro del evento.':tournament.estructura_estado==='publicada'?'Estructura publicada':tournament.estructura_estado==='configurada'?'Estructura configurada':'Configuración pendiente'}</p></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Inicio</p><p className="mt-1 text-sm font-black text-white">{tournament.fecha_inicio||'Por definir'}</p></div><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Inscripción alumno</p><p className="mt-1 text-sm font-black text-emerald-300">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</p></div></div><div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-xs font-bold text-[#8995a4]">{tournament.permite_cuotas?`Hasta ${tournament.max_cuotas} cuotas`:'Pago único'}</span><span className="text-xs font-black text-[#D8BE87] transition group-hover:translate-x-1">Gestionar →</span></div></Link>})}{!items.length?<div className={`${panel} col-span-full p-10 text-center text-sm text-[#697586]`}>No hay competencias en el alcance seleccionado.</div>:null}</section>}
  </div>;
}
