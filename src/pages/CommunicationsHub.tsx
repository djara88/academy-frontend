import { useState } from 'react';
import { ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ChatCenter from './ChatCenter';
import WhatsAppGroups from './WhatsAppGroups';
import { DirectorHero, DirectorPage, DirectorTabButton, DirectorTabs } from '../components/director/DirectorModule';

const CommunicationsHub = () => {
  const [tab, setTab] = useState<'conversaciones' | 'grupos'>('conversaciones');
  return <DirectorPage className="max-w-[1500px]">
    <DirectorHero eyebrow="Comunicaciones" title="Centro de contacto" description="Concentra las conversaciones individuales y los grupos operativos de WhatsApp sin salir de la gestión de la academia." aside={<div className="grid grid-cols-2 gap-2"><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><ChatBubbleLeftRightIcon className="h-6 w-6 text-[#b7ff00]"/><p className="mt-3 text-sm font-black text-white">Conversaciones</p><p className="mt-1 text-[11px] leading-4 text-[#b9c4ba]">Atención directa y seguimiento.</p></div><div className="rounded-[18px] border border-white/10 bg-white/5 p-4"><UserGroupIcon className="h-6 w-6 text-[#b7ff00]"/><p className="mt-3 text-sm font-black text-white">Grupos</p><p className="mt-1 text-[11px] leading-4 text-[#b9c4ba]">Coordinación por equipos y categorías.</p></div></div>}/>
    <DirectorTabs className="grid-cols-2">
      <DirectorTabButton active={tab === 'conversaciones'} onClick={() => setTab('conversaciones')}><span className="inline-flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-5 w-5" />Conversaciones</span></DirectorTabButton>
      <DirectorTabButton active={tab === 'grupos'} onClick={() => setTab('grupos')}><span className="inline-flex items-center gap-2"><UserGroupIcon className="h-5 w-5" />Grupos WhatsApp</span></DirectorTabButton>
    </DirectorTabs>
    <div className="min-w-0">{tab === 'conversaciones' ? <ChatCenter /> : <WhatsAppGroups />}</div>
  </DirectorPage>;
};

export default CommunicationsHub;
