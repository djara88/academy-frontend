import { useEffect, useMemo, useState } from 'react';
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

type Lead={
  id:string;estado:string;apoderado_nombre:string;telefono:string;email?:string|null;alumno_nombre:string;fecha_nacimiento?:string|null;mensaje?:string|null;created_at:string;prematricula_id?:string|null;sede_id?:string|null;rama_id?:string|null;categoria_id?:string|null;
  sedes?:{nombre?:string}|null;ramas?:{nombre?:string;disciplina?:string}|null;categorias?:{nombre?:string}|null;prematriculas?:{estado?:string;expires_at?:string;sent_at?:string;signed_at?:string}|null;
};
type Branch={id:string;sede_id:string;nombre:string;disciplina:string;principal?:boolean;activa?:boolean};
type Site={id:string;nombre:string;principal?:boolean;activa?:boolean;ramas:Branch[]};
type Draft={email:string;rut_apoderado:string;rut_alumno:string;fecha_nacimiento:string;sexo:string;sede_id:string;rama_id:string;monto_matricula:string;abono_matricula:string;monto_mensualidad:string};

const emptyDraft:Draft={email:'',rut_apoderado:'',rut_alumno:'',fecha_nacimiento:'',sexo:'',sede_id:'',rama_id:'',monto_matricula:'',abono_matricula:'',monto_mensualidad:''};
const money=(value:string|number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('es-CL'):'—';
const phoneHref=(value:string)=>{const digits=String(value||'').replace(/\D/g,'');if(!digits)return '';return `https://wa.me/${digits.startsWith('56')?digits:`56${digits}`}`;};
const statusLabel:Record<string,string>={nueva:'Nueva',contactada:'Contactada',en_revision:'En revisión',prematricula:'Pre-matrícula',archivada:'Archivada'};
const statusClass:Record<string,string>={nueva:'border-amber-200 bg-amber-50 text-amber-700',contactada:'border-sky-200 bg-sky-50 text-sky-700',en_revision:'border-violet-200 bg-violet-50 text-violet-700',prematricula:'border-[#cde995] bg-[#f3fadf] text-[#4f6900]',archivada:'border-[#dfe5dc] bg-[#f4f6f2] text-[#697468]'};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

export default function AdmissionRequests(){
  const {notify}=useAppDialog();
  const [items,setItems]=useState<Lead[]>([]);
  const [structure,setStructure]=useState<Site[]>([]);
  const [loading,setLoading]=useState(true);
  const [showArchived,setShowArchived]=useState(false);
  const [selected,setSelected]=useState<Lead|null>(null);
  const [draft,setDraft]=useState<Draft>(emptyDraft);
  const [submitting,setSubmitting]=useState(false);
  const [result,setResult]=useState<{link:string;email_sent:boolean}|null>(null);

  const load=async()=>{
    setLoading(true);
    try{
      const [leadResponse,structureResponse]=await Promise.all([api.get('/api/solicitudes-admision'),api.get('/api/estructura')]);
      setItems(leadResponse.data?.data||[]);
      setStructure(structureResponse.data?.data||[]);
    }catch(error:any){
      await notify(error?.response?.data?.error||'No fue posible cargar las solicitudes.',{title:'Solicitudes'});
    }finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  const visible=useMemo(()=>items.filter((item)=>showArchived?item.estado==='archivada':item.estado!=='archivada'),[items,showArchived]);
  const counts=useMemo(()=>({new:items.filter((item)=>item.estado==='nueva').length,active:items.filter((item)=>['nueva','contactada','en_revision'].includes(item.estado)).length,pre:items.filter((item)=>item.estado==='prematricula').length}),[items]);
  const activeSites=useMemo(()=>structure.filter((site)=>site.activa!==false),[structure]);
  const activeBranches=useMemo(()=>activeSites.flatMap((site)=>site.ramas.filter((branch)=>branch.activa!==false)),[activeSites]);
  const branchOptions=draft.sede_id?activeBranches.filter((branch)=>branch.sede_id===draft.sede_id):activeBranches;

  const changeState=async(lead:Lead,estado:string)=>{
    try{await api.patch(`/api/solicitudes-admision/${lead.id}`,{estado});await load();}
    catch(error:any){await notify(error?.response?.data?.error||'No fue posible actualizar la solicitud.',{title:'Solicitudes'});}
  };

  const openPre=(lead:Lead)=>{
    const preferredBranch=activeBranches.find((branch)=>branch.id===lead.rama_id)||activeBranches[0]||null;
    const preferredSite=activeSites.find((site)=>site.id===(lead.sede_id||preferredBranch?.sede_id))||activeSites[0]||null;
    const branch=preferredBranch?.sede_id===preferredSite?.id?preferredBranch:preferredSite?.ramas.find((item)=>item.activa!==false)||null;
    setSelected(lead);
    setResult(null);
    setDraft({...emptyDraft,email:lead.email||'',fecha_nacimiento:lead.fecha_nacimiento||'',sede_id:preferredSite?.id||'',rama_id:branch?.id||''});
  };
  const closePre=()=>{if(submitting)return;setSelected(null);setDraft(emptyDraft);setResult(null);};
  const submitPre=async()=>{
    if(!selected)return;
    if(!draft.email.trim()||!draft.rut_apoderado.trim()||!draft.sede_id||!draft.rama_id){
      await notify('Completa correo, RUT del apoderado, sede y rama antes de preparar la pre-matrícula.',{title:selected.alumno_nombre});
      return;
    }
    setSubmitting(true);
    try{
      const response=await api.post(`/api/solicitudes-admision/${selected.id}/prematricula`,{
        ...draft,
        monto_matricula:Number(draft.monto_matricula||0),
        abono_matricula:Number(draft.abono_matricula||0),
        monto_mensualidad:Number(draft.monto_mensualidad||0),
      });
      setResult({link:response.data?.link||'',email_sent:Boolean(response.data?.email_sent)});
      await load();
    }catch(error:any){
      await notify(error?.response?.data?.error||'No fue posible preparar la pre-matrícula.',{title:selected.alumno_nombre});
    }finally{setSubmitting(false);}
  };

  if(loading)return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]">Cargando solicitudes...</DirectorPanel>;

  return <DirectorPage className="max-w-[1450px]">
    <DirectorHero eyebrow="Página pública → admisión" title="Solicitudes de inscripción" description="Recibe interesados desde la página de la academia, contacta a la familia y conviértelos en una pre-matrícula formal sin volver a escribir sus datos básicos." aside={<div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Por gestionar</p><p className="mt-2 text-2xl font-black text-white">{counts.active}</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Interesados activos</p></div><div className="rounded-[18px] border border-[#b7ff00]/25 bg-[#b7ff00]/10 p-4"><p className="text-[10px] font-black uppercase text-[#b7ff00]">Convertidas</p><p className="mt-2 text-2xl font-black text-white">{counts.pre}</p><p className="mt-1 text-[11px] text-[#c7d0c8]">Pre-matrículas</p></div></div>}/>

    <section className="grid gap-3 sm:grid-cols-3"><DirectorStat label="Nuevas" value={counts.new} detail="Sin primera gestión"/><DirectorStat label="Por gestionar" value={counts.active} detail="Nuevas, contactadas o en revisión" tone="lime"/><DirectorStat label="Pre-matrículas" value={counts.pre} detail="Ya convertidas" tone="dark"/></section>

    <DirectorPanel className="p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Bandeja de admisión</p><p className="mt-1 text-sm text-[#697468]">Las solicitudes no consumen cupos del plan hasta formalizarse como alumnos.</p></div><button type="button" onClick={()=>setShowArchived((value)=>!value)} className={DIRECTOR_BUTTON_GHOST}>{showArchived?'Ver activas':'Ver archivadas'}</button></div></DirectorPanel>

    <section className="grid gap-4 xl:grid-cols-2">{visible.map((lead)=>{
      const wa=phoneHref(lead.telefono);
      return <DirectorPanel key={lead.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.12em] text-[#789600]">{lead.ramas?.disciplina||lead.ramas?.nombre||'Disciplina por definir'}{lead.categorias?.nombre?` · ${lead.categorias.nombre}`:''}</p><h2 className="mt-1 text-xl font-black text-[#111711]">{lead.alumno_nombre}</h2><p className="mt-1 text-xs font-semibold text-[#697468]">Recibida {date(lead.created_at)} · {lead.sedes?.nombre||'Sede por definir'}</p></div><span className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${statusClass[lead.estado]||statusClass.archivada}`}>{statusLabel[lead.estado]||lead.estado}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-[15px] border border-[#e1e6df] bg-[#f8faf6] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7c867b]">Apoderado</p><p className="mt-1 font-black text-[#111711]">{lead.apoderado_nombre}</p><p className="mt-1 text-xs font-semibold text-[#697468]">{lead.telefono}</p><p className="text-xs font-semibold text-[#697468]">{lead.email||'Sin correo todavía'}</p></div><div className="rounded-[15px] border border-[#e1e6df] bg-[#f8faf6] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7c867b]">Alumno</p><p className="mt-1 text-sm font-black text-[#111711]">Nacimiento: {date(lead.fecha_nacimiento)}</p><p className="mt-1 text-xs leading-5 text-[#697468]">{lead.mensaje||'Sin mensaje adicional.'}</p></div></div>
        {lead.prematricula_id?<div className="mt-4 rounded-[14px] border border-[#cde995] bg-[#f3fadf] p-3 text-sm text-[#4f6900]"><strong>Pre-matrícula creada.</strong> Estado: {lead.prematriculas?.estado||'enviada'}{lead.prematriculas?.signed_at?' · firmada por el apoderado':''}.</div>:null}
        <div className="mt-5 flex flex-wrap gap-2">{wa&&lead.estado!=='archivada'?<a href={wa} target="_blank" rel="noreferrer" onClick={()=>{if(lead.estado==='nueva')void changeState(lead,'contactada');}} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cde995] bg-[#f3fadf] px-4 text-sm font-black text-[#4f6900]">Contactar por WhatsApp</a>:null}{!lead.prematricula_id&&lead.estado!=='archivada'?<button type="button" onClick={()=>openPre(lead)} className={DIRECTOR_BUTTON_DARK}>Preparar pre-matrícula</button>:null}{lead.estado!=='archivada'&&!lead.prematricula_id?<button type="button" onClick={()=>void changeState(lead,'en_revision')} className={DIRECTOR_BUTTON_GHOST}>En revisión</button>:null}{lead.estado!=='archivada'?<button type="button" onClick={()=>void changeState(lead,'archivada')} className="inline-flex min-h-11 items-center rounded-xl border border-[#dfe5dc] bg-white px-4 text-sm font-black text-[#697468]">Archivar</button>:<button type="button" onClick={()=>void changeState(lead,'en_revision')} className={DIRECTOR_BUTTON}>Restaurar</button>}</div>
      </DirectorPanel>;
    })}</section>

    {!visible.length?<DirectorPanel className="p-12 text-center text-sm text-[#697468]">{showArchived?'No hay solicitudes archivadas.':'Todavía no hay solicitudes. Cuando una familia complete el formulario de la página pública aparecerá aquí.'}</DirectorPanel>:null}

    {selected?<div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-[#0b100c]/70 p-4 backdrop-blur-sm" onMouseDown={(event)=>{if(event.target===event.currentTarget)closePre();}}><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_32px_90px_rgba(13,20,14,.28)] sm:p-7">
      {result?<div className="py-6 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#b7ff00] text-3xl font-black text-[#111711]">✓</div><h2 className="mt-5 text-2xl font-black text-[#111711]">Pre-matrícula preparada</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#697468]">{result.email_sent?'El enlace fue enviado al correo del apoderado.':'El registro fue creado, pero no pudimos confirmar el envío del correo. Copia el enlace y compártelo por otro canal.'}</p><div className="mx-auto mt-5 flex max-w-xl flex-col gap-2 sm:flex-row"><input readOnly value={result.link} className={`${DIRECTOR_FIELD} min-w-0 flex-1 bg-[#f8faf6] text-xs`}/><button type="button" onClick={()=>void navigator.clipboard.writeText(result.link)} className={DIRECTOR_BUTTON_DARK}>Copiar</button></div><button type="button" onClick={closePre} className={`${DIRECTOR_BUTTON_GHOST} mt-6`}>Cerrar</button></div>:<>
        <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Convertir solicitud</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Pre-matrícula de {selected.alumno_nombre}</h2><p className="mt-2 text-sm leading-6 text-[#697468]">Lestra reutilizó nombre, teléfono y preferencia deportiva. Completa los datos formales que faltan.</p></div><button type="button" onClick={closePre} className="grid h-10 w-10 place-items-center rounded-xl border border-[#dfe5dc] text-[#697468]">✕</button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Correo apoderado *"><input type="email" value={draft.email} onChange={(event)=>setDraft({...draft,email:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="RUT / documento apoderado *"><input value={draft.rut_apoderado} onChange={(event)=>setDraft({...draft,rut_apoderado:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="RUT / documento alumno"><input value={draft.rut_alumno} onChange={(event)=>setDraft({...draft,rut_alumno:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Fecha de nacimiento"><input type="date" value={draft.fecha_nacimiento} onChange={(event)=>setDraft({...draft,fecha_nacimiento:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Sexo"><select value={draft.sexo} onChange={(event)=>setDraft({...draft,sexo:event.target.value})} className={DIRECTOR_FIELD}><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro</option><option>Prefiere no indicar</option></select></Field><Field label="Sede *"><select value={draft.sede_id} onChange={(event)=>{const site=activeSites.find((item)=>item.id===event.target.value);const branch=site?.ramas.find((item)=>item.principal&&item.activa!==false)||site?.ramas.find((item)=>item.activa!==false);setDraft({...draft,sede_id:event.target.value,rama_id:branch?.id||''});}} className={DIRECTOR_FIELD}><option value="">Seleccionar sede</option>{activeSites.map((site)=><option key={site.id} value={site.id}>{site.nombre}</option>)}</select></Field><Field label="Rama deportiva *"><select value={draft.rama_id} onChange={(event)=>setDraft({...draft,rama_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Seleccionar rama</option>{branchOptions.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></Field></div>
        <div className="mt-6 rounded-[18px] border border-[#dfe5dc] bg-[#f8faf6] p-4"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Valores iniciales</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><Field label="Matrícula"><input type="number" min="0" value={draft.monto_matricula} onChange={(event)=>setDraft({...draft,monto_matricula:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Abono"><input type="number" min="0" value={draft.abono_matricula} onChange={(event)=>setDraft({...draft,abono_matricula:event.target.value})} className={DIRECTOR_FIELD}/></Field><Field label="Mensualidad"><input type="number" min="0" value={draft.monto_mensualidad} onChange={(event)=>setDraft({...draft,monto_mensualidad:event.target.value})} className={DIRECTOR_FIELD}/></Field></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-black text-[#566056]"><span className="rounded-full border border-[#dfe5dc] bg-white px-3 py-1.5">Matrícula {money(draft.monto_matricula)}</span><span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-1.5 text-[#4f6900]">Abono {money(draft.abono_matricula)}</span><span className="rounded-full border border-[#dfe5dc] bg-white px-3 py-1.5">Mensualidad {money(draft.monto_mensualidad)}</span></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" disabled={submitting} onClick={closePre} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button type="button" disabled={submitting} onClick={()=>void submitPre()} className={DIRECTOR_BUTTON_DARK}>{submitting?'Preparando…':'Crear y enviar pre-matrícula'}</button></div>
      </>}
    </div></div>:null}
  </DirectorPage>;
}

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;}
