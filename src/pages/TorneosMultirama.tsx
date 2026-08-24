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
} from '../components/director/DirectorModule';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;reglamento_url?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
type EditForm={rama_id:string;nombre:string;organizador:string;ubicacion:string;reglamento_url:string;fecha_inicio:string;fecha_fin:string;costo_inscripcion:string;permite_cuotas:boolean;max_cuotas:string};
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const emptyEdit:EditForm={rama_id:'',nombre:'',organizador:'',ubicacion:'',reglamento_url:'',fecha_inicio:'',fecha_fin:'',costo_inscripcion:'0',permite_cuotas:false,max_cuotas:'2'};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

export default function TorneosMultirama(){
  const {notify,confirmAction}=useAppDialog();
  const [items,setItems]=useState<Tournament[]>([]);
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busyId,setBusyId]=useState('');
  const [editing,setEditing]=useState<Tournament|null>(null);
  const [editForm,setEditForm]=useState<EditForm>(emptyEdit);
  const [savingEdit,setSavingEdit]=useState(false);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const response=await api.get('/api/torneos',{params:branchId?{rama_id:branchId}:undefined});
      setItems(response.data.data||[]);
      setBranches(response.data.ramas||[]);
    }catch(err:any){
      setError(err.response?.data?.error||'No fue posible cargar las competencias.');
    }finally{setLoading(false);}
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
    }finally{setSavingEdit(false);}
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
    }finally{setBusyId('');}
  };

  return (
    <DirectorPage>
      <DirectorHero
        eyebrow="Competencias oficiales"
        title="Campeonatos y competencias"
        description="Administra competencias por rama, convocatorias, cobros, eventos y resultados desde una sola vista coherente."
        actions={
          <>
            <Link to="/partidos" className={DIRECTOR_BUTTON_GHOST}>Eventos y resultados</Link>
            <Link to="/torneos/almacen" className={DIRECTOR_BUTTON_DARK}>Almacén</Link>
            <Link to="/nuevo-torneo" className={DIRECTOR_BUTTON}>+ Nueva competencia</Link>
          </>
        }
      />

      <section className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(160px,.5fr))]">
        <DirectorPanel className="p-4">
          <label className="block">
            <span className={labelClass}>Filtrar rama</span>
            <select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}>
              <option value="">Todas las ramas</option>
              {branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}
            </select>
          </label>
        </DirectorPanel>
        <DirectorStat label="Total" value={counts.total} />
        <DirectorStat label="Activas" value={counts.activas} tone="lime" />
        <DirectorStat label="Con inscripción" value={counts.conCosto} tone="dark" />
      </section>

      {error?<div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>:null}

      {loading ? (
        <DirectorPanel className="p-10 text-center text-sm font-bold text-[#697468]">Cargando competencias...</DirectorPanel>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((tournament)=>(
            <DirectorPanel key={tournament.id} className="overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[#a8ba9f]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2.5 py-1 text-[10px] font-black uppercase text-[#5f7900]">{tournament.ramas?.disciplina||'Competencia'}</span>
                    <span className="rounded-full border border-[#dce2d8] bg-[#f4f6f2] px-2.5 py-1 text-[10px] font-black uppercase text-[#697468]">Seguimiento Lestra</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black tracking-[-.03em] text-[#111711]">{tournament.nombre}</h2>
                  <p className="mt-1 text-xs text-[#697468]">{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</p>
                  {tournament.organizador?<p className="mt-1 text-xs text-[#7a8477]">Organiza: {tournament.organizador}</p>:null}
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#111711] text-lg">🏆</div>
              </div>

              <div className="mt-4 rounded-[16px] border border-[#dfe5dc] bg-[#f5f7f3] p-3">
                <p className="text-[9px] font-black uppercase tracking-[.12em] text-[#748073]">Gestión de la academia</p>
                <p className="mt-1 text-sm font-black text-[#111711]">Convocatorias · eventos · resultados</p>
                <p className="mt-1 text-[11px] leading-4 text-[#697468]">Cada competencia pertenece a una rama, pero esta vista consolida toda la academia.</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-[16px] border border-[#e0e5dd] bg-white p-3">
                  <p className="text-[10px] font-black uppercase text-[#748073]">Fechas</p>
                  <p className="mt-1 text-sm font-black text-[#111711]">{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</p>
                </div>
                <div className="rounded-[16px] border border-[#cde995] bg-[#f3fadf] p-3">
                  <p className="text-[10px] font-black uppercase text-[#6a7d35]">Inscripción</p>
                  <p className="mt-1 text-sm font-black text-[#4f6900]">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</p>
                </div>
              </div>

              <div className="mt-3 rounded-[14px] bg-[#111711] px-3 py-2 text-xs font-bold text-white">{tournament.permite_cuotas?`Pago en hasta ${tournament.max_cuotas} cuotas`:'Pago único'}</div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[#e3e8e0] pt-4">
                <Link to={`/torneos/${tournament.id}`} className={`${DIRECTOR_BUTTON} min-h-10 px-3 text-xs`}>Gestionar</Link>
                <button onClick={()=>openEdit(tournament)} className={`${DIRECTOR_BUTTON_GHOST} min-h-10 px-3 text-xs`}>Editar</button>
                <button disabled={busyId===tournament.id} onClick={()=>void archive(tournament)} className={`${DIRECTOR_BUTTON_DARK} min-h-10 px-3 text-xs`}>{busyId===tournament.id?'...':'Archivar'}</button>
              </div>
            </DirectorPanel>
          ))}
          {!items.length ? (
            <DirectorPanel className="col-span-full p-10 text-center">
              <p className="text-sm font-black text-[#111711]">No hay competencias activas.</p>
              <p className="mt-2 text-xs text-[#697468]">Crea una nueva competencia o revisa el Almacén si buscas una anterior.</p>
            </DirectorPanel>
          ) : null}
        </section>
      )}

      {editing ? (
        <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Editar competencia</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">{editing.nombre}</h2>
                <p className="mt-1 text-xs leading-5 text-[#697468]">Corrige los mismos datos definidos al crearla. Si ya tiene convocados o eventos, la rama queda protegida por el backend.</p>
              </div>
              <button onClick={()=>setEditing(null)} className={`${DIRECTOR_BUTTON_GHOST} min-h-10 px-3`}>✕</button>
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
              <button onClick={()=>setEditing(null)} className={DIRECTOR_BUTTON_DARK}>Cancelar</button>
              <button disabled={savingEdit} onClick={()=>void saveEdit()} className={DIRECTOR_BUTTON}>{savingEdit?'Guardando...':'Guardar cambios'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </DirectorPage>
  );
}
