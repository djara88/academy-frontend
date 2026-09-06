import EventosRendimiento from './EventosRendimiento';
import DirectorSportsResponses from '../components/DirectorSportsResponses';
import { DirectorHero, DirectorPage } from '../components/director/DirectorModule';

export default function EventosRendimientoEnhanced() {
  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero
      eyebrow="Operación deportiva"
      title="Partidos y eventos"
      description="Planifica la actividad, envía la citación y registra el resultado o rendimiento desde un mismo flujo."
    />
    <div className="events-performance-scope">
      <EventosRendimiento />
    </div>
    <div className="sports-confirmations-scope">
      <DirectorSportsResponses compactTitle="Confirmaciones y citaciones deportivas" />
    </div>
  </DirectorPage>;
}
