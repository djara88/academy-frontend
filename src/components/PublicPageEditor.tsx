import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { supabase } from '../config/supabase';

type Socials = { instagram?: string; facebook?: string; tiktok?: string; youtube?: string; website?: string };
type Photo = { id:string; url:string; storage_path:string; alt_text?:string|null; orden:number };
type PublicConfig = {
  subdominio:string;
  pagina_publica_activa:boolean;
  descripcion_publica?:string|null;
  pagina_color_primario:string;
  pagina_color_secundario:string;
  pagina_color_fondo:string;
  pagina_rrss:Socials;
  fotos:Photo[];
};

const defaults:PublicConfig={
  subdominio:'', pagina_publica_activa:true, descripcion_publica:'',
  pagina_color_primario:'#289E9D', pagina_color_secundario:'#70E4DF', pagina_color_fondo:'#0D1117',
  pagina_rrss:{}, fotos:[],
};
const socialFields:Array<[keyof Socials,string,string]> = [
  ['instagram','Instagram','https://instagram.com/tuacademia'],
  ['facebook','Facebook','https://facebook.com/tuacademia'],
  ['tiktok','TikTok','https://tiktok.com/@tuacademia'],
  ['youtube','YouTube','https://youtube.com/@tuacademia'],
  ['website','Sitio web','https://tuacademia.cl'],
];
const allowedTypes=new Set(['image/jpeg','image/png','image/webp']);
const extensionFor=(type:string)=>type==='image/png'?'png':type==='image/webp'?'webp':'jpg';

export default function PublicPageEditor({academyName}:{academyName:string}){
  const {user}=useAuth();
  const {notify}=useAppDialog();
  const [config,setConfig]=useState<PublicConfig>(defaults);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);

  const load=async()=>{
    setLoading(true);
    try{
      const {data,error}=await supabase.rpc('lestra_public_page_config_get');
      if(error) throw error;
      setConfig({...defaults,...(data||{}),pagina_rrss:{...(data?.pagina_rrss||{})},fotos:Array.isArray(data?.fotos)?data.fotos:[]});
    }catch(error:any){
      await notify(error?.message||'No fue posible cargar la página pública.',{title:academyName});
    }finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  const save=async()=>{
    setSaving(true);
    try{
      const {data,error}=await supabase.rpc('lestra_public_page_config_save',{
        p_slug:config.subdominio,
        p_description:config.descripcion_publica||'',
        p_active:config.pagina_publica_activa,
        p_primary:config.pagina_color_primario,
        p_secondary:config.pagina_color_secundario,
        p_background:config.pagina_color_fondo,
        p_socials:config.pagina_rrss,
      });
      if(error) throw error;
      setConfig({...defaults,...(data||{}),pagina_rrss:{...(data?.pagina_rrss||{})},fotos:Array.isArray(data?.fotos)?data.fotos:[]});
      await notify('Página pública actualizada. Los colores solo afectan esta página.',{title:academyName});
    }catch(error:any){
      await notify(error?.message||'No fue posible guardar la página pública.',{title:academyName});
    }finally{setSaving(false);}
  };

  const uploadPhoto=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0]; event.target.value='';
    if(!file||!user?.academia_id) return;
    if(config.fotos.length>=6) return void notify('La galería permite hasta 6 fotos.',{title:academyName});
    if(!allowedTypes.has(file.type)) return void notify('Usa imágenes JPG, PNG o WEBP.',{title:academyName});
    if(file.size>5*1024*1024) return void notify('Cada foto puede pesar hasta 5 MB.',{title:academyName});
    setUploading(true);
    const path=`${user.academia_id}/${crypto.randomUUID()}.${extensionFor(file.type)}`;
    try{
      const {error:uploadError}=await supabase.storage.from('academia-publica').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
      if(uploadError) throw uploadError;
      const url=supabase.storage.from('academia-publica').getPublicUrl(path).data.publicUrl;
      const {data,error}=await supabase.rpc('lestra_public_page_photo_add',{p_path:path,p_url:url,p_alt:`Foto de ${academyName}`});
      if(error){await supabase.storage.from('academia-publica').remove([path]); throw error;}
      setConfig((current)=>({...current,fotos:[...current.fotos,data as Photo]}));
    }catch(error:any){await notify(error?.message||'No fue posible subir la foto.',{title:academyName});}
    finally{setUploading(false);}
  };

  const removePhoto=async(photo:Photo)=>{
    try{
      const {data:path,error}=await supabase.rpc('lestra_public_page_photo_delete',{p_photo_id:photo.id});
      if(error) throw error;
      setConfig((current)=>({...current,fotos:current.fotos.filter((item)=>item.id!==photo.id)}));
      if(path) await supabase.storage.from('academia-publica').remove([String(path)]);
    }catch(error:any){await notify(error?.message||'No fue posible eliminar la foto.',{title:academyName});}
  };

  if(loading)return <section className="rounded-2xl border border-white/10 bg-[#151b25] p-6 text-sm font-bold text-sky-200">Cargando página pública...</section>;
  const url=config.subdominio?`https://lestra.app/a/${config.subdominio}`:'';
  const colorFields:Array<[keyof PublicConfig,string]>=[['pagina_color_primario','Color principal'],['pagina_color_secundario','Color de acento'],['pagina_color_fondo','Fondo']];

  return <section className="rounded-2xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-black uppercase tracking-wider text-sky-300">Página pública incluida</p><h2 className="mt-1 text-xl font-black text-white">Identidad digital de la academia</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[#8995a4]">Personaliza únicamente la página pública con colores institucionales, redes sociales y una galería. Nada de esto modifica el panel interno de Lestra.</p></div>
      {url?<a href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm font-black text-sky-200">Abrir página ↗</a>:null}
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-[.7fr_1.3fr]">
      <div><label className="text-xs font-black text-[#aab4c1]">Enlace</label><div className="mt-1 flex rounded-xl border border-white/10 bg-[#0d1117]"><span className="px-3 py-3 text-xs text-[#596575]">lestra.app/a/</span><input value={config.subdominio} onChange={(e)=>setConfig({...config,subdominio:e.target.value})} className="min-w-0 flex-1 bg-transparent px-1 text-sm text-white outline-none"/></div></div>
      <div><label className="text-xs font-black text-[#aab4c1]">Descripción pública</label><textarea value={config.descripcion_publica||''} onChange={(e)=>setConfig({...config,descripcion_publica:e.target.value})} className="mt-1 min-h-24 w-full rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm text-white outline-none focus:border-[#289E9D]" placeholder="Cuenta qué ofrece tu academia y qué la hace distinta."/></div>
    </div>

    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-4">
      <p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Colores institucionales</p><p className="mt-1 text-xs text-[#697586]">Se aplican exclusivamente a la página pública.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{colorFields.map(([key,label])=><label key={String(key)} className="rounded-xl border border-white/10 bg-[#151b25] p-3"><span className="text-xs font-bold text-[#aab4c1]">{label}</span><div className="mt-2 flex items-center gap-2"><input type="color" value={String(config[key])} onChange={(e)=>setConfig({...config,[key]:e.target.value.toUpperCase()})} className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent"/><input value={String(config[key])} onChange={(e)=>setConfig({...config,[key]:e.target.value.toUpperCase()})} maxLength={7} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0d1117] px-2 py-2 text-xs font-mono text-white"/></div></label>)}</div>
      <div className="mt-4 rounded-xl border border-white/10 p-4" style={{background:config.pagina_color_fondo}}><div className="h-2 rounded-full" style={{background:config.pagina_color_primario}}/><p className="mt-3 font-black" style={{color:config.pagina_color_secundario}}>Vista rápida de identidad</p><p className="mt-1 text-xs text-white/70">Así convivirán los colores de la academia sin alterar Lestra.</p></div>
    </div>

    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs font-black uppercase tracking-wider text-violet-300">Redes sociales</p><div className="mt-4 grid gap-3 md:grid-cols-2">{socialFields.map(([key,label,placeholder])=><label key={key}><span className="text-xs font-bold text-[#aab4c1]">{label}</span><input value={config.pagina_rrss?.[key]||''} onChange={(e)=>setConfig({...config,pagina_rrss:{...config.pagina_rrss,[key]:e.target.value}})} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-white/10 bg-[#151b25] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400"/></label>)}</div></div>

    <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-amber-300">Galería</p><p className="mt-1 text-xs text-[#697586]">Hasta 6 fotos · JPG, PNG o WEBP · máximo 5 MB cada una.</p></div><label className={`cursor-pointer rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-2.5 text-sm font-black text-amber-200 ${uploading||config.fotos.length>=6?'pointer-events-none opacity-40':''}`}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadPhoto} className="hidden"/>{uploading?'Subiendo...':'Agregar foto'}</label></div><div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-3">{config.fotos.map((photo)=><div key={photo.id} className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#151b25]"><img src={photo.url} alt={photo.alt_text||academyName} className="aspect-[4/3] h-full w-full object-cover"/><button type="button" onClick={()=>void removePhoto(photo)} className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs font-black text-white opacity-90 hover:bg-red-600">Eliminar</button></div>)}{!config.fotos.length?<div className="col-span-full rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-[#596575]">Aún no hay fotos. Una galería real ayuda mucho a transmitir confianza.</div>:null}</div></div>

    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="flex items-center gap-3 text-sm font-bold text-[#c8d1dc]"><input type="checkbox" checked={config.pagina_publica_activa} onChange={(e)=>setConfig({...config,pagina_publica_activa:e.target.checked})} className="h-5 w-5 accent-[#289E9D]"/>Página pública activa</label><button disabled={saving} onClick={()=>void save()} className="min-h-11 rounded-xl px-5 text-sm font-black text-white disabled:opacity-40" style={{background:config.pagina_color_primario}}>{saving?'Guardando...':'Guardar identidad pública'}</button></div>
  </section>;
}
