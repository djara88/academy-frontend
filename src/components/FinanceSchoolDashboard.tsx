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
const shortDate=(value?:string|null)=>value?new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString('es-CL',{day:'2-digit',month:'short'}):'Sin fecha';

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
      .slice(0,7);

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
  const overdue=Number(summary?.totalVencido)||0;
  const dueSoon=Number(summary?.totalPorVencer)||0;
  const balance=Number(summary?.balanceNeto)||0;
  const collectionBase=collected+pending;
  const collectionRate=collectionBase?collected/collectionBase*100:0;
  const hasTrend=analytics.months.some((item)=>item.ingresos||item.egresos);
  const attentionCount=analytics.debtors.length;

  return <section className="academy-finance-desk" aria-labelledby="academy-finance-desk-title">
    <section className="finance-desk-command">
      <div className="finance-desk-command-inner">
        <div>
          <p className="finance-desk-kicker">Academy Finance Desk</p>
          <h2 id="academy-finance-desk-title">Caja y cobranza de hoy</h2>
          <p className="finance-desk-command-copy">{selectedBranch?`Operación financiera de ${selectedBranch.nombre}.`:'Vista consolidada de la academia.'} Prioriza deuda vencida, pagos por validar y movimientos que requieren una decisión; las cifras históricas quedan como contexto.</p>
        </div>
        <div className="finance-desk-balance">
          <span>Balance del alcance</span>
          <strong>{money(balance)}</strong>
          <small>{balance>=0?'Caja positiva después de egresos registrados':'Los egresos superan los ingresos validados en este alcance'}</small>
        </div>
      </div>
      <div className="finance-desk-rail">
        <div><span>Recaudado</span><strong className="is-success">{money(collected)}</strong></div>
        <div><span>Vencido</span><strong className={overdue?'is-danger':''}>{money(overdue)}</strong></div>
        <div><span>Por vencer</span><strong className={dueSoon?'is-warning':''}>{money(dueSoon)}</strong></div>
        <div><span>Tasa de recaudación</span><strong>{pct(collectionRate)}</strong></div>
      </div>
    </section>

    <div className="finance-desk-grid">
      <section className="finance-desk-section is-attention" aria-labelledby="finance-attention-title">
        <header>
          <p>Requiere atención · {attentionCount}</p>
          <h3 id="finance-attention-title">Familias con mayor deuda</h3>
        </header>
        <div>
          {analytics.debtors.map((item,index)=><div key={item.id} className="finance-debtor-row">
            <span className="finance-row-index">{String(index+1).padStart(2,'0')}</span>
            <span className="finance-row-copy"><strong>{item.nombre}</strong><small>{item.tutores?.nombre_completo||'Sin apoderado asociado'}</small></span>
            <strong className="finance-row-value is-danger">{money(item.saldoTotalPendiente)}</strong>
          </div>)}
          {!analytics.debtors.length?<div className="finance-desk-empty">No hay deuda pendiente en el alcance actual.</div>:null}
        </div>
      </section>

      <section className="finance-desk-section is-activity" aria-labelledby="finance-activity-title">
        <header>
          <p>Movimiento reciente</p>
          <h3 id="finance-activity-title">Qué cambió en caja</h3>
        </header>
        <div>
          {analytics.recentFlow.map((item)=><div key={item.id} className="finance-flow-row">
            <span className="finance-row-copy"><strong>{item.tipo}</strong><small>{shortDate(item.fecha)}</small></span>
            <strong className={`finance-row-value ${item.tipo==='Ingreso'?'is-success':'is-danger'}`}>{item.tipo==='Ingreso'?'+':'−'} {money(item.monto)}</strong>
          </div>)}
          {!analytics.recentFlow.length?<div className="finance-desk-empty">No hay movimientos recientes.</div>:null}
        </div>
      </section>
    </div>

    {!branchId&&analytics.branchPerformance.length?<section className="finance-desk-section" aria-labelledby="finance-branches-title">
      <header><p>Contexto deportivo</p><h3 id="finance-branches-title">Caja por rama</h3></header>
      <div>{analytics.branchPerformance.slice(0,7).map((item)=><div key={item.id} className="finance-branch-row"><span className="finance-row-copy"><strong>{item.nombre}</strong><small>Recaudado {money(item.recaudado)} · pendiente {money(item.pendiente)} · egresos {money(item.egresos)}</small></span><strong className={`finance-row-value ${item.balance>=0?'is-success':'is-danger'}`}>{money(item.balance)}</strong></div>)}</div>
    </section>:null}

    <section className="finance-desk-trend" aria-labelledby="finance-trend-title">
      <header>
        <div><h3 id="finance-trend-title">Ritmo de caja · 12 meses</h3><p>La tendencia apoya decisiones; no reemplaza la bandeja de acciones de hoy.</p></div>
        <span className="finance-desk-rate">Recaudación {pct(collectionRate)}</span>
      </header>
      <div className="finance-desk-chart">
        {hasTrend?(
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.months} margin={{top:8,right:8,left:-14,bottom:0}}>
              <CartesianGrid stroke="var(--ls-line)" strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="mes" stroke="var(--ls-muted)" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis stroke="var(--ls-muted)" tick={{fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(value)=>compact(Number(value))}/>
              <Tooltip contentStyle={{background:'var(--ls-surface)',border:'1px solid var(--ls-line)',borderRadius:12,color:'var(--ls-ink)'}} formatter={(value:number,name:string)=>[money(Number(value)),name==='ingresos'?'Ingresos':name==='egresos'?'Egresos':'Balance']}/>
              <Line type="monotone" dataKey="ingresos" stroke="var(--ls-success)" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="egresos" stroke="var(--ls-danger)" strokeWidth={3} dot={false}/>
              <Line type="monotone" dataKey="balance" stroke="var(--ls-accent-text)" strokeWidth={2} strokeDasharray="5 4" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        ):<div className="finance-desk-empty">Aún no hay movimientos suficientes para dibujar la evolución mensual.</div>}
      </div>
    </section>
  </section>;
}
