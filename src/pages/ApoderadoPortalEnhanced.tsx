import ApoderadoPortal from './ApoderadoPortal';
import GuardianSportsResponses from '../components/GuardianSportsResponses';
import GuardianSportsRequests from '../components/GuardianSportsRequests';

export default function ApoderadoPortalEnhanced() {
  return <div className="space-y-6"><ApoderadoPortal/><GuardianSportsResponses/><GuardianSportsRequests/></div>;
}
