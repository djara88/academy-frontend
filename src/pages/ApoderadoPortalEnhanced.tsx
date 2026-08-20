import ApoderadoPortal from './ApoderadoPortal';
import GuardianSportsResponses from '../components/GuardianSportsResponses';
import GuardianSportsRequests from '../components/GuardianSportsRequests';
import GuardianFinanceStatement from '../components/GuardianFinanceStatement';

export default function ApoderadoPortalEnhanced() {
  return <div className="space-y-6"><ApoderadoPortal/><GuardianFinanceStatement/><GuardianSportsResponses/><GuardianSportsRequests/></div>;
}
