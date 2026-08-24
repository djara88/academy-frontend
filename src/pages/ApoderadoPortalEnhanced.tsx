import ApoderadoPortal from './ApoderadoPortal';
import GuardianSportsResponses from '../components/GuardianSportsResponses';
import GuardianSportsRequests from '../components/GuardianSportsRequests';
import GuardianFinanceStatement from '../components/GuardianFinanceStatement';

export default function ApoderadoPortalEnhanced() {
  return <div className="mx-auto w-full max-w-[1320px] space-y-6 pb-16">
    <section className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(132deg,#09100c_0%,#111a13_65%,#11190f_100%)] px-6 py-7 text-white shadow-[0_22px_58px_rgba(14,22,15,.15)] sm:px-8">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[30px] border-[#b7ff00]/10" />
      <div className="relative"><p className="text-[11px] font-black uppercase tracking-[.17em] text-[#b7ff00]">Portal familiar</p><h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">Mi academia</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#c7d0c8]">Agenda, confirmaciones deportivas, solicitudes y pagos de tus alumnos vinculados en un solo lugar.</p></div>
    </section>
    <ApoderadoPortal/>
    <GuardianFinanceStatement/>
    <GuardianSportsResponses/>
    <GuardianSportsRequests/>
  </div>;
}
