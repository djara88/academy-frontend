import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

type Guardian={id:string;nombre_completo:string;rut?:string|null;email?:string|null;telefono?:string|null;parentesco?:string|null;direccion?:string|null;usuario_id?:string|null;acceso_activo:boolean;jugadores:{id:string;nombre:string}[]};
type Filter='Todos'|'Activos'|'Sin acceso'|'Desactivados';

export default function ApoderadosFamilyBoard(){
  const {notify,confirmAction}=useAppDialog();
  const [selected,setSelected]=useState<Guardian|null>(null);
  const [email,setEmail]=useState('');
  const [saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<Guardian|null>(null);
  const [editForm,setEditForm]=useState({nombre_completo:'',rut:'',telefono:'',email:'',parentesco:'',direccion:''});
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<Filter>('Todos');
  const query=useQuery({queryKey:['apoderados-accesos'],queryFn:async()=>(await api.get('/api/apoderados')).data.data as Guardian[],retry:false});
  const licenseMissing=(query.error as any)?.response?.data?.code==='FEATURE_NOT_INCLUDED';

  const guardians=query.data||[];
  const activeCount=guardians.filter(item=>item.usuario_id&&item.acceso_activo).length;
  const pendingCount=guardians.filter(item=>!item.usuario_id).length;
  const disabledCount=guardians.filter(item=>item.usuario_id&&!item.acceso_activo).length;
  const visible=useMemo(()=>{const term=search.trim().toLowerCase();return guardians.filter(guardian=>{if(term&&!`${guardian.nombre_completo} ${guardian.email||''} ${guardian.telefono||''} ${guardian.jugadores.map(player=>player.nombre).join(' ')}`.toLowerCase().includes(term))return false;if(filter==='Activos'&&!(guardian.usuario_id&&guardian.acceso_activo))return false;if(filter==='Sin acceso'&&guardian.usuario_id)return false;if(filter==='Desactivados'&&(!guardian.usuario_id||guardian.acceso_activo))return false;return true;});},[guardians,search,filter]);

  const openEdit=(guardian:Guardian)=>{setEditing(guardian);setEditForm({nombre_completo:guardian.nombre_completo||'',rut:guardian.rut||'',telefono:guardian.telefono||'',email:guardian.email||'',parentesco:guardian.parentesco||'',direccion:guardian.direccion||''});};
  const saveEdit=async()=>{if(!editing||!editForm.nombre_completo.trim())return;setSaving(true);try{const response=await api.patch(`/api/apoderados/${editing.id}`,editForm);setEditing(null);await query.refetch();await notify(response.data?.message||'Datos del apoderado actualizados.');}catch(error:any){await notify(error.response?.data?.error||'No fue posible actualizar los datos del apoderado.');}finally{setSaving(false);}};
  const invite=async()=>{if(!selected)return;setSaving(true);try{const response=await api.post(`/api/apoderados/${selected.id}/acceso`,{email});setSelected(null);await query.refetch();await notify(response.data.email_sent?response.data.message:`${response.data.message}\n\nContraseña temporal: ${response.data.temporary_password}`);}catch(error:any){await notify(error.response?.data?.error||'No fue posible crear el acceso.');}finally{setSaving(false);}};
  const toggle=async(guardian:Guardian)=>{const active=!guardian.acceso_activo;if(!await confirmAction(`${active?'¿Reactivar':'¿Desactivar'} el acceso de ${guardian.nombre_completo}?`))return;try{await api.patch(`/api/apoderados/${guardian.id}/estado`,{activo:active});await query.refetch();}catch(error:any){await notify(error.response?.data?.error||'No fue posible cambiar el acceso.');}};
  const resetPassword=async(guardian:Guardian)=>{if(!await confirmAction(`¿Generar una nueva contraseña temporal para ${guardian.nombre_completo}?`))return;try{const response=await api.post(`/api/apoderados/${guardian.id}/reset-password`);await notify(response.data.email_sent?response.data.message:`${response.data.message}\n\nContraseña temporal: ${response.data.temporary_password}`);}catch(error:any){await notify(error.response?.data?.error||'No fue posible restablecer la contraseña.');}};

  if(licenseMissing)return <DirectorPage className="max-w-5xl"><div className="family-access"><header className="family-access-command"><div className="family-access-command-copy"><p className="family-access-kicker">Family Access · Licencia independiente</p><h1>Portal de Apoderados</h1><p>El acceso familiar se contrata por academia y mantiene a cada cuenta aislada a sus deportistas vinculados, confirmaciones, comunicaciones y estado de cuenta.</p></div></header><section className="family-access-license-lock"><div><p className="family-access-kicker" style={{color:'var(--ls-accent-text)'}}>Licencia requerida</p><h2>Activa Apoderados PRO para habilitar accesos familiares</h2><p>La operación deportiva principal sigue disponible. Esta licencia solo habilita el portal privado para familias.</p></div><Link to="/apoderados-pro" className={DIRECTOR_BUTTON}>Revisar Apoderados PRO</Link></section></div></DirectorPage>;
  if(query.isLoading)return <div className="family-access"><div className="family-access-loading">Verificando familias y accesos…</div></div>;

  return <DirectorPage className="max-w-[1450px]">
    <div className="family-access">
      <header className="family-access-command">
        <div className="family-access-command-copy"><p className="family-access-kicker">Family Access Board</p><h1>Familias vinculadas al plantel</h1><p>La lectura parte por el vínculo familia ↔ deportista. El correo, teléfono y acceso son canales de esa relación, no el centro del producto.</p></div>
        <div className="family-access-command-side"><div className="family-access-summary"><span className="is-active"><small>Activos</small><strong>{activeCount}</strong></span><span><small>Sin acceso</small><strong>{pendingCount}</strong></span><span><small>Cerrados</small><strong>{disabledCount}</strong></span></div><Link to="/comunicaciones" className={DIRECTOR_BUTTON}>Family Touchpoint</Link></div>
      </header>

      <section className="family-access-toolbar"><input className={DIRECTOR_FIELD} value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar familia o deportista"/><div className="family-access-filter" aria-label="Filtrar familias">{(['Todos','Activos','Sin acceso','Desactivados'] as Filter[]).map(value=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{value}</button>)}</div></section>

      <section className="family-access-board">
        <div className="family-access-head"><span>Familia</span><span>Deportistas vinculados</span><span>Canal</span><span>Acceso</span><span>Acciones</span></div>
        {visible.map(guardian=><article key={guardian.id} className="family-access-row">
          <div className="family-access-person"><span className="family-access-avatar">{guardian.nombre_completo.slice(0,1).toUpperCase()}</span><div><strong>{guardian.nombre_completo}</strong><small>{guardian.parentesco||'Vínculo familiar'}{guardian.rut?` · ${guardian.rut}`:''}</small></div></div>
          <div className="family-access-athletes">{guardian.jugadores.length?guardian.jugadores.map(player=><span key={player.id}>{player.nombre}</span>):<span>Sin deportista vinculado</span>}</div>
          <div className="family-access-channel"><strong>{guardian.email||'Sin correo'}</strong><small>{guardian.telefono||'Sin teléfono'}</small></div>
          <span className={`family-access-status ${guardian.usuario_id?guardian.acceso_activo?'is-active':'is-off':'is-pending'}`}>{guardian.usuario_id?guardian.acceso_activo?'Acceso activo':'Acceso cerrado':'Sin acceso'}</span>
          <div className="family-access-actions"><button type="button" onClick={()=>openEdit(guardian)} className={DIRECTOR_BUTTON_GHOST}>Editar</button>{guardian.usuario_id?<><button type="button" onClick={()=>void resetPassword(guardian)} className={DIRECTOR_BUTTON_GHOST}>Clave</button><button type="button" onClick={()=>void toggle(guardian)} className={guardian.acceso_activo?DIRECTOR_BUTTON_DARK:DIRECTOR_BUTTON}>{guardian.acceso_activo?'Cerrar':'Reactivar'}</button></>:<button type="button" onClick={()=>{setSelected(guardian);setEmail(guardian.email||'');}} disabled={!guardian.jugadores.length} className={DIRECTOR_BUTTON}>Crear acceso</button>}</div>
        </article>)}
        {!visible.length?<div className="family-access-empty"><strong>No hay familias para este filtro.</strong><span>Los vínculos se crean desde matrícula y admisión; aquí administras sus datos y acceso.</span></div>:null}
      </section>

      {editing?<div className="family-access-dialog-backdrop"><div className="family-access-dialog" role="dialog" aria-modal="true" aria-label="Editar apoderado"><p className="family-access-kicker" style={{color:'var(--ls-accent-text)'}}>Vínculo familiar</p><h2>Editar datos de {editing.nombre_completo}</h2><p>Si cambias el correo de una cuenta activa, Lestra actualiza también su acceso de inicio de sesión.</p><div className="family-access-dialog-fields"><input className={DIRECTOR_FIELD} value={editForm.nombre_completo} onChange={event=>setEditForm({...editForm,nombre_completo:event.target.value})} placeholder="Nombre completo"/><input className={DIRECTOR_FIELD} value={editForm.rut} onChange={event=>setEditForm({...editForm,rut:event.target.value})} placeholder="RUT"/><input className={DIRECTOR_FIELD} value={editForm.telefono} onChange={event=>setEditForm({...editForm,telefono:event.target.value})} placeholder="Teléfono"/><input className={DIRECTOR_FIELD} type="email" value={editForm.email} onChange={event=>setEditForm({...editForm,email:event.target.value})} placeholder="Correo"/><input className={DIRECTOR_FIELD} value={editForm.parentesco} onChange={event=>setEditForm({...editForm,parentesco:event.target.value})} placeholder="Parentesco"/><input className={DIRECTOR_FIELD} value={editForm.direccion} onChange={event=>setEditForm({...editForm,direccion:event.target.value})} placeholder="Dirección"/></div><div className="family-access-dialog-actions"><button type="button" onClick={()=>setEditing(null)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" onClick={()=>void saveEdit()} disabled={saving||!editForm.nombre_completo.trim()} className={DIRECTOR_BUTTON}>{saving?'Guardando…':'Guardar cambios'}</button></div></div></div>:null}

      {selected?<div className="family-access-dialog-backdrop"><div className="family-access-dialog" role="dialog" aria-modal="true" aria-label="Crear acceso de apoderado"><p className="family-access-kicker" style={{color:'var(--ls-accent-text)'}}>Nuevo acceso familiar</p><h2>{selected.nombre_completo}</h2><p>Solo verá a {selected.jugadores.map(item=>item.nombre).join(', ')} y las funciones familiares habilitadas para la academia.</p><div className="family-access-dialog-fields"><input className={`${DIRECTOR_FIELD} sm:col-span-2`} type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="Correo de acceso"/></div><div className="family-access-dialog-actions"><button type="button" onClick={()=>setSelected(null)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" onClick={()=>void invite()} disabled={saving||!email} className={DIRECTOR_BUTTON}>{saving?'Creando…':'Crear y enviar'}</button></div></div></div>:null}
    </div>
  </DirectorPage>;
}
