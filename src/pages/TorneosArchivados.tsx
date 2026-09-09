import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

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
    }catch(err:any){setError(err.response?.data?.error||'No fue posible cargar el historial de competencias.');}
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
    <div className="competition-record competition-archive-ledger">
      <header className="competition-record-command">
        <div className="competition-record-command-copy">
          <p className="competition-record-kicker">Competition Archive · Historial de temporada</p>
          <h1>Competencias archivadas</h1>
          <p>El archivo conserva la trazabilidad de la academia. Convocatorias, cobros, eventos y resultados permanecen disponibles sin ocupar la operación diaria.</p>
        </div>
        <div className="competition-record-actions"><Link to="/torneos" className={DIRECTOR_BUTTON_DARK}>← Temporada activa</Link><Link to="/partidos" className={DIRECTOR_BUTTON_GHOST}>Eventos y resultados</Link></div>
      </header>

      <section className="competition-record-toolbar">
        <select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las ramas</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select>
        <div className="competition-record-summary"><span><small>Archivadas</small><strong>{counts.total}</strong></span><span className="is-active"><small>Con inscripción</small><strong>{counts.conCosto}</strong></span></div>
      </section>

      {error?<div className="competition-record-error">{error}</div>:null}
      {loading?<div className="competition-record-loading">Cargando historial de temporada…</div>:<section className="competition-record-ledger">
        <div className="competition-record-ledger-head"><span>Competencia</span><span>Fechas</span><span>Historial</span><span>Inscripción</span><span>Acciones</span></div>
        {items.map(tournament=><article key={tournament.id} className="competition-record-row">
          <div className="competition-record-identity"><div className="competition-record-tags"><span>Archivada</span><span>{tournament.ramas?.disciplina||'Competencia'}</span></div><h2>{tournament.nombre}</h2><p>{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}{tournament.organizador?` · ${tournament.organizador}`:''}</p></div>
          <div className="competition-record-dates"><small>Periodo</small><strong>{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</strong></div>
          <div className="competition-record-participation"><small>Estado</small><p className="competition-archive-note">Fuera de la operación diaria. Sus convocatorias, cobros, eventos y resultados siguen asociados a este registro.</p></div>
          <div className="competition-record-cost"><small>Inscripción</small><strong>{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuita'}</strong><span>{tournament.permite_cuotas?`Hasta ${tournament.max_cuotas} cuotas`:'Pago único'}</span></div>
          <div className="competition-record-row-actions"><Link to={`/torneos/${tournament.id}`} className={DIRECTOR_BUTTON_GHOST}>Consultar</Link><button disabled={busyId===tournament.id} onClick={()=>void restore(tournament)} className={DIRECTOR_BUTTON}>{busyId===tournament.id?'Restaurando…':'Restaurar'}</button></div>
        </article>)}
        {!items.length?<div className="competition-record-empty"><strong>El historial archivado está vacío.</strong><span>Cuando archives una competencia aparecerá aquí sin perder su trazabilidad.</span></div>:null}
      </section>}
    </div>
  </DirectorPage>;
}
