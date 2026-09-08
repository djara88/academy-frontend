import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorPage,
} from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;reglamento_url?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
type EditForm={rama_id:string;nombre:string;organizador:string;ubicacion:string;reglamento_url:string;fecha_inicio:string;fecha_fin:string;costo_inscripcion:string;permite_cuotas:boolean;max_cuotas:string};
type ParticipationSummary={total:number;confirmados:number;pendientes:number;rechazados:number};

const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const emptyEdit:EditForm={rama_id:'',nombre:'',organizador:'',ubicacion:'',reglamento_url:'',fecha_inicio:'',fecha_fin:'',costo_inscripcion:'0',permite_cuotas:false,max_cuotas:'2'};
const emptyParticipation:ParticipationSummary={total:0,confirmados:0,pendientes:0,rechazados:0};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

const summarizeParticipation=(rows:any[]):ParticipationSummary=>{
  const byPlayer=new Map<string,Set<string>>();
  for(const row of rows||[]){
    const key=String(row?.jugador_id||'');
    if(!key)continue;
    if(!byPlayer.has(key))byPlayer.set(key,new Set());
    byPlayer.get(key)?.add(String(row?.respuesta_participacion||'Pendiente'));
  }
  let confirmados=0;
  let pendientes=0;
  let rechazados=0;
  for(const responses of byPlayer.values()){
    if(responses.has('Si'))confirmados+=1;
    else if(responses.has('Pendiente')||responses.size===0)pendientes+=1;
    else rechazados+=1;
  }
  return {total:byPlayer.size,confirmados,pendientes,rechazados};
};

export default function TorneosMultirama(){
  const {notify,confirmAction}=useAppDialog();
  const [items,setItems]=useState<Tournament[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState('');
  const [participation,setParticipation]=useState<Record<string,ParticipationSummary>>({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busyId,setBusyId]=useState('');
  const [editing,setEditing]=useState<Tournament|null>(null);
  const [editForm,setEditForm]=useState<EditForm>(emptyEdit);
  const [savingEdit,setSavingEdit]=useState(false);

  const load=async()=>{
    setLoading(true);
    setError('');
    try{
      const response=await api.get('/api/torneos',{params:branchId?{rama_id:branchId}:undefined});
      const tournaments=(response.data.data||[]) as Tournament[];
      setItems(tournaments);
      setBranches(response.data.ramas||[]);

      const results=await Promise.allSettled(tournaments.map(async tournament=>{
        const participantResponse=await api.get(`/api/torneos/${tournament.id}/participantes`);
        return [tournament.id,summarizeParticipation(participantResponse.data.data||[])] as const;
      }));
      const next:Record<string,ParticipationSummary>={};
      for(const result of results){
        if(result.status==='fulfilled')next[result.value[0]]=result.value[1];
      }
      setParticipation(next);
    }catch(err:any){
      setError(err.response?.data?.error||'No fue posible cargar las competencias.');
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{void load();},[branchId]);

  const counts=useMemo(()=>({
    total:items.length,
    activas:items.filter((item)=>String(item.estado||'Activo').toLowerCase()==='activo').length,
    conCosto:items.filter((item)=>Number(item.costo_inscripcion)>0).length,
  }),[items]);

  const openEdit=(tournament:Tournament)=>{
    setEditing(tournament);
    setEditForm({
      rama_id:tournament.rama_id||'',
      nombre:tournament.nombre||'',
      organizador:tournament.organizador||'',
      ubicacion:tournament.ubicacion||'',
      reglamento_url:tournament.reglamento_url||'',
      fecha_inicio:tournament.fecha_inicio||'',
      fecha_fin:tournament.fecha_fin||'',
      costo_inscripcion:String(Number(tournament.costo_inscripcion)||0),
      permite_cuotas:Boolean(tournament.permite_cuotas),
      max_cuotas:String(Math.max(2,Number(tournament.max_cuotas)||2)),
    });
  };

  const saveEdit=async()=>{
    if(!editing)return;
    if(!editForm.rama_id||!editForm.nombre.trim())return void notify('Selecciona la rama e ingresa el nombre de la competencia.');
    if(editForm.fecha_inicio&&editForm.fecha_fin&&editForm.fecha_fin<editForm.fecha_inicio)return void notify('La fecha de término no puede ser anterior a la fecha de inicio.');
    setSavingEdit(true);
    try{
      const response=await api.patch(`/api/torneos/${editing.id}`,{
        ...editForm,
        costo_inscripcion:Number(editForm.costo_inscripcion)||0,
        max_cuotas:Number(editForm.max_cuotas)||2,
      });
      setEditing(null);
      await load();
      await notify(response.data?.message||'Competencia actualizada correctamente.');
    }catch(err:any){
      await notify(err.response?.data?.error||'No fue posible editar la competencia.');
    }finally{
      setSavingEdit(false);
    }
  };

  const archive=async(tournament:Tournament)=>{
    const accepted=await confirmAction(`¿Enviar “${tournament.nombre}” al Almacén? No se eliminará ningún dato: convocatorias, cobros, eventos y resultados quedarán conservados.`,{confirmLabel:'Archivar'});
    if(!accepted)return;
    setBusyId(tournament.id);
    try{
      const response=await api.patch(`/api/torneos/${tournament.id}/archivar`);
      await load();
      await notify(response.data?.message||'Competencia archivada.');
    }catch(err:any){
      await notify(err.response?.data?.error||'No fue posible archivar la competencia.');
    }finally{
      setBusyId('');
    }
  };

  return (
    <DirectorPage className="competition-record max-w-[1450px]">
      <section className="competition-record-command" aria-labelledby="competition-record-title">
        <div className="competition-record-command-copy">
          <p className="competition-record-kicker">Competition Record</p>
          <h1 id="competition-record-title">Temporada y competencias oficiales</h1>
          <p>Una competencia reúne su contexto, participantes y compromiso económico. Los partidos, duelos o pruebas se registran después dentro de ese mismo historial deportivo.</p>
        </div>
        <div className="competition-record-actions">
          <Link to="/partidos" className={DIRECTOR_BUTTON_GHOST}>Eventos y resultados</Link>
          <Link to="/torneos/almacen" className={DIRECTOR_BUTTON_DARK}>Almacén histórico</Link>
          <Link to="/nuevo-torneo" className={DIRECTOR_BUTTON}>+ Nueva competencia</Link>
        </div>
      </section>

      <section className="competition-record-toolbar" aria-label="Alcance de competencias">
        <label className="block">
          <span className={labelClass}>Rama / disciplina</span>
          <select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}>
            <option value="">Todas las ramas</option>
            {branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}
          </select>
        </label>
        <div className="competition-record-summary" aria-label="Resumen del registro">
          <span><small>Competencias</small><strong>{counts.total}</strong></span>
          <span className="is-active"><small>Activas</small><strong>{counts.activas}</strong></span>
          <span><small>Con inscripción</small><strong>{counts.conCosto}</strong></span>
        </div>
      </section>

      {error?<div className="competition-record-error" role="alert">{error}</div>:null}

      {loading?(
        <section className="competition-record-ledger"><div className="competition-record-loading">Verificando competencias y participación…</div></section>
      ):(
        <section className="competition-record-ledger" aria-label="Registro de competencias">
          <div className="competition-record-ledger-head" aria-hidden="true"><span>Competencia</span><span>Fechas</span><span>Participación</span><span>Inscripción</span><span>Acciones</span></div>
          {items.map((tournament)=>{
            const roster=participation[tournament.id]||emptyParticipation;
            return (
              <article key={tournament.id} className="competition-record-row">
                <div className="competition-record-identity">
                  <div className="competition-record-tags"><span>{tournament.ramas?.disciplina||'Competencia'}</span><span>{tournament.ramas?.nombre||'Sin rama'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</span></div>
                  <h2>{tournament.nombre}</h2>
                  <p>{tournament.organizador?`Organiza ${tournament.organizador}`:'Organizador no informado'}{tournament.ubicacion?` · ${tournament.ubicacion}`:''}</p>
                </div>

                <div className="competition-record-dates">
                  <small>Calendario</small>
                  <strong>{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</strong>
                </div>

                <div className="competition-record-participation">
                  <small>Participación · {roster.total} deportista{roster.total===1?'':'s'}</small>
                  {roster.total?(
                    <div className="competition-record-participation-line">
                      <span className="is-confirmed"><strong>{roster.confirmados}</strong><small>Confirmados</small></span>
                      <span className="is-pending"><strong>{roster.pendientes}</strong><small>Pendientes</small></span>
                      <span className="is-out"><strong>{roster.rechazados}</strong><small>No van</small></span>
                    </div>
                  ):<p className="competition-record-participation-empty">Aún sin convocatoria. Puedes definir el equipo aunque no exista ningún evento.</p>}
                </div>

                <div className="competition-record-cost">
                  <small>Inscripción</small>
                  <strong>{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</strong>
                  <span>{tournament.permite_cuotas?`Hasta ${tournament.max_cuotas} cuotas`:'Pago único'}</span>
                </div>

                <div className="competition-record-row-actions">
                  <Link to={`/torneos/${tournament.id}`} className={DIRECTOR_BUTTON}>{roster.total?'Gestionar':'Definir equipo'}</Link>
                  <button onClick={()=>openEdit(tournament)} className={DIRECTOR_BUTTON_GHOST}>Editar</button>
                  <button disabled={busyId===tournament.id} onClick={()=>void archive(tournament)} className={DIRECTOR_BUTTON_DARK}>{busyId===tournament.id?'...':'Archivar'}</button>
                </div>
              </article>
            );
          })}
          {!items.length?<div className="competition-record-empty"><strong>No hay competencias activas.</strong><span>Crea una nueva competencia o revisa el Almacén si buscas una temporada anterior.</span></div>:null}
        </section>
      )}

      {editing?(
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Editar competencia</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">{editing.nombre}</h2>
                <p className="mt-1 text-xs leading-5 text-[#697468]">Corrige los mismos datos definidos al crearla. Si ya tiene convocados o eventos, la rama queda protegida por el backend.</p>
              </div>
              <button type="button" onClick={()=>setEditing(null)} className={`${DIRECTOR_BUTTON_GHOST} min-h-10 px-3`} aria-label="Cerrar edición">✕</button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className={labelClass}>Rama deportiva *</span><select value={editForm.rama_id} onChange={(event)=>setEditForm({...editForm,rama_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Selecciona rama</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></label>
              <label className="sm:col-span-2"><span className={labelClass}>Nombre *</span><input value={editForm.nombre} onChange={(event)=>setEditForm({...editForm,nombre:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label><span className={labelClass}>Organizador</span><input value={editForm.organizador} onChange={(event)=>setEditForm({...editForm,organizador:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label><span className={labelClass}>Lugar / recinto general</span><input value={editForm.ubicacion} onChange={(event)=>setEditForm({...editForm,ubicacion:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label><span className={labelClass}>Fecha inicio</span><input type="date" value={editForm.fecha_inicio} onChange={(event)=>setEditForm({...editForm,fecha_inicio:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label><span className={labelClass}>Fecha término</span><input type="date" value={editForm.fecha_fin} onChange={(event)=>setEditForm({...editForm,fecha_fin:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <label className="sm:col-span-2"><span className={labelClass}>Reglamento / bases</span><input value={editForm.reglamento_url} onChange={(event)=>setEditForm({...editForm,reglamento_url:event.target.value})} className={DIRECTOR_FIELD} placeholder="https://..."/></label>
              <label><span className={labelClass}>Valor por alumno</span><input type="number" min="0" value={editForm.costo_inscripcion} onChange={(event)=>setEditForm({...editForm,costo_inscripcion:event.target.value})} className={DIRECTOR_FIELD}/></label>
              <div className="rounded-[18px] border border-[#dfe5dc] bg-[#f5f7f3] p-4">
                <label className="flex items-start gap-3 text-sm font-bold text-[#111711]"><input type="checkbox" checked={editForm.permite_cuotas} onChange={(event)=>setEditForm({...editForm,permite_cuotas:event.target.checked})} className="mt-1 accent-[#9fcf00]"/><span>Permitir pago en cuotas</span></label>
                {editForm.permite_cuotas?<label className="mt-3 block"><span className={labelClass}>Máximo de cuotas</span><input type="number" min="2" max="12" value={editForm.max_cuotas} onChange={(event)=>setEditForm({...editForm,max_cuotas:event.target.value})} className={DIRECTOR_FIELD}/></label>:null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={()=>setEditing(null)} className={DIRECTOR_BUTTON_DARK}>Cancelar</button>
              <button type="button" disabled={savingEdit} onClick={()=>void saveEdit()} className={DIRECTOR_BUTTON}>{savingEdit?'Guardando...':'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      ):null}
    </DirectorPage>
  );
}
