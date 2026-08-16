import { useState } from 'react';
import { ChatBubbleLeftRightIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ChatCenter from './ChatCenter';
import WhatsAppGroups from './WhatsAppGroups';

const CommunicationsHub = () => {
  const [tab, setTab] = useState<'conversaciones' | 'grupos'>('conversaciones');
  return <div className="space-y-5">
    <div className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-[#111720] p-2 sm:w-auto">
      <button type="button" onClick={() => setTab('conversaciones')} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === 'conversaciones' ? 'bg-[#289E9D] text-white' : 'text-[#8f9baa] hover:bg-white/[0.04] hover:text-white'}`}><ChatBubbleLeftRightIcon className="h-5 w-5" /> Conversaciones</button>
      <button type="button" onClick={() => setTab('grupos')} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab === 'grupos' ? 'bg-emerald-500 text-white' : 'text-[#8f9baa] hover:bg-white/[0.04] hover:text-white'}`}><UserGroupIcon className="h-5 w-5" /> Grupos WhatsApp</button>
    </div>
    {tab === 'conversaciones' ? <ChatCenter /> : <WhatsAppGroups />}
  </div>;
};

export default CommunicationsHub;
