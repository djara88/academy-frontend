import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, MegaphoneIcon, PaperAirplaneIcon, PlusIcon, ShieldExclamationIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DIRECTOR_TEXTAREA, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

type CategoryCandidate = {
  id: string;
  nombre: string;
  sede_id?: string | null;
  rama_id?: string | null;
  ramas?: { id:string; nombre:string; disciplina:string } | null;
  sedes?: { id:string; nombre:string } | null;
  apoderados_con_whatsapp: number;
};
type Candidates = { global_count: number; categories: CategoryCandidate[] };
type Group = {
  id: string;
  categoria_id?: string | null;
  scope: 'global' | 'categoria';
  nombre: string;
  group_jid?: string | null;
  estado: 'creando' | 'activo' | 'error' | 'cerrado';
  participantes_objetivo: number;
  participantes_agregados: number;
  last_error?: string | null;
  created_at: string;
  last_sync_at?: string | null;
  categorias?: {
    id: string;
    nombre: string;
    rama_id?: string | null;
    sede_id?: string | null;
    ramas?: { id:string; nombre:string; disciplina:string } | null;
    sedes?: { id:string; nombre:string } | null;
  } | null;
};

const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';
const categoryLabel=(category?:CategoryCandidate|Group['categorias']|null)=>{
  if(!category)return 'Categoría sin contexto';
  const branch=category.ramas?`${category.ramas.disciplina} · ${category.ramas.nombre}`:'Rama pendiente';
  return `${branch} · ${category.nombre}${category.sedes?.nombre?` · ${category.sedes.nombre}`:''}`;
};
const groupStatusClass=(status:Group['estado'])=>status==='activo'?'border-[#cde995] bg-[#f3fadf] text-[#4f6900]':status==='error'?'border-red-200 bg-red-50 text-red-700':status==='cerrado'?'border-[#dfe5dc] bg-[#f4f6f2] text-[#697468]':'border-amber-200 bg-amber-50 text-amber-700';

const WhatsAppGroups=()=>{
  const {notify,confirmAction}=useAppDialog();
  const queryClient=useQueryClient();
  const [scope,setScope]=useState<'global'|'categoria'>('categoria');
  const [categoryId,setCategoryId]=useState('');
  const [name,setName]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [creating,setCreating]=useState(false);
  const [messageByGroup,setMessageByGroup]=useState<Record<string,string>>({});
  const [busyGroup,setBusyGroup]=useState<string|null>(null);

  const groupsQuery=useQuery({queryKey:['whatsapp-groups'],queryFn:async()=>(await api.get('/api/chat/whatsapp-groups')).data.data as Group[],refetchInterval:20_000});
  const candidatesQuery=useQuery({queryKey:['whatsapp-group-candidates'],queryFn:async()=>(await api.get('/api/chat/whatsapp-groups/candidates')).data as Candidates});
  const categories=candidatesQuery.data?.categories||[];
  const selectedCategory=categories.find((item)=>item.id===categoryId);
  const targetCount=scope==='global'?Number(candidatesQuery.data?.global_count||0):Number(selectedCategory?.apoderados_con_whatsapp||0);
  const groups=groupsQuery.data||[];
  const activeCount=useMemo(()=>groups.filter((item)=>item.estado==='activo').length,[groups]);
  const errorCount=useMemo(()=>groups.filter((item)=>item.estado==='error').length,[groups]);

  const createGroup=async()=>{
    if(!name.trim())return notify('Escribe un nombre para el grupo.');
    if(scope==='categoria'&&!categoryId)return notify('Selecciona una categoría.');
    if(!confirmed)return notify('Debes confirmar la visibilidad de teléfonos antes de crear un grupo real de WhatsApp.');
    if(!targetCount)return notify('No hay apoderados con teléfono válido para este alcance.');
    const context=scope==='global'?'toda la academia':categoryLabel(selectedCategory);
    const accepted=await confirmAction(`Se intentará crear el grupo “${name.trim()}” con ${targetCount} apoderado(s) de ${context}. En un grupo real de WhatsApp, los participantes pueden ver los números de otros miembros. ¿Continuar?`);
    if(!accepted)return;
    setCreating(true);
    try{
      await api.post('/api/chat/whatsapp-groups',{scope,categoria_id:scope==='categoria'?categoryId:null,nombre:name.trim(),confirm_phone_visibility:true});
      setName('');setConfirmed(false);
      await Promise.all([queryClient.invalidateQueries({queryKey:['whatsapp-groups']}),queryClient.invalidateQueries({queryKey:['whatsapp-group-candidates']})]);
      await notify('Grupo creado correctamente en WhatsApp.');
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible crear el grupo de WhatsApp.');}
    finally{setCreating(false);}
  };

  const syncGroup=async(group:Group)=>{
    setBusyGroup(group.id);
    try{
      const response=await api.post(`/api/chat/whatsapp-groups/${group.id}/sync`);
      await queryClient.invalidateQueries({queryKey:['whatsapp-groups']});
      await notify(response.data.added?`Se agregaron ${response.data.added} apoderado(s) nuevos.`:'El grupo ya estaba sincronizado con los apoderados actuales.');
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible sincronizar el grupo.');}
    finally{setBusyGroup(null);}
  };

  const sendGroupMessage=async(group:Group)=>{
    const body=String(messageByGroup[group.id]||'').trim();
    if(!body)return;
    setBusyGroup(group.id);
    try{
      await api.post(`/api/chat/whatsapp-groups/${group.id}/messages`,{body});
      setMessageByGroup((current)=>({...current,[group.id]:''}));
      await notify(`Mensaje enviado a ${group.nombre}.`);
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible enviar el mensaje al grupo.');}
    finally{setBusyGroup(null);}
  };

  return <div className="space-y-6 pb-12">
    <section className="grid gap-3 sm:grid-cols-3">
      <DirectorStat label="Grupos activos" value={activeCount} detail="Operativos en WhatsApp" tone="lime"/>
      <DirectorStat label="Apoderados disponibles" value={candidatesQuery.data?.global_count??'—'} detail="Con teléfono válido"/>
      <DirectorStat label="Con incidencia" value={errorCount} detail="Requieren revisión" tone="dark"/>
    </section>

    <section className="grid gap-5 xl:grid-cols-[410px_minmax(0,1fr)]">
      <DirectorPanel className="self-start p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#111711]"><PlusIcon className="h-6 w-6 text-[#b7ff00]"/></div><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nuevo grupo</p><h2 className="text-xl font-black text-[#111711]">Crear en WhatsApp</h2></div></div>
        <div className="mt-5 space-y-4">
          <Field label="Alcance"><select value={scope} onChange={(event)=>{setScope(event.target.value as 'global'|'categoria');setCategoryId('');}} className={DIRECTOR_FIELD}><option value="categoria">Categoría específica</option><option value="global">Todos los apoderados de la academia</option></select></Field>
          {scope==='categoria'?<Field label="Disciplina · rama · categoría"><select value={categoryId} onChange={(event)=>setCategoryId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Seleccionar</option>{categories.map((category)=><option key={category.id} value={category.id}>{categoryLabel(category)} · {category.apoderados_con_whatsapp} apoderado(s)</option>)}</select></Field>:null}
          <Field label="Nombre del grupo"><input value={name} onChange={(event)=>setName(event.target.value)} maxLength={100} placeholder={scope==='global'?'Ej. Apoderados Academia':`Ej. ${selectedCategory?.ramas?.nombre||'Rama'} · ${selectedCategory?.nombre||'Categoría'}`} className={DIRECTOR_FIELD}/></Field>
          {selectedCategory?<div className="rounded-[14px] border border-[#cde995] bg-[#f3fadf] px-4 py-3 text-xs font-black text-[#4f6900]">{categoryLabel(selectedCategory)}</div>:null}
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 p-4"><div className="flex gap-3"><ShieldExclamationIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-700"/><div><p className="text-sm font-black text-amber-800">Privacidad de un grupo real</p><p className="mt-1 text-xs leading-5 text-amber-700">WhatsApp muestra a los integrantes los números de otros participantes. Para comunicaciones privadas usa las conversaciones individuales.</p></div></div><label className="mt-3 flex cursor-pointer items-start gap-3 text-xs font-semibold text-[#566056]"><input type="checkbox" checked={confirmed} onChange={(event)=>setConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#8eb700]"/><span>Confirmo que la academia conoce esta característica y desea crear el grupo con los apoderados seleccionados.</span></label></div>
          <div className="rounded-[15px] border border-[#e1e6df] bg-[#f8faf6] px-4 py-3"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7c867b]">Participantes objetivo</p><p className="mt-1 text-2xl font-black text-[#111711]">{targetCount}</p></div>
          <button disabled={creating||!confirmed||!targetCount} onClick={()=>void createGroup()} className={`${DIRECTOR_BUTTON} w-full`}><UserGroupIcon className="h-5 w-5"/>{creating?'Creando en WhatsApp...':'Crear grupo WhatsApp'}</button>
        </div>
      </DirectorPanel>

      <div className="space-y-4">
        {groupsQuery.isLoading?<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]">Cargando grupos...</DirectorPanel>:groups.length?groups.map((group)=><DirectorPanel key={group.id} className="p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-[#111711]"><UserGroupIcon className="h-6 w-6 text-[#b7ff00]"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-black text-[#111711]">{group.nombre}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${groupStatusClass(group.estado)}`}>{group.estado}</span></div><p className="mt-1 text-xs font-semibold text-[#697468]">{group.scope==='global'?'Toda la academia':categoryLabel(group.categorias)} · {group.participantes_agregados}/{group.participantes_objetivo} participantes</p>{group.last_error?<p className="mt-2 text-xs font-bold text-red-700">{group.last_error}</p>:null}</div></div><button disabled={busyGroup===group.id||group.estado!=='activo'} onClick={()=>void syncGroup(group)} className={DIRECTOR_BUTTON_GHOST}><ArrowPathIcon className="h-4 w-4"/>Sincronizar</button></div>
          {group.estado==='activo'?<div className="mt-5 rounded-[16px] border border-[#e1e6df] bg-[#f8faf6] p-3"><div className="flex gap-2"><textarea value={messageByGroup[group.id]||''} onChange={(event)=>setMessageByGroup((current)=>({...current,[group.id]:event.target.value}))} maxLength={4000} placeholder="Escribe un aviso para este grupo..." className={`${DIRECTOR_TEXTAREA} min-h-12 flex-1`}/><button title="Enviar al grupo" disabled={busyGroup===group.id||!String(messageByGroup[group.id]||'').trim()} onClick={()=>void sendGroupMessage(group)} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#111711] text-[#b7ff00] disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5"/></button></div><p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#697468]"><MegaphoneIcon className="h-4 w-4"/>El mensaje se envía al grupo real desde el número conectado de la academia.</p></div>:null}
        </DirectorPanel>):<DirectorPanel className="p-12 text-center"><UserGroupIcon className="mx-auto h-14 w-14 text-[#aab4aa]"/><p className="mt-4 font-black text-[#111711]">Aún no hay grupos administrados por Lestra</p><p className="mt-1 text-sm text-[#697468]">Crea un grupo global o comienza por una categoría específica.</p></DirectorPanel>}
      </div>
    </section>
  </div>;
};

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;}

export default WhatsAppGroups;
