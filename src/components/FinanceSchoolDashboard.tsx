import { useMemo } from 'react';
import {
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Branch={id:string;nombre:string;disciplina:string;sedes?:{id:string;nombre:string}|null};
type Summary={totalIngresosReales:number;totalPorCobrar:number;totalVencido:number;totalPorVencer:number;totalEgresos:number;balanceNeto:number;totalAlumnos:number;alumnosMorosos:number;tasaMorosidad:number};
type Charge={id:string;monto:number;monto_pagado:number;estado:string;rama_id?:string|null};
type Account={id:string;nombre:string;saldoTotalPendiente:number;saldoPendiente:number;alDia:boolean;cobros:Charge[];tutores?:{nombre_completo?:string|null}|null};
type Payment={id:string;monto:number;metodo_pago?:string|null;fecha_pago?:string|null};
type Expense={id:string;categoria_gasto?:string|null;centro_costo?:string|null;monto:number;fecha_gasto?:string|null;rama_id?:string|null};
type FlowRow={id:string;tipo:'Ingreso'|'Egreso';monto:number;fecha?:string|null};

type Props={
  summary:Summary|null;
  accounts:Account[];
  payments:Payment[];
  expenses:Expense[];
  flow:FlowRow[];
  branches:Branch[];
  branchId:string;
};

const panel='rounded-[24px] border border-white/10 bg-[#151b25]';
const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const compact=(value:number)=>new Intl.NumberFormat('es-CL',{notation:'compact',maximumFractionDigits:1}).format(Number(value)||0);
const pct=(value:number)=>`${Number(value||0).toLocaleString('es-CL',{maximumFractionDigits:1})}%`;
const COLORS=['#48d8d0','#C8A96B','#f59e0b','#f87171','#8b5cf6','#38bdf8','#34d399'];

const monthKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const monthLabel=(date:Date)=>new Intl.DateTimeFormat('es-CL',{month:'short',year:'2-digit'}).format(date).replace('.','');

const Kpi=({label,value,detail,tone='text-white',icon:Icon}:{label:string;value:string;detail:string;tone?:string;icon:typeof BanknotesIcon})=><article className={`${panel} p-5`}><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#697586]">{label}</p><p className={`mt-2 text-2xl font-black ${tone}`}>{value}</p></div><div className="rounded-xl border border-white/10 bg-[#0d1117] p-2.5 text-[#70e4df]"><Icon className="h-5 w-5"/></div></div><p className="mt-2 text-xs leading-5 text-[#8995a4]">{detail}</p></article>;

const Empty=({text}:{text:string})=><div className="grid h-[270px] place-items-center text-center text-sm text-[#697586]">{text}</div>;

export default function FinanceSchoolDashboard({summary,accounts,payments,expenses,flow,branches,branchId}:Props){
  const selectedBranch=branches.find((item)=>item.id===branchId)||null;

  const analytics=useMemo(()=>{
    const now=new Date();
    const months=Array.from({length:12},(_,index)=>{
      const date=new Date(now.getFullYear(),now.getMonth()-(11-index),1);
      return {key:monthKey(date),mes:monthLabel(date),ingresos:0,egresos:0,balance:0};
    });
    const monthMap=new Map(months.map((item)=>[item.key,item]));
    flow.forEach((row)=>{
      if(!row.fecha)return;
      const key=String(row.fecha).slice(0,7);
      const bucket=monthMap.get(key);
      if(!bucket)return;
      if(row.tipo==='Ingreso')bucket.ingresos+=Number(row.monto)||0;
      else bucket.egresos+=Number(row.monto)||0;
      bucket.balance=bucket.ingresos-bucket.egresos;
    });

    const expenseMap=new Map<string,number>();
    expenses.forEach((item)=>{
      const key=item.categoria_gasto?.trim()||'Otros';
      expenseMap.set(key,(expenseMap.get(key)||0)+(Number(item.monto)||0));
    });
    const expenseCategories=[...expenseMap.entries()].map(([categoria,monto])=>({categoria,monto})).sort((a,b)=>b.monto-a.monto).slice(0,7);

    const methodMap=new Map<string,number>();
    payments.forEach((item)=>{
      const key=item.metodo_pago?.trim()||'Sin método';
      methodMap.set(key,(methodMap.get(key)||0)+(Number(item.monto)||0));
    });
    const paymentMethods=[...methodMap.entries()].map(([metodo,monto])=>({metodo,monto})).sort((a,b)=>b.monto-a.monto).slice(0,7);

    const debtors=accounts.filter((item)=>Number(item.saldoTotalPendiente)>0).sort((a,b)=>Number(b.saldoTotalPendiente)-Number(a.saldoTotalPendiente)).slice(0,6);

    const branchMap=new Map<string,{id:string;nombre:string;recaudado:number;pendiente:number;egresos:number;balance:number}>();
    branches.forEach((item)=>branchMap.set(item.id,{id:item.id,nombre:`${item.disciplina} · ${item.nombre}`,recaudado:0,pendiente:0,egresos:0,balance:0}));
    accounts.flatMap((item)=>item.cobros||[]).filter((charge)=>charge.estado!=='Anulado').forEach((charge)=>{
      if(!charge.rama_id)return;
      const bucket=branchMap.get(charge.rama_id);
      if(!bucket)return;
      bucket.recaudado+=Number(charge.monto_pagado)||0;
      bucket.pendiente+=Math.max((Number(charge.monto)||0)-(Number(charge.monto_pagado)||0),0);
    });
    expenses.forEach((expense)=>{
      if(!expense.rama_id)return;
      const bucket=branchMap.get(expense.rama_id);
      if(bucket)bucket.egresos+=Number(expense.monto)||0;
    });
    const branchPerformance=[...branchMap.values()].map((item)=>({...item,balance:item.recaudado-item.egresos})).filter((item)=>item.recaudado||item.pendiente||item.egresos).sort((a,b)=>b.recaudado-a.recaudado);

    return {months,expenseCategories,paymentMethods,debtors,branchPerformance};
  },[accounts,branches,expenses,flow,payments]);

  const collected=Number(summary?.totalIngresosReales)||0;
  const pending=Number(summary?.totalPorCobrar)||0;
  const overdue=Number(summary?.totalVencido)||0;
  const expensesTotal=Number(summary?.totalEgresos)||0;
  const collectionBase=collected+pending;
  const collectionRate=collectionBase?collected/collectionBase*100:0;
  const expenseRatio=collected?expensesTotal/collected*100:0;
  const overdueAverage=(summary?.alumnosMorosos||0)?overdue/(summary?.alumnosMorosos||1):0;
  const statusData=[
    {name:'Recaudado',value:collected},
    {name:'Vencido',value:overdue},
    {name:'Por vencer',value:Number(summary?.totalPorVencer)||0},
  ].filter((item)=>item.value>0);

  return <section className="space-y-5">
    <div className="overflow-hidden rounded-[24px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(72,216,208,.13),transparent_40%),#151b25] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#70e4df]">Dashboard financiero</p><h2 className="mt-1 text-2xl font-black text-white">Radiografía económica {selectedBranch?`· ${selectedBranch.nombre}`:'de la academia'}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Tendencias, cobranza, estructura de gastos y concentración de deuda usando los mismos datos operativos del módulo. Los gráficos cambian con el filtro de rama superior.</p></div><span className={`self-start rounded-full border px-3 py-1 text-xs font-black ${collectionRate>=80?'border-emerald-400/25 bg-emerald-500/10 text-emerald-300':collectionRate>=60?'border-amber-400/25 bg-amber-500/10 text-amber-300':'border-red-400/25 bg-red-500/10 text-red-300'}`}>Recaudación {pct(collectionRate)}</span></div>
    </div>

    <div className="grid gap-3 md:grid-cols-3">
      <Kpi label="Eficiencia de recaudación" value={pct(collectionRate)} detail={`${money(collected)} ingresados frente a ${money(pending)} pendientes.`} tone={collectionRate>=80?'text-emerald-300':'text-amber-300'} icon={BanknotesIcon}/>
      <Kpi label="Carga de egresos" value={pct(expenseRatio)} detail="Egresos acumulados como proporción de los ingresos efectivamente recibidos." tone={expenseRatio<=70?'text-[#70e4df]':'text-red-300'} icon={ScaleIcon}/>
      <Kpi label="Deuda vencida promedio" value={money(overdueAverage)} detail={`${summary?.alumnosMorosos||0} alumno(s) con deuda vencida en el alcance actual.`} tone={overdueAverage>0?'text-red-300':'text-emerald-300'} icon={UserGroupIcon}/>
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
      <article className={`${panel} p-5 sm:p-6`}><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Últimos 12 meses</p><h3 className="mt-1 text-xl font-black text-white">Flujo financiero</h3><p className="mt-1 text-xs text-[#8995a4]">Ingresos y egresos reales por mes.</p></div><div className="mt-5 h-[310px]">{analytics.months.some((item)=>item.ingresos||item.egresos)?<ResponsiveContainer width="100%" height="100%"><LineChart data={analytics.months} margin={{top:8,right:8,left:-18,bottom:0}}><CartesianGrid stroke="#26303d" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="mes" stroke="#697586" tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis stroke="#697586" tick={{fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(value)=>compact(Number(value))}/><Tooltip contentStyle={{background:'#0d1117',border:'1px solid #30363d',borderRadius:12}} formatter={(value:number,name:string)=>[money(Number(value)),name==='ingresos'?'Ingresos':name==='egresos'?'Egresos':'Balance']}/><Line type="monotone" dataKey="ingresos" stroke="#34d399" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="egresos" stroke="#f87171" strokeWidth={3} dot={false}/><Line type="monotone" dataKey="balance" stroke="#48d8d0" strokeWidth={2} strokeDasharray="5 4" dot={false}/></LineChart></ResponsiveContainer>:<Empty text="Aún no hay movimientos suficientes para dibujar la evolución mensual."/>}</div><div className="mt-3 flex flex-wrap gap-4 text-[11px] font-bold text-[#8995a4]"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400"/>Ingresos</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400"/>Egresos</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#48d8d0]"/>Balance</span></div></article>

      <article className={`${panel} p-5 sm:p-6`}><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Cartera</p><h3 className="mt-1 text-xl font-black text-white">Estado de cobranza</h3><p className="mt-1 text-xs text-[#8995a4]">Cómo se distribuye lo recaudado y lo que sigue pendiente.</p></div><div className="mt-4 h-[250px]">{statusData.length?<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>{statusData.map((_,index)=><Cell key={index} fill={COLORS[index%COLORS.length]}/>)}</Pie><Tooltip contentStyle={{background:'#0d1117',border:'1px solid #30363d',borderRadius:12}} formatter={(value:number)=>money(Number(value))}/></PieChart></ResponsiveContainer>:<Empty text="Sin movimientos de cobranza todavía."/>}</div><div className="space-y-2">{statusData.map((item,index)=><div key={item.name} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#8995a4]"><i className="h-2.5 w-2.5 rounded-full" style={{backgroundColor:COLORS[index%COLORS.length]}}/>{item.name}</span><strong className="text-white">{money(item.value)}</strong></div>)}</div></article>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <article className={`${panel} p-5 sm:p-6`}><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-red-300">Estructura de costos</p><h3 className="mt-1 text-xl font-black text-white">Egresos por categoría</h3></div><div className="mt-5 h-[280px]">{analytics.expenseCategories.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.expenseCategories} layout="vertical" margin={{top:0,right:8,left:20,bottom:0}}><CartesianGrid stroke="#26303d" strokeDasharray="3 3" horizontal={false}/><XAxis type="number" stroke="#697586" tick={{fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(value)=>compact(Number(value))}/><YAxis type="category" dataKey="categoria" width={105} stroke="#8995a4" tick={{fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#0d1117',border:'1px solid #30363d',borderRadius:12}} formatter={(value:number)=>money(Number(value))}/><Bar dataKey="monto" fill="#f87171" radius={[0,7,7,0]}/></BarChart></ResponsiveContainer>:<Empty text="Todavía no hay egresos para comparar."/>}</div></article>

      <article className={`${panel} p-5 sm:p-6`}><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-300">Recaudación</p><h3 className="mt-1 text-xl font-black text-white">Medios de pago</h3></div><div className="mt-5 h-[280px]">{analytics.paymentMethods.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.paymentMethods} margin={{top:0,right:8,left:-12,bottom:0}}><CartesianGrid stroke="#26303d" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="metodo" stroke="#8995a4" tick={{fontSize:11}} axisLine={false} tickLine={false}/><YAxis stroke="#697586" tick={{fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(value)=>compact(Number(value))}/><Tooltip contentStyle={{background:'#0d1117',border:'1px solid #30363d',borderRadius:12}} formatter={(value:number)=>money(Number(value))}/><Bar dataKey="monto" fill="#8b5cf6" radius={[7,7,0,0]}/></BarChart></ResponsiveContainer>:<Empty text="Todavía no hay pagos registrados para comparar medios."/>}</div></article>
    </div>

    {!branchId&&analytics.branchPerformance.length?<article className={`${panel} p-5 sm:p-6`}><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Multirrama</p><h3 className="mt-1 text-xl font-black text-white">Rendimiento financiero por rama</h3><p className="mt-1 text-xs text-[#8995a4]">Recaudación asociada a cobros de cada rama versus egresos imputados a ella.</p></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-[10px] uppercase tracking-wide text-[#697586]"><tr><th className="pb-3">Rama</th><th className="pb-3 text-right">Recaudado</th><th className="pb-3 text-right">Pendiente</th><th className="pb-3 text-right">Egresos</th><th className="pb-3 text-right">Balance</th></tr></thead><tbody>{analytics.branchPerformance.map((item)=><tr key={item.id} className="border-t border-white/10"><td className="py-3 font-black text-white">{item.nombre}</td><td className="py-3 text-right text-emerald-300">{money(item.recaudado)}</td><td className="py-3 text-right text-amber-300">{money(item.pendiente)}</td><td className="py-3 text-right text-red-300">{money(item.egresos)}</td><td className={`py-3 text-right font-black ${item.balance>=0?'text-[#70e4df]':'text-red-300'}`}>{money(item.balance)}</td></tr>)}</tbody></table></div></article>:null}

    <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
      <article className={`${panel} p-5 sm:p-6`}><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-amber-300">Cobranza prioritaria</p><h3 className="mt-1 text-xl font-black text-white">Mayores saldos pendientes</h3></div><ExclamationTriangleIcon className="h-7 w-7 text-amber-300"/></div><div className="mt-4 space-y-2">{analytics.debtors.map((item,index)=><div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-xs font-black text-amber-300">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{item.nombre}</p><p className="truncate text-xs text-[#697586]">{item.tutores?.nombre_completo||'Sin apoderado registrado'}</p></div><strong className="text-sm text-amber-300">{money(item.saldoTotalPendiente)}</strong></div>)}{!analytics.debtors.length?<p className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-5 text-center text-sm font-bold text-emerald-300">No hay saldos pendientes en este alcance.</p>:null}</div></article>

      <article className={`${panel} p-5 sm:p-6`}><div className="flex items-center gap-3"><div className="rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-2.5 text-[#70e4df]"><ChartBarIcon className="h-5 w-5"/></div><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Lectura ejecutiva</p><h3 className="text-lg font-black text-white">Señales del período</h3></div></div><div className="mt-4 space-y-3 text-sm leading-6 text-[#9aa6b5]"><p><strong className="text-white">Balance:</strong> {summary?.balanceNeto&&summary.balanceNeto<0?'los egresos acumulados superan la recaudación; conviene revisar costos y cobranza.':'la recaudación cubre los egresos acumulados en el alcance actual.'}</p><p><strong className="text-white">Morosidad:</strong> {Number(summary?.tasaMorosidad||0)>=15?'la tasa requiere seguimiento activo de cobranza.':Number(summary?.tasaMorosidad||0)>0?'existe morosidad, pero se mantiene en un rango acotado.':'no hay alumnos con deuda vencida.'}</p><p><strong className="text-white">Caja:</strong> {analytics.months.length?`el último mes visible registra ${money(analytics.months[analytics.months.length-1]?.ingresos||0)} de ingresos y ${money(analytics.months[analytics.months.length-1]?.egresos||0)} de egresos.`:'sin movimientos mensuales suficientes.'}</p></div></article>
    </div>
  </section>;
}
