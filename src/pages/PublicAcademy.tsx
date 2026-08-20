import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';
import PublicAdmissionForm from '../components/PublicAdmissionForm';

type Socials={instagram?:string;facebook?:string;tiktok?:string;youtube?:string;website?:string};
type Academy={nombre:string;slug:string;descripcion?:string|null;logo?:string|null;direccion?:string|null;ciudad?:string|null;telefono?:string|null;correo?:string|null;colores?:{primario?:string;secundario?:string;fondo?:string};rrss?:Socials};
type Site={id:string;nombre:string;direccion?:string|null;ciudad?:string|null;comuna?:string|null;ubicacion_entrenamiento?:string|null;dias_entrenamiento?:string|null;horarios_entrenamiento?:string|null};
type Branch={id:string;nombre:string;disciplina:string;sede_id?:string|null};
type Category={id:string;nombre:string;rama_id:string;sede_id?:string|null};
type Photo={id:string;url:string;alt_text?:string|null;orden:number};
type Payload={academia:Academy;fotos:Photo[];sedes:Site[];ramas:Branch[];categorias:Category[]};

const contrastText=(hex:string)=>{
  const clean=String(hex||'').replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean))return '#FFFFFF';
  const r=parseInt(clean.slice(0,2),16),g=parseInt(clean.slice(2,4),16),b=parseInt(clean.slice(4,6),16);
  return (r*299+g*587+b*114)/1000>155?'#101620':'#FFFFFF';
};
const socialLabels:Record<keyof Socials,string>={instagram:'Instagram',facebook:'Facebook',tiktok:'TikTok',youtube:'YouTube',website:'Sitio web'};

export default function PublicAcademy(){
  const {slug=''}=useParams();
  const [data,setData]=useState<Payload|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{api.get(`/api/public/academias/${encodeURIComponent(slug)}`).then((r)=>setData(r.data.data)).catch((e)=>setError(e.response?.data?.error||'No fue posible cargar esta academia.'));},[slug]);
  const phone=String(data?.academia.telefono||'').replace(/\D/g,'');
  const whatsapp=phone?`https://wa.me/${phone.startsWith('56')?phone:`56${phone}`}`:'';
  const grouped=useMemo(()=>!data?[]:data.ramas.map((branch)=>({...branch,categorias:data.categorias.filter((cat)=>cat.rama_id===branch.id)})),[data]);
  if(error)return <div className="grid min-h-screen place-items-center bg-[#0d1117] p-6 text-center text-white"><div><Logo variant="mark" className="mx-auto h-16 w-16"/><h1 className="mt-5 text-2xl font-black">Academia no disponible</h1><p className="mt-2 text-[#8995a4]">{error}</p></div></div>;
  if(!data)return <div className="grid min-h-screen place-items-center bg-[#0d1117] text-[#70e4df]">Cargando academia...</div>;

  const primary=data.academia.colores?.primario||'#289E9D';
  const secondary=data.academia.colores?.secundario||'#70E4DF';
  const background=data.academia.colores?.fondo||'#0D1117';
  const pageText=contrastText(background);
  const primaryText=contrastText(primary);
  const socialEntries=Object.entries(data.academia.rrss||{}).filter(([,url])=>String(url||'').startsWith('https://')) as Array<[keyof Socials,string]>;
  const panelStyle={backgroundColor:pageText==='#FFFFFF'?'rgba(255,255,255,.065)':'rgba(0,0,0,.055)',borderColor:`${primary}55`};

  return <div className="min-h-screen" style={{backgroundColor:background,color:pageText}}>
    <header className="border-b px-5" style={{borderColor:`${primary}45`,backgroundColor:pageText==='#FFFFFF'?'rgba(0,0,0,.12)':'rgba(255,255,255,.34)'}}>
      <div className="mx-auto flex max-w-6xl items-center justify-between py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl" style={{backgroundColor:primary}}><Logo variant="mark" className="h-7 w-7"/></div><div><p className="text-[10px] font-black uppercase tracking-[.18em]" style={{color:secondary}}>Academia en Lestra</p><p className="font-black">{data.academia.nombre}</p></div></div><a href="https://lestra.app" className="text-xs font-black opacity-60 hover:opacity-100">lestra.app</a></div>
    </header>

    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <section className="grid gap-8 rounded-[32px] border p-7 lg:grid-cols-[1fr_.55fr] lg:p-10" style={panelStyle}>
        <div><p className="text-xs font-black uppercase tracking-[.18em]" style={{color:secondary}}>Inscripciones y formación deportiva</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">{data.academia.nombre}</h1><p className="mt-4 max-w-3xl text-base leading-7 opacity-75">{data.academia.descripcion||'Conoce nuestras disciplinas, categorías y horarios. Envíanos una solicitud para consultar disponibilidad e inscripción.'}</p><div className="mt-6 flex flex-wrap gap-3"><PublicAdmissionForm slug={data.academia.slug||slug} academyName={data.academia.nombre} branches={data.ramas} categories={data.categorias} sites={data.sedes} primary={primary} secondary={secondary} primaryText={primaryText}/><a href={`/a/${encodeURIComponent(data.academia.slug||slug)}/pagos`} className="rounded-xl px-5 py-3 text-sm font-black shadow-lg transition hover:-translate-y-0.5" style={{backgroundColor:secondary,color:contrastText(secondary)}}>💳 Consultar y pagar</a>{whatsapp?<a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-xl border px-5 py-3 text-sm font-black transition hover:-translate-y-0.5" style={{borderColor:`${primary}70`,color:secondary}}>Hablar por WhatsApp</a>:null}<span className="rounded-xl border px-4 py-3 text-sm opacity-70" style={{borderColor:`${primary}45`}}>{data.academia.direccion||data.academia.ciudad||'Chile'}</span></div><p className="mt-3 max-w-2xl text-xs leading-5 opacity-55">Las solicitudes de inscripción no generan cobros. El portal de pagos exige verificación del contacto registrado antes de mostrar información financiera.</p>{socialEntries.length?<div className="mt-5 flex flex-wrap gap-2">{socialEntries.map(([key,url])=><a key={key} href={url} target="_blank" rel="noreferrer" className="rounded-full border px-3 py-1.5 text-xs font-black transition hover:-translate-y-0.5" style={{borderColor:`${secondary}70`,color:secondary}}>{socialLabels[key]}</a>)}</div>:null}</div>
        <div className="grid place-items-center"><div className="grid h-44 w-44 place-items-center overflow-hidden rounded-[36px] border p-4 shadow-2xl" style={{borderColor:`${primary}70`,backgroundColor:pageText==='#FFFFFF'?'rgba(0,0,0,.14)':'rgba(255,255,255,.5)'}}>{data.academia.logo?<img src={data.academia.logo} alt={`Logo de ${data.academia.nombre}`} className="h-full w-full object-contain"/>:<Logo variant="mark" className="h-28 w-28"/>}</div></div>
      </section>

      {data.fotos?.length?<section className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider" style={{color:secondary}}>Nuestra academia</p><h2 className="mt-1 text-2xl font-black">Galería</h2></div><span className="text-xs font-bold opacity-50">{data.fotos.length} foto{data.fotos.length===1?'':'s'}</span></div><div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-3">{data.fotos.map((photo)=><div key={photo.id} className="overflow-hidden rounded-2xl border" style={{borderColor:`${primary}45`}}><img src={photo.url} alt={photo.alt_text||data.academia.nombre} className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.03]"/></div>)}</div></section>:null}

      <section className="mt-8 grid gap-5 md:grid-cols-2">{grouped.map((branch)=><article key={branch.id} className="rounded-3xl border p-6" style={panelStyle}><p className="text-[10px] font-black uppercase tracking-wider" style={{color:secondary}}>{branch.disciplina}</p><h2 className="mt-1 text-2xl font-black">{branch.nombre}</h2><div className="mt-4 flex flex-wrap gap-2">{branch.categorias.map((category)=><span key={category.id} className="rounded-full border px-3 py-1.5 text-xs font-bold" style={{borderColor:`${primary}45`,backgroundColor:`${primary}15`}}>{category.nombre}</span>)}{!branch.categorias.length?<span className="text-sm opacity-50">Categorías por confirmar</span>:null}</div></article>)}</section>

      <section className="mt-8"><h2 className="text-2xl font-black">Sedes y entrenamientos</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{data.sedes.map((site)=><article key={site.id} className="rounded-2xl border p-5" style={panelStyle}><h3 className="font-black">{site.nombre}</h3><p className="mt-2 text-sm leading-6 opacity-65">{site.ubicacion_entrenamiento||site.direccion||[site.comuna,site.ciudad].filter(Boolean).join(', ')||'Ubicación por confirmar'}</p>{site.dias_entrenamiento?<p className="mt-2 text-sm opacity-85"><b>Días:</b> {site.dias_entrenamiento}</p>:null}{site.horarios_entrenamiento?<p className="mt-1 text-sm opacity-85"><b>Horarios:</b> {site.horarios_entrenamiento}</p>:null}</article>)}</div></section>
    </main>
    <footer className="border-t px-5 py-8 text-center text-xs opacity-50" style={{borderColor:`${primary}45`}}>Página gestionada con Lestra Deportivo · Gestión de academias deportivas</footer>
  </div>;
}
