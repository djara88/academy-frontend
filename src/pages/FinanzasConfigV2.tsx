import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

type FinanceConfig={acepta_efectivo:boolean;acepta_transferencia:boolean;transferencia_banco:string;transferencia_tipo_cuenta:string;transferencia_numero:string;transferencia_rut:string;transferencia_correo:string};
type MpStatus={capabilities:{platformCheckout:boolean;marketplaceOAuth:boolean;webhookValidation:boolean};academy:{connected:boolean;status:string;mp_user_id?:number|null;connected_at?:string|null;token_expires_at?:string|null}};

const BANK_OPTIONS = [
 'BancoEstado','Banco de Chile / Edwards','Banco Internacional','Scotiabank Chile','BCI - Banco de Crédito e Inversiones','Banco BICE','Banco Santander-Chile','Itaú Chile','Banco Security','Banco Falabella','Banco Ripley','Banco Consorcio','Banco BTG Pactual Chile','Coopeuch','Tenpo','Mercado Pago','MACH / Bci',
] as const;
const OTHER_BANK='__otra__';
const isCataloguedBank=(value:string)=>BANK_OPTIONS.some(bank=>bank===value);
const empty:FinanceConfig={acepta_efectivo:true,acepta_transferencia:false,transferencia_banco:'',transferencia_tipo_cuenta:'',transferencia_numero:'',transferencia_rut:'',transferencia_correo:''};
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

function Toggle({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}){
 return <label className="inline-flex cursor-pointer items-center gap-3"><span className="text-sm font-black text-[#111711]">{label}</span><span className={`relative h-7 w-12 rounded-full transition ${checked?'bg-[#b7ff00]':'bg-[#dfe5dc]'}`}><input className="sr-only" type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className={`absolute top-1 h-5 w-5 rounded-full bg-[#111711] transition ${checked?'left-6':'left-1'}`}/></span></label>;
}

function Field({label,value,onChange,type='text',placeholder}:{label:string;value:string;onChange:(value:string)=>void;type?:string;placeholder?:string}){
 return <label className="block"><span className={labelClass}>{label}</span><input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={DIRECTOR_FIELD}/></label>;
}

export default function FinanzasConfigV2(){
 const [params]=useSearchParams();
 const [config,setConfig]=useState<FinanceConfig>(empty);
 const [customBank,setCustomBank]=useState(false);
 const [mp,setMp]=useState<MpStatus|null>(null);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const bankSelectValue=customBank?OTHER_BANK:config.transferencia_banco;

 const load=async()=>{
  setLoading(true);setError('');
  try{
   const [cfg,mpStatus]=await Promise.all([api.get('/api/finanzas/configuracion'),api.get('/api/mercadopago/status')]);
   const data=cfg.data.data||{};
   const savedBank=String(data.transferencia_banco||'').trim();
   setCustomBank(Boolean(savedBank)&&!isCataloguedBank(savedBank));
   setConfig(prev=>({...prev,...data,acepta_efectivo:data?.acepta_efectivo!==false,acepta_transferencia:data?.acepta_transferencia===true,transferencia_banco:savedBank}));
   setMp(mpStatus.data.data);
  }catch(err:any){setError(err.response?.data?.error||'No fue posible cargar la configuración financiera.');}
  finally{setLoading(false);}
 };
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(params.get('mp')==='connected')setMessage('Mercado Pago conectado correctamente. Los pagos online podrán conciliarse de forma automática.');else if(params.get('mp')==='error')setError('Mercado Pago no pudo completar la vinculación. Intenta nuevamente.');},[params]);

 const save=async(e:FormEvent)=>{
  e.preventDefault();setSaving(true);setError('');
  try{await api.put('/api/finanzas/configuracion',{...config,acepta_pago_online:Boolean(mp?.academy.connected),link_pago_online:''});setMessage('Configuración de recaudación guardada.');}
  catch(err:any){setError(err.response?.data?.error||'No fue posible guardar la configuración.');}
  finally{setSaving(false);}
 };
 const connect=async()=>{setSaving(true);setError('');try{const r=await api.post('/api/mercadopago/oauth/connect');window.location.assign(r.data.url);}catch(err:any){setError(err.response?.data?.error||'No fue posible iniciar la conexión con Mercado Pago.');setSaving(false);}};
 const disconnect=async()=>{if(!window.confirm('¿Desconectar Mercado Pago de esta academia? Los pagos online quedarán deshabilitados.'))return;setSaving(true);try{await api.post('/api/mercadopago/disconnect');setMessage('Mercado Pago fue desconectado.');await load();}catch(err:any){setError(err.response?.data?.error||'No fue posible desconectar Mercado Pago.');}finally{setSaving(false);}};
 const onBankChange=(value:string)=>{if(value===OTHER_BANK){setCustomBank(true);setConfig(current=>({...current,transferencia_banco:isCataloguedBank(current.transferencia_banco)?'':current.transferencia_banco}));return;}setCustomBank(false);setConfig(current=>({...current,transferencia_banco:value}));};

 if(loading)return <DirectorPanel className="mx-auto max-w-5xl p-12 text-center text-sm font-bold text-[#697468]">Cargando recaudación...</DirectorPanel>;

 return <DirectorPage className="max-w-5xl">
  <DirectorHero
   eyebrow="Recaudación y medios de pago"
   title="Cómo recibe pagos tu academia"
   description="Configura los medios de pago que usarán tus apoderados y mantén la recaudación organizada sin mezclar la configuración con la operación financiera diaria."
   aside={<div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Pago online</p><p className="mt-2 text-xl font-black text-white">{mp?.academy.connected?'Conectado':'Opcional'}</p><p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{mp?.academy.connected?'Conciliación automática disponible':'Efectivo y transferencia siguen operativos'}</p></div>}
  />

  <section className="grid gap-3 sm:grid-cols-3">
   <DirectorStat label="Efectivo" value={config.acepta_efectivo?'Activo':'Inactivo'} tone={config.acepta_efectivo?'lime':'default'} />
   <DirectorStat label="Transferencia" value={config.acepta_transferencia?'Activa':'Inactiva'} tone={config.acepta_transferencia?'lime':'default'} />
   <DirectorStat label="Pago online" value={mp?.academy.connected?'Conectado':'No conectado'} tone={mp?.academy.connected?'dark':'default'} />
  </section>

  {message?<div className="rounded-[18px] border border-[#cde995] bg-[#f3fadf] p-4 text-sm font-bold text-[#4e6900]">{message}</div>:null}
  {error?<div className="rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>:null}

  <form onSubmit={save} className="space-y-5">
   <DirectorPanel className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
     <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Medio presencial</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Efectivo</h2><p className="mt-1 text-sm text-[#697468]">Registra el pago cuando recibas el dinero.</p></div>
     <Toggle checked={config.acepta_efectivo} onChange={value=>setConfig({...config,acepta_efectivo:value})} label={config.acepta_efectivo?'Habilitado':'Deshabilitado'}/>
    </div>
   </DirectorPanel>

   <DirectorPanel className="p-5 sm:p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
     <div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Validación manual</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Transferencia bancaria</h2><p className="mt-1 text-sm text-[#697468]">El apoderado adjunta su comprobante y la academia valida el pago.</p></div>
     <Toggle checked={config.acepta_transferencia} onChange={value=>setConfig({...config,acepta_transferencia:value})} label={config.acepta_transferencia?'Habilitada':'Deshabilitada'}/>
    </div>
    {config.acepta_transferencia?<div className="mt-6 grid gap-4 md:grid-cols-2">
      <label><span className={labelClass}>Banco / institución</span><select value={bankSelectValue} onChange={e=>onBankChange(e.target.value)} className={DIRECTOR_FIELD}><option value="">Seleccionar banco o institución...</option>{BANK_OPTIONS.map(bank=><option key={bank} value={bank}>{bank}</option>)}<option value={OTHER_BANK}>Otra institución</option></select></label>
      {customBank?<Field label="Otra institución" value={config.transferencia_banco} onChange={v=>setConfig({...config,transferencia_banco:v})}/>:null}
      <label><span className={labelClass}>Tipo de cuenta</span><select value={config.transferencia_tipo_cuenta} onChange={e=>setConfig({...config,transferencia_tipo_cuenta:e.target.value})} className={DIRECTOR_FIELD}><option value="">Seleccionar...</option><option>Cuenta Corriente</option><option>Cuenta Vista</option><option>Cuenta RUT</option><option>Chequera Electrónica</option></select></label>
      <Field label="N° de cuenta" value={config.transferencia_numero} onChange={v=>setConfig({...config,transferencia_numero:v})}/>
      <Field label="RUT titular" value={config.transferencia_rut} onChange={v=>setConfig({...config,transferencia_rut:v})}/>
      <div className="md:col-span-2"><Field label="Correo de pagos (opcional)" type="email" value={config.transferencia_correo} onChange={v=>setConfig({...config,transferencia_correo:v})}/></div>
    </div>:null}
   </DirectorPanel>

   <DirectorPanel className="p-5 sm:p-6">
    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
     <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Pago online</p><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${mp?.academy.connected?'border-[#cde995] bg-[#f3fadf] text-[#5f7900]':'border-[#d9e0d6] bg-[#f5f7f3] text-[#697468]'}`}>{mp?.academy.connected?'Conectado':'No conectado'}</span></div>
      <h2 className="mt-2 text-2xl font-black tracking-[-.03em] text-[#111711]">Mercado Pago</h2>
      {mp?.academy.connected?<><p className="mt-1 max-w-2xl text-sm leading-6 text-[#697468]">Los apoderados pueden pagar sus obligaciones online y la conciliación se actualiza automáticamente.</p><p className="mt-2 text-xs font-black uppercase tracking-[.08em] text-[#5f7900]">Conciliación automática activa</p></>:<p className="mt-1 max-w-2xl text-sm leading-6 text-[#697468]">Conecta la cuenta Mercado Pago de la academia para habilitar pagos online.</p>}
     </div>
     {mp?.academy.connected?<button type="button" disabled={saving} onClick={()=>void disconnect()} className={DIRECTOR_BUTTON_DARK}>Desconectar</button>:<button type="button" disabled={saving||!mp?.capabilities.marketplaceOAuth} onClick={()=>void connect()} className={DIRECTOR_BUTTON}>Conectar Mercado Pago</button>}
    </div>
    {!mp?.capabilities.marketplaceOAuth?<p className="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">Pago online no está disponible temporalmente. Puedes continuar usando efectivo o transferencia.</p>:null}
   </DirectorPanel>

   <div className="flex justify-end"><button disabled={saving} className={DIRECTOR_BUTTON}>{saving?'Guardando...':'Guardar configuración'}</button></div>
  </form>
 </DirectorPage>;
}
