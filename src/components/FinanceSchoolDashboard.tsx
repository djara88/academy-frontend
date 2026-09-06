import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DirectorPanel } from './director/DirectorModule';

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

const money=(value:number)=>`$${Math.round(Number(value)||0).toLocaleString('es-CL')}`;
const compact=(value:number)=>new Intl.NumberFormat('es-CL',{notation:'compact',maximumFractionDigits:1}).format(Number(value)||0);
const pct=(value:number)=>`${Number(value||0).toLocaleString('es-CL',{maximumFractionDigits:1})}%`;
const monthKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
const monthLabel=(date:Date)=>new Intl.DateTimeFormat('es-CL',{month:'short'}).format(date).replace('.','');

export default function FinanceSchoolDashboard({summary,accounts,expenses,flow,branches,branchId}:Props){
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
      const bucket=monthMap.get(String(row.fecha).slice(0,7));
      if(!bucket)return;
      if(row.tipo==='Ingreso')bucket.ingresos+=Number(row.monto)||0;
      else bucket.egresos+=Number(row.monto)||0;
      bucket.balance=bucket.ingresos-bucket.egresos;
    });

    const debtors=accounts
      .filter((item)=>Number(item.saldoTotalPendiente)>0)
      .sort((a,b)=>Number(b.saldoTotalPendiente)-Number(a.saldoTotalPendiente))
      .slice(0,6);

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
    const branchPerformance=[...branchMap.values()]
      .map((item)=>({...item,balance:item.recaudado-item.egresos}))
      .filter((item)=>item.recaudado||item.pendiente||item.egresos)
      .sort((a,b)=>b.recaudado-a.recaudado);

    const recentFlow=[...flow]
      .sort((a,b)=>String(b.fecha||'').localeCompare(String(a.fecha||'')))
      .slice(0,8);

    return {months,debtors,branchPerformance,recentFlow};
  },[accounts,branches,expenses,flow]);

  const collected=Number(summary?.totalIngresosReales)||0;
  const pending=Number(summary?.totalPorCobrar)||0;
  const collectionBase=collected+pending;
  const collectionRate=collectionBase?collected/collectionBase*100:0;
  const hasTrend=analytics.months.some((item)=>item.ingresos||item.egresos);

  return <section className="space-y-4">
    <DirectorPanel className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#6d8700]">Tendencia de caja</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">Últimos 12 meses{selectedBranch?` · ${selectedBranch.nombre}`:''}</h2>
          <p className="mt-1 text-sm text-[#697468]">Ingresos, egresos y balance real. El filtro de rama superior define el alcance.</p>
        </div>
        <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-black ${collectionRate>=80?'border-emerald-200 bg-emerald-50 text-emerald-800':collectionRate>=60?'border-amber-200 bg-amber-50 text-amber-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>Recaudación {pct(collectionRate)}</span>
      </div>

      <div className="mt-4 h-[260px]">
        {hasTrend?(
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.months} margin={{top:8,right:8,left:-14,bottom:0}}>
              <CartesianGrid stroke="#e2e7df" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="mes" stroke="#7a8478" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis stroke="#7a8478" tick={{fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(value)=>compact(Number(value))}/>
              <Tooltip contentStyle={{background:'#ffffff',border:'1px solid #d9e0d6',borderRadius:12,color:'#111711'}} formatter={(value:number,name:string)=>[money(Number(value)),name==='ingresos'?'Ingresos':name==='egresos'?'Egresos':'Balance']}/>
              <Line type="monotone" dataKey="ingresos" stroke="#16a34a" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="egresos" stroke="#dc2626" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="balance" stroke="#6d8700" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ):<Empty text="Aún no hay movimientos suficientes para dibujar la evolución mensual."/>}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] font-bold text-[#697468]"><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-600"/>Ingresos</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-red-600"/>Egresos</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6d8700]"/>Balance</span></div>
    </DirectorPanel>

    <div className="grid gap-4 xl:grid-cols-2">
      <DirectorPanel className="overflow-hidden">
        <header className="border-b border-[#e2e7df] p-4 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#9f1239]">Requiere atención</p>
          <h3 className="mt-1 text-lg font-black text-[#111711]">Mayor deuda pendiente</h3>
          <p className="mt-1 text-xs text-[#697468]">Familias con mayor saldo en el alcance actual.</p>
        </header>
        <div className="grid gap-1.5 p-3">
          {analytics.debtors.map((item,index)=><div key={item.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-[#e0e5dd] bg-[#fafbf9] px-3 py-2.5"><span className="text-center text-[10px] font-black text-[#7a8478]">{index+1}</span><div className="min-w-0"><p className="truncate text-sm font-black text-[#111711]">{item.nombre}</p><p className="truncate text-[11px] text-[#697468]">{item.tutores?.nombre_completo||'Sin apoderado asociado'}</p></div><strong className="text-sm font-black text-rose-700">{money(item.saldoTotalPendiente)}</strong></div>)}
          {!analytics.debtors.length?<Empty text="No hay deuda pendiente en el alcance actual." compact/>:null}
        </div>
      </DirectorPanel>

      {!branchId?(
        <DirectorPanel className="overflow-hidden">
          <header className="border-b border-[#e2e7df] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#6d8700]">Comparación</p>
            <h3 className="mt-1 text-lg font-black text-[#111711]">Rendimiento por rama</h3>
            <p className="mt-1 text-xs text-[#697468]">Recaudado, pendiente y balance por unidad deportiva.</p>
          </header>
          <div className="grid gap-1.5 p-3">
            {analytics.branchPerformance.slice(0,7).map((item)=><div key={item.id} className="rounded-xl border border-[#e0e5dd] bg-[#fafbf9] p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-black text-[#111711]">{item.nombre}</p><strong className={`text-sm font-black ${item.balance>=0?'text-emerald-700':'text-rose-700'}`}>{money(item.balance)}</strong></div><div className="mt-2 grid grid-cols-3 gap-2 text-[10px]"><span className="text-[#697468]">Recaudado <strong className="block text-emerald-700">{money(item.recaudado)}</strong></span><span className="text-[#697468]">Pendiente <strong className="block text-amber-700">{money(item.pendiente)}</strong></span><span className="text-[#697468]">Egresos <strong className="block text-rose-700">{money(item.egresos)}</strong></span></div></div>)}
            {!analytics.branchPerformance.length?<Empty text="Aún no hay actividad financiera por rama." compact/>:null}
          </div>
        </DirectorPanel>
      ):(
        <DirectorPanel className="overflow-hidden">
          <header className="border-b border-[#e2e7df] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#6d8700]">Actividad reciente</p>
            <h3 className="mt-1 text-lg font-black text-[#111711]">Últimos movimientos</h3>
          </header>
          <div className="grid gap-1.5 p-3">
            {analytics.recentFlow.map((item)=><div key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#e0e5dd] bg-[#fafbf9] px-3 py-2.5"><div><p className="text-sm font-black text-[#111711]">{item.tipo}</p><p className="text-[11px] text-[#697468]">{item.fecha?new Date(`${String(item.fecha).slice(0,10)}T12:00:00`).toLocaleDateString('es-CL'):'Sin fecha'}</p></div><strong className={`text-sm font-black ${item.tipo==='Ingreso'?'text-emerald-700':'text-rose-700'}`}>{item.tipo==='Ingreso'?'+':'−'} {money(item.monto)}</strong></div>)}
            {!analytics.recentFlow.length?<Empty text="No hay movimientos recientes." compact/>:null}
          </div>
        </DirectorPanel>
      )}
    </div>
  </section>;
}

function Empty({text,compact=false}:{text:string;compact?:boolean}){
  return <div className={`grid place-items-center rounded-xl border border-dashed border-[#cfd7cc] bg-[#fafbf9] px-5 text-center text-sm font-semibold text-[#697468] ${compact?'min-h-24':'h-[240px]'}`}>{text}</div>;
}
