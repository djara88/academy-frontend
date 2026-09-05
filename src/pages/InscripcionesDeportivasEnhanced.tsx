import InscripcionesDeportivas from './InscripcionesDeportivas';
import DirectorSportRequests from '../components/DirectorSportRequests';
import { DirectorHero, DirectorPage } from '../components/director/DirectorModule';

export default function InscripcionesDeportivasEnhanced(){
  return <DirectorPage className="max-w-[1450px]">
    <DirectorHero
      eyebrow="Organización deportiva"
      title="Inscripciones multideporte"
      description="Administra las disciplinas activas de cada alumno sin duplicar su ficha. Sede, rama, categoría y valores permanecen ligados a cada inscripción deportiva."
      aside={<div className="rounded-[18px] border border-[#dce2d8] bg-[#f7f9f5] p-4"><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#607900]">Una persona · varias disciplinas</p><p className="mt-2 text-lg font-black text-[#111711]">Ficha única</p><p className="mt-1 text-xs leading-5 text-[#697468]">Los cambios deportivos no duplican datos personales ni financieros.</p></div>}
    />
    <DirectorSportRequests/>
    <InscripcionesDeportivas/>
  </DirectorPage>;
}
