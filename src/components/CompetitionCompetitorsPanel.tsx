import { useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Division={id:string;nombre:string;modalidad?:string|null;categoria_id?:string|null};
type Category={id:string;nombre:string;rama_id?:string|null};
type Student={id:string;nombre:string};
type Competitor={id:string;division_id:string;tipo:'equipo'|'deportista'|'pareja';origen:'academia'|'externo';nombre:string;jugador_id?:string|null;categoria_id?:string|null;seed?:number|null;estado:string};
type Pairing={slot:number;a?:CompetitorView|null;b?:CompetitorView|null;bye?:boolean;empty?:boolean};
type CompetitorView={id:string;nombre:string;tipo:string;origen:string;seed?:number|null};
type Round={round:number;label:string;matches:Pairing[]};
type Group={code:string;label:string;competitors:CompetitorView[];rounds:Round[]};
type Preview={
  format:string;
  mode:string;
  competitorCount:number;
  competitors:CompetitorView[];
  phases:{id:string;nombre:string;tipo:string;orden:number}[];
  persistsMatches:boolean;
  rounds?:Round[];
  bracket?:{size:number;matches:Pairing[]};
  groups?:Group[];
  entries?:CompetitorView[];
  qualification?:{advancePerGroup:number};
  secondaryStage?:string;
  note?:string;
};

type Props={
  tournamentId:string;
  discipline:string;
  divisions:Division[];
  categories:Category[];
};

const field='w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#70e4df]';
const teamSports=new Set(['fútbol','futbol','futsal','básquetbol','basquetbol','vóleibol','voleibol','hockey','rugby']);
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

const pairingLabel=(pair:Pairing)=>{
  if(pair.empty)return 'Espacio libre';
  if(pair.bye)return `${pair.a?.nombre||pair.b?.nombre||'Competidor'} · BYE`;
  return `${pair.a?.nombre||'Por definir'} vs ${pair.b?.nombre||'Por definir'}`;
};

export default function CompetitionCompetitorsPanel({tournamentId,discipline,divisions,categories}:Props){
  const {notify,confirmAction}=useAppDialog();
  const [divisionId,setDivisionId]=useState('');
  const [competitors,setCompetitors]=useState<Competitor[]>([]);
  const [eligible,setEligible]=useState<Student[]>([]);
  const [preview,setPreview]=useState<Preview|null>(null);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const normalizedDiscipline=normalize(discipline||'');
  const suggestedType:'equipo'|'deportista'|'pareja'=teamSports.has(normalizedDiscipline)?'equipo':normalizedDiscipline==='padel'?'pareja':'deportista';
  const [form,setForm]=useState({origen:'externo' as 'academia'|'externo',tipo:suggestedType,nombre:'',jugador_id:'',categoria_id:'',seed:''});
  const selectedDivision=divisions.find((item)=>item.id===divisionId)||null;
  const divisionCategory=categories.find((item)=>item.id===selectedDivision?.categoria_id)||null;

  useEffect(()=>{
    if(!divisionId&&divisions.length)setDivisionId(divisions[0].id);
    if(divisionId&&!divisions.some((item)=>item.id===divisionId)){setDivisionId(divisions[0]?.id||'');setPreview(null);}
  },[divisions,divisionId]);

  useEffect(()=>{
    setForm((current)=>({...current,tipo:suggestedType}));
  },[suggestedType]);

  const loadCompetitors=async(targetDivision=divisionId)=>{
    if(!targetDivision){setCompetitors([]);return;}
    setLoading(true);
    try{const response=await api.get(`/api/torneos/${tournamentId}/competidores`,{params:{division_id:targetDivision}});setCompetitors(response.data.data||[]);}catch(error:any){await notify(error.response?.data?.error||'No fue posible cargar los competidores.');}finally{setLoading(false);}
  };

  useEffect(()=>{setPreview(null);void loadCompetitors(divisionId);},[divisionId]);

  useEffect(()=>{
    const loadEligible=async()=>{
      if(form.origen!=='academia'||form.tipo!=='deportista'||!selectedDivision?.categoria_id){setEligible([]);return;}
      try{const response=await api.get(`/api/torneos/${tournamentId}/elegibles`,{params:{categoria_id:selectedDivision.categoria_id}});setEligible((response.data.data||[]).map((item:Student)=>({id:item.id,nombre:item.nombre})));}catch(error){console.error(error);setEligible([]);}
    };
    void loadEligible();
  },[form.origen,form.tipo,selectedDivision?.categoria_id,tournamentId]);

  const currentCount=competitors.length;
  const seeded=useMemo(()=>[...competitors].sort((a,b)=>(a.seed??99999)-(b.seed??99999)||a.nombre.localeCompare(b.nombre,'es')),[competitors]);

  const addCompetitor=async()=>{
    if(!divisionId)return void notify('Selecciona una división.');
    if(form.origen==='academia'&&form.tipo==='deportista'&&!form.jugador_id)return void notify('Selecciona el deportista de la academia.');
    if(form.origen==='externo'&&!form.nombre.trim())return void notify('Ingresa el nombre del competidor externo.');
    if(form.origen==='academia'&&form.tipo==='pareja'&&!form.nombre.trim())return void notify('Ingresa el nombre de la pareja.');
    setSaving(true);
    try{
      await api.post(`/api/torneos/${tournamentId}/competidores`,{
        division_id:divisionId,
        origen:form.origen,
        tipo:form.tipo,
        nombre:form.nombre.trim()||undefined,
        jugador_id:form.jugador_id||undefined,
        categoria_id:form.categoria_id||selectedDivision?.categoria_id||undefined,
        seed:form.seed?Number(form.seed):undefined,
      });
      setForm((current)=>({...current,nombre:'',jugador_id:'',seed:''}));
      setPreview(null);
      await loadCompetitors();
    }catch(error:any){await notify(error.response?.data?.error||'No fue posible agregar el competidor.');}finally{setSaving(false);}
  };

  const removeCompetitor=async(competitor:Competitor)=>{
    const accepted=await confirmAction(`Eliminar a “${competitor.nombre}” de esta división?`,{confirmLabel:'Eliminar'});if(!accepted)return;
    try{await api.delete(`/api/torneos/${tournamentId}/competidores/${competitor.id}`);setPreview(null);await loadCompetitors();}catch(error:any){await notify(error.response?.data?.error||'No fue posible eliminar el competidor.');}
  };

  const generatePreview=async()=>{
    if(!divisionId)return void notify('Selecciona una división.');
    if(currentCount<1)return void notify('Agrega competidores antes de generar la vista previa.');
    setLoading(true);
    try{const response=await api.get(`/api/torneos/${tournamentId}/preview`,{params:{division_id:divisionId}});setPreview(response.data.data.preview||null);}catch(error:any){await notify(error.response?.data?.error||'No fue posible generar la vista previa.');}finally{setLoading(false);}
  };

  const renderRounds=(rounds:Round[]|undefined)=>rounds?.length?<div className="grid gap-3 xl:grid-cols-2">{rounds.map((round)=><article key={round.round} className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><p className="text-xs font-black uppercase text-[#70e4df]">{round.label}</p><div className="mt-2 space-y-1.5">{round.matches.map((match)=><div key={`${round.round}-${match.slot}`} className="rounded-lg bg-[#151b25] px-3 py-2 text-xs font-bold text-[#c3ccd6]">{pairingLabel(match)}</div>)}</div></article>)}</div>:<p className="text-xs text-[#697586]">No hay cruces suficientes todavía.</p>;

  return <section className="rounded-[24px] border border-[#289E9D]/20 bg-[#151b25] p-5 sm:p-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Competidores y simulación</p><h2 className="mt-1 text-2xl font-black text-white">Construir sin publicar</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Carga quién participa y revisa cómo quedaría la estructura. La vista previa no crea encuentros, no envía citaciones y no altera resultados.</p></div><span className="rounded-full bg-[#289E9D]/10 px-3 py-1 text-xs font-black text-[#70e4df]">Borrador seguro</span></div>

    {!divisions.length?<div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-200">Primero crea al menos una división/modalidad en la arquitectura del campeonato.</div>:<>
      <div className="mt-5 grid gap-4 xl:grid-cols-[.7fr_1.3fr]"><div className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><label><span className="mb-1 block text-xs font-black text-[#9aa6b5]">División a configurar</span><select value={divisionId} onChange={(event)=>setDivisionId(event.target.value)} className={field}>{divisions.map((division)=><option key={division.id} value={division.id}>{division.nombre}{division.modalidad?` · ${division.modalidad}`:''}</option>)}</select></label><div className="mt-3 rounded-xl border border-white/10 bg-[#151b25] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Competidores activos</p><p className="mt-1 text-3xl font-black text-white">{currentCount}</p><p className="mt-1 text-xs text-[#697586]">{divisionCategory?`Vinculada a ${divisionCategory.nombre}`:'División independiente'}</p></div><button disabled={loading||!currentCount} onClick={()=>void generatePreview()} className="mt-3 min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{loading?'Calculando...':'Previsualizar estructura'}</button></div>

        <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><p className="text-xs font-black uppercase tracking-[.14em] text-[#D8BE87]">Agregar competidor</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><select value={form.origen} onChange={(event)=>setForm({...form,origen:event.target.value as 'academia'|'externo',jugador_id:'',nombre:''})} className={field}><option value="externo">Externo / rival</option><option value="academia">Nuestra academia</option></select><select value={form.tipo} onChange={(event)=>setForm({...form,tipo:event.target.value as 'equipo'|'deportista'|'pareja',jugador_id:'',nombre:''})} className={field}><option value="equipo">Equipo</option><option value="deportista">Deportista</option><option value="pareja">Pareja</option></select></div>
          {form.origen==='academia'&&form.tipo==='deportista'?<div className="mt-3"><select value={form.jugador_id} onChange={(event)=>setForm({...form,jugador_id:event.target.value})} className={field} disabled={!selectedDivision?.categoria_id}><option value="">{selectedDivision?.categoria_id?'Selecciona deportista':'Vincula la división a una categoría primero'}</option>{eligible.map((student)=><option key={student.id} value={student.id}>{student.nombre}</option>)}</select></div>:<div className="mt-3"><input value={form.nombre} onChange={(event)=>setForm({...form,nombre:event.target.value})} className={field} placeholder={form.origen==='academia'&&form.tipo==='equipo'?(divisionCategory?`Opcional · por defecto ${divisionCategory.nombre}`:'Nombre del equipo de la academia'):form.tipo==='pareja'?'Ej. Jara / Pérez':'Ej. Club Deportivo Norte'}/></div>}
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input type="number" min="1" value={form.seed} onChange={(event)=>setForm({...form,seed:event.target.value})} className={field} placeholder="Seed / preclasificación (opcional)"/><button disabled={saving} onClick={()=>void addCompetitor()} className="min-h-11 rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] disabled:opacity-40">{saving?'Agregando...':'Agregar'}</button></div><p className="mt-2 text-[11px] leading-4 text-[#697586]">El seed solo define el orden inicial de la previsualización; no publica cruces ni resultados.</p></div></div>

      <div className="mt-5"><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-[.14em] text-[#9aa6b5]">Competidores de la división</p><span className="text-xs text-[#697586]">{currentCount}</span></div><div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{seeded.map((competitor)=><article key={competitor.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-xs font-black text-violet-300">{competitor.seed||'—'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{competitor.nombre}</p><p className="text-[10px] uppercase text-[#697586]">{competitor.origen==='academia'?'Academia':'Externo'} · {competitor.tipo}</p></div><button onClick={()=>void removeCompetitor(competitor)} className="text-xs font-black text-red-300">×</button></article>)}{!currentCount?<div className="col-span-full rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#697586]">Aún no hay competidores en esta división.</div>:null}</div></div>

      {preview?<div className="mt-6 rounded-2xl border border-[#C8A96B]/25 bg-[#0d1117] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Vista previa · no publicada</p><h3 className="mt-1 text-xl font-black text-white">{selectedDivision?.nombre}</h3><p className="mt-1 text-xs text-[#8b949e]">{preview.competitorCount} competidor(es) · modo {preview.mode}</p></div><span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">0 partidos creados</span></div>
        <div className="mt-4">{preview.mode==='round_robin'?renderRounds(preview.rounds):null}{['bracket','bracket_with_repechage','double_elimination_outline'].includes(preview.mode)?<div className="grid gap-2 md:grid-cols-2">{preview.bracket?.matches.map((match)=><div key={match.slot} className="rounded-xl border border-white/10 bg-[#151b25] p-3"><p className="text-[10px] font-black uppercase text-[#697586]">Cruce {match.slot}</p><p className="mt-1 text-sm font-black text-white">{pairingLabel(match)}</p></div>)}</div>:null}{['groups_then_bracket','pools'].includes(preview.mode)?<div className="grid gap-4 xl:grid-cols-2">{preview.groups?.map((group)=><article key={group.code} className="rounded-xl border border-white/10 bg-[#151b25] p-4"><p className="font-black text-white">{group.label}</p><p className="mt-1 text-xs text-[#697586]">{group.competitors.map((item)=>item.nombre).join(' · ')}</p><div className="mt-3">{renderRounds(group.rounds)}</div></article>)}</div>:null}{preview.mode==='ranking_or_rounds'?<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{preview.entries?.map((item,index)=><div key={item.id} className="rounded-xl border border-white/10 bg-[#151b25] p-3 text-sm font-black text-white">{index+1}. {item.nombre}</div>)}</div>:null}{preview.mode==='manual'?<div className="rounded-xl border border-white/10 bg-[#151b25] p-4 text-sm text-[#c3ccd6]">La estructura seguirá las fases configuradas por Dirección. No se generan cruces automáticos.</div>:null}</div>
        {preview.secondaryStage?<p className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-xs leading-5 text-violet-200">{preview.secondaryStage}</p>:null}{preview.note?<p className="mt-3 text-xs leading-5 text-[#8b949e]">{preview.note}</p>:null}<div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100/80"><strong className="text-amber-200">Todavía no se puede publicar desde aquí.</strong> Primero estamos validando seeds, distribución y formato. La publicación de encuentros será una operación explícita y reversible en la siguiente capa.</div></div>:null}
    </>}
  </section>;
}
