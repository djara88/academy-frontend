import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DirectorPage } from '../components/director/DirectorModule';

type Cycle='monthly'|'annual';
type Quote={chargedNetClp:number;chargedGrossClp:number;regularNetClp:number;billingPeriodMonths:number};
type Catalog={guardianAddon:{name:string;priceClp:number;grossClp:number;trialIncluded:boolean;monthly:Quote;annual:Quote;features:string[]};currentGuardianLicense:{active:boolean;trialIncluded:boolean;endsAt?:string|null}};
type MpStatus={capabilities:{platformCheckout:boolean}};
const money=(value:number)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value||0);

export default function GuardianLicenseBoard(){
  const {notify}=useAppDialog();
  const [cycle,setCycle]=useState<Cycle>('monthly');
  const [loading,setLoading]=useState(false);
  const {data:catalog,isLoading}=useQuery({queryKey:['guardian-addon-catalog-v2'],queryFn:async()=>(await api.get('/api/subscriptions/plans')).data.data as Catalog});
  const {data:mp}=useQuery({queryKey:['mercadopago-platform-status'],queryFn:async()=>(await api.get('/api/mercadopago/status')).data.data as MpStatus});
  if(isLoading||!catalog)return <div className="family-access"><div className="family-access-loading">Verificando licencia familiar…</div></div>;
  const active=catalog.currentGuardianLicense.active;
  const quote=cycle==='annual'?catalog.guardianAddon.annual:catalog.guardianAddon.monthly;
  const checkoutReady=mp?.capabilities.platformCheckout===true;
  const checkout=async()=>{setLoading(true);try{const response=await api.post('/api/mercadopago/platform-subscription/guardian-addon',{billing_cycle:cycle});window.location.assign(response.data.data.checkoutUrl);}catch(error:any){await notify(error.response?.data?.error||'No fue posible preparar el pago.',{title:'Apoderados PRO'});setLoading(false);}};

  return <DirectorPage className="max-w-[1180px]">
    <div className="family-access guardian-license">
      <header className="guardian-license-command">
        <div><p className="family-access-kicker">Family Access · Licencia de academia</p><h1>Apoderados PRO</h1><p>Habilita el portal privado para todas las familias de la academia: deportistas vinculados, cobros, comunicaciones, confirmaciones y privacidad. La licencia se cobra por academia, no por persona.</p></div>
        <div className="guardian-license-price"><small>Valor mensual de referencia</small><strong>{money(catalog.guardianAddon.priceClp)} + IVA</strong><span>una licencia para toda la academia</span></div>
      </header>

      {catalog.currentGuardianLicense.trialIncluded?<div className="guardian-license-state"><strong>Incluido en la prueba Full.</strong> No necesitas contratarlo mientras dure la prueba.</div>:active?<div className="guardian-license-state"><strong>Licencia activa.</strong>{catalog.currentGuardianLicense.endsAt?` Vigente hasta ${new Date(`${catalog.currentGuardianLicense.endsAt}T12:00:00`).toLocaleDateString('es-CL')}.`:''}</div>:null}
      {!checkoutReady?<div className="guardian-license-state is-warning"><strong>Checkout aún no disponible.</strong> Faltan credenciales de producción de Mercado Pago; Lestra no reemplaza esta validación por enlaces o confirmaciones manuales.</div>:null}

      <section className="guardian-license-workspace">
        <div className="guardian-license-features"><div className="guardian-license-section-head"><p className="family-access-kicker" style={{color:'var(--ls-accent-text)'}}>Qué habilita</p><h2>Experiencia familiar conectada al plantel</h2></div><div className="guardian-license-feature-list">{catalog.guardianAddon.features.map(feature=><div key={feature} className="guardian-license-feature"><span className="guardian-license-check">✓</span><span>{feature}</span></div>)}</div></div>
        <div className="guardian-license-billing"><div className="guardian-license-section-head"><p className="family-access-kicker" style={{color:'var(--ls-accent-text)'}}>Vigencia</p><h2>Elige cómo contratar</h2></div><div className="guardian-license-billing-body"><button type="button" aria-pressed={cycle==='monthly'} onClick={()=>setCycle('monthly')} className="guardian-license-option"><strong>Mensual</strong><span>{money(catalog.guardianAddon.monthly.chargedNetClp)} <small>+ IVA</small></span></button><button type="button" aria-pressed={cycle==='annual'} onClick={()=>setCycle('annual')} className="guardian-license-option"><strong>Anual · 2 meses gratis</strong><span>{money(catalog.guardianAddon.annual.chargedNetClp)} <small>+ IVA/año</small></span></button>{!active&&!catalog.currentGuardianLicense.trialIncluded?<button disabled={loading||!checkoutReady} onClick={()=>void checkout()} className={`${DIRECTOR_BUTTON} w-full`}>{loading?'Conectando con Mercado Pago…':`Pagar ${money(quote.chargedGrossClp)}`}</button>:null}</div></div>
      </section>

      <section className="guardian-license-trust"><span className="guardian-license-check">✓</span><span><strong>Activación verificable.</strong> Mercado Pago procesa el monto exacto y Lestra activa la licencia cuando recibe la confirmación por webhook. No existe botón “Ya pagué” ni activación manual.</span></section>
    </div>
  </DirectorPage>;
}
