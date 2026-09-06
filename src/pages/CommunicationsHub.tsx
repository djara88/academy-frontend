import { useState } from 'react';
import { ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ChatCenter from './ChatCenter';
import WhatsAppGroups from './WhatsAppGroups';
import { DirectorHero, DirectorPage, DirectorTabButton, DirectorTabs } from '../components/director/DirectorModule';

const CommunicationsHub = () => {
  const [tab, setTab] = useState<'conversaciones' | 'grupos'>('conversaciones');

  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero
      eyebrow="Comunicaciones"
      title="Centro de contacto"
      description="Atiende conversaciones individuales o coordina grupos operativos de WhatsApp desde un mismo lugar."
    />

    <DirectorTabs className="grid-cols-2">
      <DirectorTabButton active={tab === 'conversaciones'} onClick={() => setTab('conversaciones')}>
        <span className="inline-flex items-center gap-2"><ChatBubbleLeftRightIcon aria-hidden="true" className="h-5 w-5" />Conversaciones</span>
      </DirectorTabButton>
      <DirectorTabButton active={tab === 'grupos'} onClick={() => setTab('grupos')}>
        <span className="inline-flex items-center gap-2"><UserGroupIcon aria-hidden="true" className="h-5 w-5" />Grupos WhatsApp</span>
      </DirectorTabButton>
    </DirectorTabs>

    <div className="min-w-0">{tab === 'conversaciones' ? <ChatCenter /> : <WhatsAppGroups />}</div>
  </DirectorPage>;
};

export default CommunicationsHub;
