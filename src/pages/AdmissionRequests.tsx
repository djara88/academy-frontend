import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Lead={
  id:string;estado:string;apoderado_nombre:string;telefono:string;email?:string|null;alumno_nombre:string;fecha_nacimiento?:string|null;mensaje?:string|null;created_at:string;prematricula_id?:string|null;sede_id?:string|null;rama_id?:string|null;categoria_id?:string|null;
  sedes?:{nombre?:string}|null;ramas?:{nombre?:string;disciplina?:string}|null;categorias?:{nombre?:string}|null;prematriculas?:{estado?:string;expires_at?:string;sent_at?:string;signed_at?:string}|null;
};
type Branch={id:string;sede_id:string;nombre:string;disciplina:string;principal?:boolean;activa?:boolean};
type Site={id:string;nombre:string;principal?:boolean;activa?:boolean;ramas:Branch[]};

type Draft={email:string;rut_apoderado:string;rut_alumno:string;fecha_nacimiento:string;sexo:string;sede_id:string;rama_id:string;monto_matricula:string;abono_matricula:string;monto_mensualidad:string};
const emptyDraft:Draft={email:'',rut_apoderado:'',rut_alumno:'',fecha_nacimiento:'',sexo:'',sede_id:'',rama_id:'',monto_matricula:'',abono_matricula:'',monto_mensualidad:''};
const money=(value:string)=>value?`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`:'$0';
const date=(value?:string|null)=>value?new Date(value).toLocaleDateString('es-CL'):'-';
const phoneHref=(value:string)=>{const digits=String(value||'').replace(/\D/g,'');if(!digits)return '';return `https://wa.me/${digits.startsWith('56')?digits:`56${digits}`}`;};
const statusLabel:Record<string,string>={nueva:'Nueva',contactada:'Contactada',en_revision:'En revisión',prematricula:'Pre-matrícula',archivada:'Archivada'};
const statusClass:Record<string,string>={nueva:'border-amber-400/25 bg-amber-500/10 text-amber-200',contactada:'border-sky-400/25 bg-sky-500/10 text-sky-200',en_revision:'border-violet-400/25 bg-violet-500/10 text-violet-200',prematricula:'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',archivada:'border-white/10 bg-white/5 text-slate-400'};

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
      setItems(leadResponse.data?.data||[]);setStructure(structureResponse.data?.data||[]);
    }catch(error:any){await notify(error?.response?.data?.error||'No fue posible cargar las solicitudes.',{title:'Solicitudes'});}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  const visible=useMemo(()=>items.filter((item)=>showArchived?item.estado==='archivada':item.estado!=='archivada'),[items,showArchived]);
  const counts=useMemo(()=>({new:items.filter((i)=>i.estado==='nueva').length,active:items.filter((i)=>['nueva','contactada','en_revision'].includes(i.estado)).length,pre:items.filter((i)=>i.estado==='prematricula').length}),[items]);
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
    setSelected(lead);setResult(null);setDraft({...emptyDraft,email:lead.email||'',fecha_nacimiento:lead.fecha_nacimiento||'',sede_id:preferredSite?.id||'',rama_id:branch?.id||''});
  };
  const closePre=()=>{if(submitting)return;setSelected(null);setDraft(emptyDraft);setResult(null);};
  const submitPre=async()=>{
    if(!selected)return;
    setSubmitting(true);
    try{
      const response=await api.post(`/api/solicitudes-admision/${selected.id}/prematricula`,{
        ...draft,
        monto_matricula:Number(draft.monto_matricula||0),abono_matricula:Number(draft.abono_matricula||0),monto_mensualidad:Number(draft.monto_mensualidad||0),
      });
      setResult({link:response.data?.link||'',email_sent:Boolean(response.data?.email_sent)});await load();
    }catch(error:any){await notify(error?.response?.data?.error||'No fue posible preparar la pre-matrícula.',{title:selected.alumno_nombre});}
    finally{setSubmitting(false);}
  };

  if(loading)return <div className="grid min-h-[50vh] place-items-center text-sm font-bold text-[#70e4df]">Cargando solicitudes...</div>;
  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-[30px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.19),transparent_38%),linear-gradient(135deg,#172530,#101620)] p-6 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Página pública → Lestra</p><h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Solicitudes de inscripción</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#9aa6b5]">Gestiona interesados sin sacarlos de la página de la academia. Contacta a la familia y, cuando esté lista, transforma la solicitud en una pre-matrícula formal sin volver a escribir sus datos básicos.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-3">{[['Nuevas',counts.new],['Por gestionar',counts.active],['Pre-matrículas',counts.pre]].map(([label,value])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><p className="text-xs font-black uppercase tracking-wider text-[#697586]">{label}</p><p className="mt-1 text-3xl font-black text-white">{value}</p></div>)}</section>

    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#151b25] p-4"><div><p className="font-black text-white">Bandeja de admisión</p><p className="mt-1 text-xs text-[#7f8c9c]">Las solicitudes no consumen cupos del plan hasta convertirse y formalizarse como alumnos.</p></div><button onClick={()=>setShowArchived((value)=>!value)} className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-2.5 text-sm font-black text-[#c8d1dc]">{showArchived?'Ver activas':'Ver archivadas'}</button></section>

    <section className="grid gap-4 xl:grid-cols-2">{visible.map((lead)=>{
      const wa=phoneHref(lead.telefono);return <article key={lead.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">{lead.ramas?.disciplina||lead.ramas?.nombre||'Disciplina por definir'}{lead.categorias?.nombre?` · ${lead.categorias.nombre}`:''}</p><h2 className="mt-1 text-xl font-black text-white">{lead.alumno_nombre}</h2><p className="mt-1 text-xs text-[#697586]">Recibida {date(lead.created_at)} · {lead.sedes?.nombre||'Sede por definir'}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${statusClass[lead.estado]||statusClass.archivada}`}>{statusLabel[lead.estado]||lead.estado}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Apoderado</p><p className="mt-1 font-bold text-white">{lead.apoderado_nombre}</p><p className="mt-1 text-xs text-[#9aa6b5]">{lead.telefono}</p><p className="text-xs text-[#9aa6b5]">{lead.email||'Sin correo todavía'}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Alumno</p><p className="mt-1 text-sm font-bold text-white">Nacimiento: {date(lead.fecha_nacimiento)}</p><p className="mt-1 text-xs text-[#9aa6b5]">{lead.mensaje||'Sin mensaje adicional.'}</p></div></div>
        {lead.prematricula_id?<div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"><b>Pre-matrícula creada.</b> Estado: {lead.prematriculas?.estado||'enviada'}{lead.prematriculas?.signed_at?' · firmada por el apoderado':''}.</div>:null}
        <div className="mt-5 flex flex-wrap gap-2">{wa&&lead.estado!=='archivada'?<a href={wa} target="_blank" rel="noreferrer" onClick={()=>{if(lead.estado==='nueva')void changeState(lead,'contactada');}} className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-black text-emerald-200">Contactar por WhatsApp</a>:null}{!lead.prematricula_id&&lead.estado!=='archivada'?<button onClick={()=>openPre(lead)} className="rounded-xl bg-[#289E9D] px-3 py-2.5 text-xs font-black text-white">Preparar pre-matrícula</button>:null}{lead.estado!=='archivada'&&!lead.prematricula_id?<button onClick={()=>void changeState(lead,'en_revision')} className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-xs font-black text-violet-200">En revisión</button>:null}{lead.estado!=='archivada'?<button onClick={()=>void changeState(lead,'archivada')} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-black text-[#8995a4]">Archivar</button>:<button onClick={()=>void changeState(lead,'en_revision')} className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-black text-[#c8d1dc]">Restaurar</button>}</div>
      </article>;})}</section>
    {!visible.length?<div className="rounded-3xl border border-dashed border-white/10 bg-[#151b25] p-10 text-center text-sm text-[#697586]">{showArchived?'No hay solicitudes archivadas.':'Todavía no hay solicitudes. Cuando una familia complete el formulario de la página pública aparecerá aquí.'}</div>:null}

    {selected?<div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)closePre();}}><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/15 bg-[#101620] p-5 text-white shadow-2xl sm:p-7">
      {result?<div className="py-7 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-3xl font-black text-emerald-950">✓</div><h2 className="mt-5 text-2xl font-black">Pre-matrícula preparada</h2><p className="mt-2 text-sm text-slate-300">{result.email_sent?'El enlace fue enviado al correo del apoderado.':'El registro fue creado, pero no pudimos confirmar el envío del correo. Copia el enlace y compártelo por otro canal.'}</p><div className="mx-auto mt-5 flex max-w-xl gap-2"><input readOnly value={result.link} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-xs text-slate-300"/><button onClick={()=>void navigator.clipboard.writeText(result.link)} className="rounded-xl bg-emerald-400 px-4 text-xs font-black text-emerald-950">Copiar</button></div><button onClick={closePre} className="mt-6 rounded-xl border border-white/10 px-5 py-3 font-black">Cerrar</button></div>:<>
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Convertir solicitud</p><h2 className="mt-1 text-2xl font-black">Pre-matrícula de {selected.alumno_nombre}</h2><p className="mt-2 text-sm text-[#8995a4]">Lestra ya reutilizó nombre, teléfono y preferencia deportiva. Completa únicamente los datos formales que faltan.</p></div><button onClick={closePre} className="rounded-lg border border-white/10 px-3 py-2 text-slate-400">✕</button></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="text-xs font-black text-slate-300">Correo apoderado *</span><input type="email" value={draft.email} onChange={(e)=>setDraft({...draft,email:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"/></label><label><span className="text-xs font-black text-slate-300">RUT / documento apoderado *</span><input value={draft.rut_apoderado} onChange={(e)=>setDraft({...draft,rut_apoderado:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"/></label><label><span className="text-xs font-black text-slate-300">RUT alumno</span><input value={draft.rut_alumno} onChange={(e)=>setDraft({...draft,rut_alumno:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm" placeholder="Opcional si aún no lo tienes"/></label><label><span className="text-xs font-black text-slate-300">Fecha nacimiento *</span><input type="date" value={draft.fecha_nacimiento} onChange={(e)=>setDraft({...draft,fecha_nacimiento:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"/></label><label><span className="text-xs font-black text-slate-300">Sexo *</span><select value={draft.sexo} onChange={(e)=>setDraft({...draft,sexo:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"><option value="">Seleccionar</option><option>Masculino</option><option>Femenino</option><option>Otro</option><option>Prefiere no indicar</option></select></label><label><span className="text-xs font-black text-slate-300">Sede *</span><select value={draft.sede_id} onChange={(e)=>{const siteId=e.target.value;const first=activeBranches.find((branch)=>branch.sede_id===siteId);setDraft({...draft,sede_id:siteId,rama_id:first?.id||''});}} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"><option value="">Seleccionar</option>{activeSites.map((site)=><option key={site.id} value={site.id}>{site.nombre}</option>)}</select></label><label><span className="text-xs font-black text-slate-300">Disciplina *</span><select value={draft.rama_id} onChange={(e)=>setDraft({...draft,rama_id:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm"><option value="">Seleccionar</option>{branchOptions.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina||branch.nombre}</option>)}</select></label></div>
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs font-black uppercase tracking-wider text-[#C8A96B]">Valores de la matrícula</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[['monto_matricula','Matrícula'],['abono_matricula','Abono inicial'],['monto_mensualidad','Mensualidad']].map(([key,label])=><label key={key}><span className="text-xs font-bold text-slate-400">{label}</span><input type="number" min="0" value={draft[key as keyof Draft]} onChange={(e)=>setDraft({...draft,[key]:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#151b25] px-3 py-3 text-sm"/></label>)}</div><p className="mt-3 text-xs text-[#697586]">Resumen: matrícula {money(draft.monto_matricula)} · abono {money(draft.abono_matricula)} · mensualidad {money(draft.monto_mensualidad)}.</p></div>
        <div className="mt-5 flex justify-end gap-2"><button onClick={closePre} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-slate-300">Cancelar</button><button disabled={submitting} onClick={()=>void submitPre()} className="rounded-xl bg-[#289E9D] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{submitting?'Preparando...':'Crear y enviar pre-matrícula'}</button></div>
      </>}
    </div></div>:null}
  </div>;
}
