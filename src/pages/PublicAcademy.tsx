import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';

type Academy={nombre:string;slug:string;descripcion?:string|null;logo?:string|null;direccion?:string|null;ciudad?:string|null;telefono?:string|null;correo?:string|null};
type Site={id:string;nombre:string;direccion?:string|null;ciudad?:string|null;comuna?:string|null;ubicacion_entrenamiento?:string|null;dias_entrenamiento?:string|null;horarios_entrenamiento?:string|null};
type Branch={id:string;nombre:string;disciplina:string;sede_id?:string|null};
type Category={id:string;nombre:string;rama_id:string;sede_id?:string|null};
type Payload={academia:Academy;sedes:Site[];ramas:Branch[];categorias:Category[]};

export default function PublicAcademy(){
 const {slug=''}=useParams();
 const [data,setData]=useState<Payload|null>(null);const[error,setError]=useState('');
 useEffect(()=>{api.get(`/api/public/academias/${encodeURIComponent(slug)}`).then((r)=>setData(r.data.data)).catch((e)=>setError(e.response?.data?.error||'No fue posible cargar esta academia.'));},[slug]);
 const phone=String(data?.academia.telefono||'').replace(/\D/g,'');
 const whatsapp=phone?`https://wa.me/${phone.startsWith('56')?phone:`56${phone}`}`:'';
 const grouped=useMemo(()=>!data?[]:data.ramas.map((branch)=>({...branch,categorias:data.categorias.filter((cat)=>cat.rama_id===branch.id)})),[data]);
 if(error)return <div className="grid min-h-screen place-items-center bg-[#0d1117] p-6 text-center text-white"><div><Logo variant="mark" className="mx-auto h-16 w-16"/><h1 className="mt-5 text-2xl font-black">Academia no disponible</h1><p className="mt-2 text-[#8995a4]">{error}</p></div></div>;
 if(!data)return <div className="grid min-h-screen place-items-center bg-[#0d1117] text-[#70e4df]">Cargando academia...</div>;
 return <div className="min-h-screen bg-[#0d1117] text-white">
  <header className="border-b border-white/10 bg-[#111720]"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><Logo variant="mark" className="h-9 w-9"/><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#70e4df]">Academia en Lestra</p><p className="font-black">{data.academia.nombre}</p></div></div><a href="https://lestra.app" className="text-xs font-black text-[#8995a4] hover:text-white">lestra.app</a></div></header>
  <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
   <section className="grid gap-8 rounded-[32px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.18),transparent_38%),#151b25] p-7 lg:grid-cols-[1fr_.55fr] lg:p-10"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Inscripciones y formación deportiva</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">{data.academia.nombre}</h1><p className="mt-4 max-w-3xl text-base leading-7 text-[#a8b3c0]">{data.academia.descripcion||'Conoce nuestras disciplinas, categorías y horarios. Contáctanos para consultar disponibilidad e inscripción.'}</p><div className="mt-6 flex flex-wrap gap-3">{whatsapp?<a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-xl bg-[#289E9D] px-5 py-3 text-sm font-black">Quiero inscribirme</a>:data.academia.correo?<a href={`mailto:${data.academia.correo}`} className="rounded-xl bg-[#289E9D] px-5 py-3 text-sm font-black">Quiero inscribirme</a>:null}<span className="rounded-xl border border-white/10 px-4 py-3 text-sm text-[#8995a4]">{data.academia.direccion||data.academia.ciudad||'Chile'}</span></div></div><div className="grid place-items-center"><div className="grid h-44 w-44 place-items-center overflow-hidden rounded-[36px] border border-[#289E9D]/35 bg-[#0d1117] p-4 shadow-2xl">{data.academia.logo?<img src={data.academia.logo} alt={`Logo de ${data.academia.nombre}`} className="h-full w-full object-contain"/>:<Logo variant="mark" className="h-28 w-28"/>}</div></div></section>

   <section className="mt-8 grid gap-5 md:grid-cols-2">{grouped.map((branch)=><article key={branch.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><p className="text-[10px] font-black uppercase tracking-wider text-[#70e4df]">{branch.disciplina}</p><h2 className="mt-1 text-2xl font-black">{branch.nombre}</h2><div className="mt-4 flex flex-wrap gap-2">{branch.categorias.map((category)=><span key={category.id} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#c8d1dc]">{category.nombre}</span>)}{!branch.categorias.length?<span className="text-sm text-[#697586]">Categorías por confirmar</span>:null}</div></article>)}</section>

   <section className="mt-8"><h2 className="text-2xl font-black">Sedes y entrenamientos</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.sedes.map((site)=><article key={site.id} className="rounded-2xl border border-white/10 bg-[#151b25] p-5"><h3 className="font-black">{site.nombre}</h3><p className="mt-2 text-sm leading-6 text-[#8995a4]">{site.ubicacion_entrenamiento||site.direccion||[site.comuna,site.ciudad].filter(Boolean).join(', ')||'Ubicación por confirmar'}</p>{site.dias_entrenamiento?<p className="mt-2 text-sm text-[#c8d1dc]"><b>Días:</b> {site.dias_entrenamiento}</p>:null}{site.horarios_entrenamiento?<p className="mt-1 text-sm text-[#c8d1dc]"><b>Horarios:</b> {site.horarios_entrenamiento}</p>:null}</article>)}</div></section>
  </main>
  <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-[#596575]">Página gestionada con Lestra · Gestión de academias deportivas</footer>
 </div>;
}
