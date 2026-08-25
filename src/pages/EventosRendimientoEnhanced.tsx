import EventosRendimiento from './EventosRendimiento';
import DirectorSportsResponses from '../components/DirectorSportsResponses';
import { DirectorHero, DirectorPage } from '../components/director/DirectorModule';

export default function EventosRendimientoEnhanced() {
  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero eyebrow="Operación deportiva" title="Eventos y rendimiento" description="Programa partidos, duelos, pruebas y presentaciones; registra resultados y rendimiento individual con el contexto correcto de sede, rama, categoría y competencia." aside={<div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Antes</p><p className="mt-2 text-lg font-black text-white">Planifica</p><p className="mt-1 text-[11px] leading-4 text-[#c7d0c8]">Citación, horario y recinto.</p></div><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Después</p><p className="mt-2 text-lg font-black text-white">Registra</p><p className="mt-1 text-[11px] leading-4 text-[#c7d0c8]">Resultado, métricas y evolución.</p></div></div>}/>
    <div className="events-performance-scope">
      <EventosRendimiento/>
    </div>
    <div className="sports-confirmations-scope">
      <DirectorSportsResponses compactTitle="Confirmaciones y citaciones deportivas"/>
    </div>
  </DirectorPage>;
}
