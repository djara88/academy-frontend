import { useParams } from 'react-router-dom';
import CollectionPortalV2 from './CollectionPortalV2';
import PaymentResult from './PaymentResult';

export default function CollectionPortal() {
  const { token } = useParams();
  if (token === 'resultado') return <PaymentResult />;
  return <CollectionPortalV2 />;
}
