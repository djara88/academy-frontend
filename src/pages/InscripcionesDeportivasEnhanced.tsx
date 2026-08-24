import InscripcionesDeportivas from './InscripcionesDeportivas';
import DirectorSportRequests from '../components/DirectorSportRequests';
import { DirectorHero, DirectorPage } from '../components/director/DirectorModule';

export default function InscripcionesDeportivasEnhanced(){
  return <DirectorPage className="max-w-[1450px]">
    <DirectorHero eyebrow="Organización deportiva" title="Inscripciones multideporte" description="Administra las disciplinas activas de cada alumno sin duplicar su ficha. Sede, rama, categoría y valores permanecen ligados a cada inscripción deportiva." aside={<div className="rounded-[22px] border border-white/10 bg-white/5 p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Una persona · varias disciplinas</p><p className="mt-2 text-lg font-black text-white">Ficha única</p><p className="mt-2 text-xs leading-5 text-[#c7d0c8]">Los cambios deportivos no duplican datos personales ni financieros.</p></div>}/>
    <DirectorSportRequests/>
    <InscripcionesDeportivas/>
  </DirectorPage>;
}
