import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
const panel='rounded-[24px] border border-white/10 bg-[#151b25]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;

export default function TorneosArchivados(){
  const {notify,confirmAction}=useAppDialog();
  const [items,setItems]=useState<Tournament[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState('');
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState('');
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const response=await api.get('/api/torneos',{params:{archivados:true,...(branchId?{rama_id:branchId}:{})}});
      setItems(response.data.data||[]);
      setBranches(response.data.ramas||[]);
    }catch(err:any){
      setError(err.response?.data?.error||'No fue posible cargar el Almacén de competencias.');
    }finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[branchId]);

  const restore=async(tournament:Tournament)=>{
    const accepted=await confirmAction(`¿Restaurar “${tournament.nombre}” al listado de competencias activas?`,{confirmLabel:'Restaurar'});
    if(!accepted)return;
    setBusyId(tournament.id);
    try{
      const response=await api.patch(`/api/torneos/${tournament.id}/restaurar`);
      await notify(response.data?.message||'Competencia restaurada.');
      await load();
    }catch(err:any){
      await notify(err.response?.data?.error||'No fue posible restaurar la competencia.');
    }finally{setBusyId('');}
  };

  const counts=useMemo(()=>({total:items.length,conCosto:items.filter((item)=>Number(item.costo_inscripcion)>0).length}),[items]);

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-slate-500/20 bg-[radial-gradient(circle_at_top_right,rgba(148,163,184,.12),transparent_38%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.18em] text-slate-300">Almacén de competencias</p><h1 className="mt-2 text-3xl font-black text-white">Historial archivado</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Aquí quedan las competencias que ya no necesitas ver en la operación diaria. Archivar no elimina convocatorias, cobros, eventos ni resultados; puedes consultar su gestión o restaurarlas cuando quieras.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/torneos" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-5 text-sm font-black text-[#c3ccd6]">← Competencias activas</Link><Link to="/partidos" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-5 text-sm font-black text-[#70e4df]">Eventos y resultados</Link></div>
      </div>
    </section>

    <section className={`${panel} p-4`}><div className="grid gap-3 md:grid-cols-[1fr_auto_auto]"><select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className="min-h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-slate-400"><option value="">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select><div className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-center text-xs text-[#8995a4]">Archivadas <strong className="ml-1 text-white">{counts.total}</strong></div><div className="rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/10 px-4 py-3 text-center text-xs text-[#D8BE87]">Con inscripción <strong className="ml-1">{counts.conCosto}</strong></div></div></section>

    {error?<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>:null}
    {loading?<div className={`${panel} p-10 text-center text-[#8b949e]`}>Cargando Almacén...</div>:<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((tournament)=><article key={tournament.id} className={`${panel} p-5`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-slate-400/20 bg-slate-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-slate-300">Archivado</span><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">{tournament.ramas?.disciplina||'Competencia'}</span></div><h2 className="mt-3 text-xl font-black text-white">{tournament.nombre}</h2><p className="mt-1 text-xs text-[#8b949e]">{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</p>{tournament.organizador?<p className="mt-1 text-xs text-[#697586]">Organiza: {tournament.organizador}</p>:null}</div><span className="text-2xl opacity-70">📦</span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Fechas</p><p className="mt-1 text-sm font-black text-white">{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</p></div><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Inscripción alumno</p><p className="mt-1 text-sm font-black text-emerald-300">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4"><Link to={`/torneos/${tournament.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 px-3 text-xs font-black text-[#c3ccd6]">Consultar</Link><button disabled={busyId===tournament.id} onClick={()=>void restore(tournament)} className="min-h-10 rounded-xl bg-emerald-500 px-3 text-xs font-black text-emerald-950 disabled:opacity-50">{busyId===tournament.id?'Restaurando...':'Restaurar'}</button></div></article>)}{!items.length?<div className={`${panel} col-span-full p-10 text-center`}><p className="text-sm font-black text-white">El Almacén está vacío.</p><p className="mt-2 text-xs text-[#697586]">Cuando archives una competencia desde el listado principal aparecerá aquí.</p></div>:null}</section>}
  </div>;
}
