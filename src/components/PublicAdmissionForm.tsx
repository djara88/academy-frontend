import { useMemo, useState } from 'react';
import api from '../api/axiosConfig';

type Branch={id:string;nombre:string;disciplina:string;sede_id?:string|null};
type Category={id:string;nombre:string;rama_id:string;sede_id?:string|null};
type Site={id:string;nombre:string};

type Props={
  slug:string;
  academyName:string;
  branches:Branch[];
  categories:Category[];
  sites:Site[];
  primary:string;
  secondary:string;
  primaryText:string;
};

const emptyForm={apoderado_nombre:'',telefono:'',email:'',alumno_nombre:'',fecha_nacimiento:'',rama_id:'',categoria_id:'',mensaje:'',consentimiento_contacto:false,website:''};

export default function PublicAdmissionForm({slug,academyName,branches,categories,sites,primary,secondary,primaryText}:Props){
  const [open,setOpen]=useState(false);
  const [form,setForm]=useState(emptyForm);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(false);
  const availableCategories=useMemo(()=>form.rama_id?categories.filter((item)=>item.rama_id===form.rama_id):[],[categories,form.rama_id]);
  const selectedBranch=branches.find((item)=>item.id===form.rama_id)||null;
  const selectedSite=sites.find((item)=>item.id===selectedBranch?.sede_id)||null;

  const close=()=>{if(loading)return;setOpen(false);setError('');};
  const submit=async()=>{
    setError('');
    if(!form.apoderado_nombre.trim()||!form.alumno_nombre.trim()||form.telefono.replace(/\D/g,'').length<8){setError('Completa nombre del apoderado, nombre del alumno y un teléfono válido.');return;}
    if(!form.consentimiento_contacto){setError('Debes autorizar que la academia te contacte por esta solicitud.');return;}
    setLoading(true);
    try{
      await api.post(`/api/solicitudes-admision/public/${encodeURIComponent(slug)}`,form);
      setSuccess(true);setForm(emptyForm);
    }catch(err:any){setError(err?.response?.data?.error||'No fue posible enviar la solicitud. Intenta nuevamente.');}
    finally{setLoading(false);}
  };

  return <>
    <button type="button" onClick={()=>{setSuccess(false);setOpen(true);}} className="rounded-xl px-5 py-3 text-sm font-black transition hover:-translate-y-0.5" style={{backgroundColor:primary,color:primaryText}}>Solicitar inscripción</button>
    {open?<div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e)=>{if(e.target===e.currentTarget)close();}}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/15 bg-[#101620] p-5 text-white shadow-2xl sm:p-7">
        {success?<div className="py-8 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-3xl font-black text-emerald-950">✓</div><h2 className="mt-5 text-2xl font-black">Solicitud recibida</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">{academyName} recibió tus datos. La academia podrá contactarte para continuar con el proceso de inscripción.</p><button onClick={close} className="mt-6 rounded-xl px-5 py-3 font-black" style={{backgroundColor:primary,color:primaryText}}>Volver a la academia</button></div>:<>
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.16em]" style={{color:secondary}}>Solicitud de inscripción</p><h2 className="mt-1 text-2xl font-black">Quiero ser parte de {academyName}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Déjanos los datos mínimos para que la academia pueda contactarte. La matrícula formal se realiza después.</p></div><button type="button" onClick={close} className="rounded-lg border border-white/10 px-3 py-2 text-slate-400 hover:text-white">✕</button></div>
          {error?<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</div>:null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className="text-xs font-black text-slate-300">Nombre del apoderado *</span><input value={form.apoderado_nombre} onChange={(e)=>setForm({...form,apoderado_nombre:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400" placeholder="Nombre y apellido"/></label>
            <label><span className="text-xs font-black text-slate-300">Teléfono / WhatsApp *</span><input value={form.telefono} onChange={(e)=>setForm({...form,telefono:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400" placeholder="+56 9 ..." inputMode="tel"/></label>
            <label><span className="text-xs font-black text-slate-300">Correo</span><input value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400" placeholder="Opcional, pero recomendado" type="email"/></label>
            <label><span className="text-xs font-black text-slate-300">Nombre del alumno *</span><input value={form.alumno_nombre} onChange={(e)=>setForm({...form,alumno_nombre:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400"/></label>
            <label><span className="text-xs font-black text-slate-300">Fecha de nacimiento</span><input value={form.fecha_nacimiento} onChange={(e)=>setForm({...form,fecha_nacimiento:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400" type="date"/></label>
            <label><span className="text-xs font-black text-slate-300">Disciplina de interés</span><select value={form.rama_id} onChange={(e)=>setForm({...form,rama_id:e.target.value,categoria_id:''})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none focus:border-sky-400"><option value="">Por definir</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.disciplina||branch.nombre}</option>)}</select></label>
            <label><span className="text-xs font-black text-slate-300">Categoría</span><select value={form.categoria_id} disabled={!form.rama_id} onChange={(e)=>setForm({...form,categoria_id:e.target.value})} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-sm outline-none disabled:opacity-40"><option value="">Por definir</option>{availableCategories.map((category)=><option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-3"><p className="text-xs font-black text-slate-400">Sede</p><p className="mt-1 text-sm font-bold">{selectedSite?.nombre||'Se definirá con la academia'}</p></div>
          </div>
          <label className="mt-4 block"><span className="text-xs font-black text-slate-300">Mensaje opcional</span><textarea value={form.mensaje} onChange={(e)=>setForm({...form,mensaje:e.target.value})} maxLength={1200} className="mt-1 min-h-24 w-full rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm outline-none focus:border-sky-400" placeholder="Cuéntanos si tienes alguna consulta o disponibilidad particular."/></label>
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e)=>setForm({...form,website:e.target.value})} className="hidden"/>
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.03] p-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={form.consentimiento_contacto} onChange={(e)=>setForm({...form,consentimiento_contacto:e.target.checked})} className="mt-0.5 h-4 w-4"/><span>Autorizo que {academyName} utilice estos datos únicamente para contactarme respecto de esta solicitud de inscripción.</span></label>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={close} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-slate-300">Cancelar</button><button type="button" disabled={loading} onClick={()=>void submit()} className="rounded-xl px-5 py-3 text-sm font-black disabled:opacity-50" style={{backgroundColor:primary,color:primaryText}}>{loading?'Enviando...':'Enviar solicitud'}</button></div>
        </>}
      </div>
    </div>:null}
  </>;
}
