import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorHero, DirectorPage, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
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
    }catch(err:any){setError(err.response?.data?.error||'No fue posible cargar el Almacén de competencias.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[branchId]);

  const restore=async(tournament:Tournament)=>{
    const accepted=await confirmAction(`¿Restaurar “${tournament.nombre}” al listado de competencias activas?`,{confirmLabel:'Restaurar'});
    if(!accepted)return;
    setBusyId(tournament.id);
    try{const response=await api.patch(`/api/torneos/${tournament.id}/restaurar`);await notify(response.data?.message||'Competencia restaurada.');await load();}
    catch(err:any){await notify(err.response?.data?.error||'No fue posible restaurar la competencia.');}
    finally{setBusyId('');}
  };

  const counts=useMemo(()=>({total:items.length,conCosto:items.filter(item=>Number(item.costo_inscripcion)>0).length}),[items]);

  return <DirectorPage>
    <DirectorHero eyebrow="Almacén de competencias" title="Historial archivado" description="Consulta competencias fuera de la operación diaria sin perder convocatorias, cobros, eventos ni resultados. Puedes restaurarlas cuando corresponda." actions={<><Link to="/torneos" className={DIRECTOR_BUTTON_DARK}>← Competencias activas</Link><Link to="/partidos" className={DIRECTOR_BUTTON_GHOST}>Eventos y resultados</Link></>}/>

    <section className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(170px,.45fr))]">
      <DirectorPanel className="p-4"><select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las ramas</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></DirectorPanel>
      <DirectorStat label="Archivadas" value={counts.total}/>
      <DirectorStat label="Con inscripción" value={counts.conCosto} tone="lime"/>
    </section>

    {error?<div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>:null}
    {loading?<DirectorPanel className="p-10 text-center text-sm font-bold text-[#697468]">Cargando Almacén...</DirectorPanel>:<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map(tournament=><DirectorPanel key={tournament.id} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#d9e0d6] bg-[#f5f7f3] px-2.5 py-1 text-[10px] font-black uppercase text-[#697468]">Archivado</span><span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black uppercase text-[#5f7900]">{tournament.ramas?.disciplina||'Competencia'}</span></div><h2 className="mt-3 text-xl font-black text-[#111711]">{tournament.nombre}</h2><p className="mt-1 text-xs text-[#697468]">{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</p>{tournament.organizador?<p className="mt-1 text-xs text-[#758074]">Organiza: {tournament.organizador}</p>:null}</div>
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#111711] text-xl">📦</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-[16px] border border-[#dfe5dc] bg-[#f6f8f4] p-3"><p className="text-[10px] font-black uppercase text-[#758074]">Fechas</p><p className="mt-1 text-sm font-black text-[#111711]">{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</p></div><div className="rounded-[16px] border border-[#cde995] bg-[#f3fadf] p-3"><p className="text-[10px] font-black uppercase text-[#6a7d35]">Inscripción alumno</p><p className="mt-1 text-sm font-black text-[#4f6900]">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</p></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#e2e7df] pt-4"><Link to={`/torneos/${tournament.id}`} className={`${DIRECTOR_BUTTON_GHOST} min-h-10 px-3 text-xs`}>Consultar</Link><button disabled={busyId===tournament.id} onClick={()=>void restore(tournament)} className={`${DIRECTOR_BUTTON} min-h-10 px-3 text-xs`}>{busyId===tournament.id?'Restaurando...':'Restaurar'}</button></div>
      </DirectorPanel>)}
      {!items.length?<DirectorPanel className="col-span-full p-10 text-center"><p className="text-sm font-black text-[#111711]">El Almacén está vacío.</p><p className="mt-2 text-xs text-[#697468]">Cuando archives una competencia aparecerá aquí.</p></DirectorPanel>:null}
    </section>}
  </DirectorPage>;
}
