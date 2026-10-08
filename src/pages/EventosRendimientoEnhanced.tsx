import EventosRendimiento from './EventosRendimiento';
import DirectorSportsResponses from '../components/DirectorSportsResponses';
import { DirectorHero, DirectorPage } from '../components/director/DirectorModule';
import SportsDialogAccessibility from '../components/SportsDialogAccessibility';

export default function EventosRendimientoEnhanced() {
  return <DirectorPage className="max-w-[1500px]">
    <SportsDialogAccessibility />
    <DirectorHero
      eyebrow="Match Command · Competencia"
      title="Preparar, competir y cerrar"
      description="Trabaja cada encuentro como una operación deportiva: contexto, citación, llegada, resultado y rendimiento permanecen unidos en la misma secuencia."
    />
    <div className="events-performance-scope">
      <EventosRendimiento />
    </div>
    <div className="sports-confirmations-scope">
      <DirectorSportsResponses compactTitle="Confirmaciones y citaciones deportivas" />
    </div>
  </DirectorPage>;
}
