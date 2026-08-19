import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch={id:string;nombre:string;disciplina:string;sede_id:string;sedes?:{id:string;nombre:string}|null};
type Tournament={id:string;nombre:string;fecha_inicio?:string|null;fecha_fin?:string|null;costo_inscripcion:number;permite_cuotas:boolean;max_cuotas:number;estado?:string|null;rama_id?:string|null;sede_id?:string|null;organizador?:string|null;ubicacion?:string|null;reglamento_url?:string|null;ramas?:{id:string;nombre:string;disciplina:string}|null;sedes?:{id:string;nombre:string}|null};
type EditForm={rama_id:string;nombre:string;organizador:string;ubicacion:string;reglamento_url:string;fecha_inicio:string;fecha_fin:string;costo_inscripcion:string;permite_cuotas:boolean;max_cuotas:string};
const panel='rounded-[24px] border border-white/10 bg-[#151b25]';
const field='w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const emptyEdit:EditForm={rama_id:'',nombre:'',organizador:'',ubicacion:'',reglamento_url:'',fecha_inicio:'',fecha_fin:'',costo_inscripcion:'0',permite_cuotas:false,max_cuotas:'2'};

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

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.17),transparent_38%),#151b25] p-6 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Competencias y resultados</p><h1 className="mt-2 text-3xl font-black text-white">Campeonatos y competencias</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Registra las competencias agendadas por tu academia, seleccionando la rama correspondiente. Aquí administras inscripción por alumno, cuotas, convocatorias y el acceso a sus eventos deportivos.</p></div><div className="flex flex-wrap gap-2"><Link to="/partidos" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-5 text-sm font-black text-[#70e4df]">Eventos y resultados</Link><Link to="/torneos/almacen" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-400/20 bg-slate-500/10 px-5 text-sm font-black text-slate-200">📦 Almacén</Link><Link to="/nuevo-torneo" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c]">+ Nueva competencia</Link></div></div></section>

    <section className={`${panel} p-4`}><div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]"><select value={branchId} onChange={(event)=>setBranchId(event.target.value)} className="min-h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white outline-none focus:border-[#C8A96B]"><option value="">Todas las ramas</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select><div className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3 text-center text-xs text-[#8995a4]">Total <strong className="ml-1 text-white">{counts.total}</strong></div><div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-center text-xs text-emerald-300">Activas <strong className="ml-1">{counts.activas}</strong></div><div className="rounded-xl border border-[#C8A96B]/20 bg-[#C8A96B]/10 px-4 py-3 text-center text-xs text-[#D8BE87]">Con inscripción <strong className="ml-1">{counts.conCosto}</strong></div></div></section>

    {error?<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>:null}
    {loading?<div className={`${panel} p-10 text-center text-[#8b949e]`}>Cargando competencias...</div>:<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((tournament)=><article key={tournament.id} className={`${panel} p-5 transition hover:-translate-y-0.5 hover:border-[#C8A96B]/40`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">{tournament.ramas?.disciplina||'Competencia'}</span><span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-sky-300">Seguimiento Lestra</span></div><h2 className="mt-3 text-xl font-black text-white">{tournament.nombre}</h2><p className="mt-1 text-xs text-[#8b949e]">{tournament.ramas?.nombre||'Sin rama asociada'}{tournament.sedes?.nombre?` · ${tournament.sedes.nombre}`:''}</p>{tournament.organizador?<p className="mt-1 text-xs text-[#697586]">Organiza: {tournament.organizador}</p>:null}</div><span className="text-2xl">🏆</span></div><div className="mt-4 rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[9px] font-black uppercase tracking-[.12em] text-[#697586]">Gestión de la academia</p><p className="mt-1 text-sm font-black text-white">Convocatorias · eventos · resultados</p><p className="mt-1 text-[11px] leading-4 text-[#697586]">La competencia pertenece a una rama, pero el listado principal permite ver todas las ramas de la academia.</p></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Fechas</p><p className="mt-1 text-sm font-black text-white">{tournament.fecha_inicio||'Por definir'}{tournament.fecha_fin&&tournament.fecha_fin!==tournament.fecha_inicio?` → ${tournament.fecha_fin}`:''}</p></div><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[10px] uppercase text-[#697586]">Inscripción alumno</p><p className="mt-1 text-sm font-black text-emerald-300">{Number(tournament.costo_inscripcion)>0?money(tournament.costo_inscripcion):'Gratuito'}</p></div></div><div className="mt-3 rounded-xl bg-[#0d1117] px-3 py-2 text-xs font-bold text-[#8995a4]">{tournament.permite_cuotas?`Pago en hasta ${tournament.max_cuotas} cuotas`:'Pago único'}</div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-4"><Link to={`/torneos/${tournament.id}`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#289E9D] px-3 text-xs font-black text-white">Gestionar</Link><button onClick={()=>openEdit(tournament)} className="min-h-10 rounded-xl border border-[#C8A96B]/30 bg-[#C8A96B]/10 px-3 text-xs font-black text-[#D8BE87]">Editar</button><button disabled={busyId===tournament.id} onClick={()=>void archive(tournament)} className="min-h-10 rounded-xl border border-slate-500/30 bg-slate-500/10 px-3 text-xs font-black text-slate-300 disabled:opacity-50">{busyId===tournament.id?'...':'Archivar'}</button></div></article>)}{!items.length?<div className={`${panel} col-span-full p-10 text-center`}><p className="text-sm font-black text-white">No hay competencias activas.</p><p className="mt-2 text-xs text-[#697586]">Crea una nueva competencia o revisa el Almacén si buscas una anterior.</p></div>:null}</section>}

    {editing?<div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"><div className="w-full max-w-3xl rounded-3xl border border-[#C8A96B]/30 bg-[#151b25] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#D8BE87]">Editar competencia</p><h2 className="mt-1 text-2xl font-black text-white">{editing.nombre}</h2><p className="mt-1 text-xs leading-5 text-[#8b949e]">Puedes corregir los mismos datos definidos al crearla. Si ya tiene convocados o eventos, la rama quedará protegida por el backend.</p></div><button onClick={()=>setEditing(null)} className="rounded-xl border border-white/10 px-3 py-2 text-sm font-black text-[#8b949e]">✕</button></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Rama deportiva *</span><select value={editForm.rama_id} onChange={(event)=>setEditForm({...editForm,rama_id:event.target.value})} className={field}><option value="">Selecciona rama</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Nombre *</span><input value={editForm.nombre} onChange={(event)=>setEditForm({...editForm,nombre:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Organizador</span><input value={editForm.organizador} onChange={(event)=>setEditForm({...editForm,organizador:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Lugar / recinto general</span><input value={editForm.ubicacion} onChange={(event)=>setEditForm({...editForm,ubicacion:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha inicio</span><input type="date" value={editForm.fecha_inicio} onChange={(event)=>setEditForm({...editForm,fecha_inicio:event.target.value})} className={field}/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Fecha término</span><input type="date" value={editForm.fecha_fin} onChange={(event)=>setEditForm({...editForm,fecha_fin:event.target.value})} className={field}/></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Reglamento / bases</span><input value={editForm.reglamento_url} onChange={(event)=>setEditForm({...editForm,reglamento_url:event.target.value})} className={field} placeholder="https://..."/></label><label><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Valor por alumno</span><input type="number" min="0" value={editForm.costo_inscripcion} onChange={(event)=>setEditForm({...editForm,costo_inscripcion:event.target.value})} className={field}/></label><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><label className="flex items-start gap-3 text-sm font-bold text-[#c3ccd6]"><input type="checkbox" checked={editForm.permite_cuotas} onChange={(event)=>setEditForm({...editForm,permite_cuotas:event.target.checked})} className="mt-1 accent-[#C8A96B]"/><span>Permitir pago en cuotas</span></label>{editForm.permite_cuotas?<label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-[#9aa6b5]">Máximo de cuotas</span><input type="number" min="2" max="12" value={editForm.max_cuotas} onChange={(event)=>setEditForm({...editForm,max_cuotas:event.target.value})} className={field}/></label>:null}</div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={()=>setEditing(null)} className="min-h-12 rounded-xl border border-white/10 px-4 text-sm font-black text-[#c3ccd6]">Cancelar</button><button disabled={savingEdit} onClick={()=>void saveEdit()} className="min-h-12 rounded-xl bg-[#C8A96B] px-4 text-sm font-black text-[#15120c] disabled:opacity-50">{savingEdit?'Guardando...':'Guardar cambios'}</button></div></div></div>:null}
  </div>;
}
