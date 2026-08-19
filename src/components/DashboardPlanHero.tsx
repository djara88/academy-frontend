import { Link } from 'react-router-dom';
import {
  ArrowRightIcon, BuildingOffice2Icon, ChartBarSquareIcon, TrophyIcon,
} from '@heroicons/react/24/outline';

type Props={
 academyName:string;
 planName:string;
 trial:boolean;
 features:string[];
 guardians:boolean;
 priorities:number;
};

const stages=[
 {rank:1,label:'Formación',action:'Administra',icon:BuildingOffice2Icon},
 {rank:2,label:'Competencia',action:'Compite',icon:TrophyIcon},
 {rank:3,label:'Alto Rendimiento',action:'Optimiza',icon:ChartBarSquareIcon},
];

export default function DashboardPlanHero({academyName,planName,trial,features,guardians,priorities}:Props){
 const hasMatches=features.includes('partidos');
 const hasAnalytics=features.includes('analitica_avanzada');
 const rank=trial||hasAnalytics?3:hasMatches?2:1;
 const agendaLink=hasMatches?'/partidos':'/amistosos';
 return <section className="relative overflow-hidden rounded-[34px] border border-[#289E9D]/30 bg-[radial-gradient(circle_at_84%_12%,rgba(72,216,208,.24),transparent_23%),radial-gradient(circle_at_8%_90%,rgba(139,92,246,.13),transparent_26%),linear-gradient(135deg,#172530_0%,#111722_52%,#0c1119_100%)] p-6 shadow-2xl shadow-black/30 sm:p-8">
  <div className="absolute right-8 top-8 hidden h-36 w-36 rounded-full border border-[#48d8d0]/15 xl:block"/>
  <div className="absolute right-16 top-16 hidden h-20 w-20 rounded-full border border-[#48d8d0]/15 xl:block"/>
  <div className="relative grid gap-8 xl:grid-cols-[1fr_410px] xl:items-end">
   <div>
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#48d8d0]/30 bg-[#289E9D]/15 px-3 py-1 text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Centro de dirección</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-[#b9c3cf]">{trial?'Prueba Full':`Plan ${planName}`}</span>{guardians?<span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">Apoderados PRO</span>:null}</div>
    <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-[-.025em] text-white sm:text-5xl">{academyName}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9aa6b5] sm:text-base">Operación, deporte y decisiones en una sola vista. El centro de control evoluciona junto con el nivel de gestión de tu academia.</p>
    <div className="mt-6 flex flex-wrap gap-3"><Link to="/solicitudes" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white">Revisar solicitudes <ArrowRightIcon className="h-4 w-4"/></Link><Link to={agendaLink} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-black text-[#dbe4ed]">{hasMatches?'Agenda deportiva':'Programar amistoso'} <ArrowRightIcon className="h-4 w-4"/></Link></div>
   </div>
   <div className="rounded-3xl border border-white/10 bg-black/20 p-4 backdrop-blur">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8995a4]">Nivel Lestra</p><p className="mt-1 font-black text-white">{trial?'Experiencia Full':planName}</p></div><div className={`rounded-xl border px-3 py-2 text-xs font-black ${priorities?'border-amber-400/25 bg-amber-500/10 text-amber-200':'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'}`}>{priorities?`${priorities} por revisar`:'Operación al día'}</div></div>
    <div className="mt-4 grid grid-cols-3 gap-2">{stages.map(({rank:stageRank,label,action,icon:Icon})=>{const active=stageRank===rank;const done=stageRank<rank;return <div key={label} className={`rounded-2xl border p-3 ${active?'border-[#48d8d0]/35 bg-[#289E9D]/12':done?'border-emerald-400/15 bg-emerald-500/5':'border-white/8 bg-white/[.025]'}`}><Icon className={`h-5 w-5 ${active?'text-[#70e4df]':done?'text-emerald-300':'text-[#596676]'}`}/><p className={`mt-2 text-[11px] font-black ${active||done?'text-white':'text-[#6d7887]'}`}>{label}</p><p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[#697586]">{action}</p></div>})}</div>
    {rank<3?<Link to="/suscripcion" className="mt-4 flex items-center justify-between rounded-xl border border-violet-400/15 bg-violet-500/8 px-3 py-2.5 text-xs font-black text-violet-200"><span>Siguiente nivel: {rank===1?'Competencia':'Alto Rendimiento'}</span><ArrowRightIcon className="h-4 w-4"/></Link>:null}
   </div>
  </div>
 </section>;
}
