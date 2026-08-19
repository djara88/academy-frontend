import { useParams } from 'react-router-dom';
import GestionarTorneoMultirama from './GestionarTorneoMultirama';
import DirectorSportsResponses from '../components/DirectorSportsResponses';

export default function GestionarTorneoMultiramaEnhanced() {
  const { id } = useParams();
  return <div className="space-y-6"><GestionarTorneoMultirama/><DirectorSportsResponses tournamentId={id} compactTitle="Confirmaciones de esta competencia"/></div>;
}
