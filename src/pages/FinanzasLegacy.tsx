import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import FinanceSchoolDashboard from '../components/FinanceSchoolDashboard';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Summary = { totalIngresosReales: number; totalPorCobrar: number; totalVencido: number; totalPorVencer: number; totalEgresos: number; balanceNeto: number; totalAlumnos: number; alumnosMorosos: number; tasaMorosidad: number };
type Charge = { id: string; concepto: string; tipo_concepto?: string | null; monto: number; monto_pagado: number; estado: string; fecha_vencimiento?: string | null };
type Account = { id: string; nombre: string; tutores?: { nombre_completo?: string | null; telefono?: string | null } | null; cobros?: Charge[]; saldoTotalPendiente?: number; saldoPendiente?: number };
type Payment = { id: string; monto: number; metodo_pago?: string | null; fecha_pago?: string | null; cobro?: { concepto?: string | null } | null; jugador?: { nombre?: string | null } | null };
type Expense = { id: string; concepto: string; categoria_gasto?: string | null; centro_costo?: string | null; monto: number; metodo_pago?: string | null; fecha_gasto?: string | null };
type FlowRow = { id: string; tipo: 'Ingreso' | 'Egreso'; concepto: string; monto: number; fecha?: string | null; metodo?: string | null; categoria?: string | null };
type Tab = 'dashboard' | 'cuentas' | 'pagos' | 'egresos' | 'flujo';

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;

export default function FinanzasLegacy() {
  const { notify } = useAcademyMessages();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [flow, setFlow] = useState<FlowRow[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => branchId ? { rama_id: branchId } : undefined, [branchId]);
  const branch = branches.find((item) => item.id === branchId) || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [primaryResponse, summaryResponse, accountsResponse, paymentsResponse, expensesResponse, flowResponse] = await Promise.all([
        api.get('/api/academias/rama-principal'),
        api.get('/api/finanzas/resumen', { params }),
        api.get('/api/finanzas/cuentas-corrientes', { params }),
        api.get('/api/finanzas/pagos', { params }),
        api.get('/api/finanzas/egresos', { params }),
        api.get('/api/finanzas/flujo-caja', { params }),
      ]);
      setBranches(primaryResponse.data.data?.ramas || []);
      setSummary(summaryResponse.data.data || null);
      setAccounts(accountsResponse.data.data || []);
      setPayments(paymentsResponse.data.data || []);
      setExpenses(expensesResponse.data.data || []);
      setFlow(flowResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar Finanzas.');
    } finally {
      setLoading(false);
    }
  }, [params, notify]);

  useEffect(() => { void load(); }, [load]);

  const filteredAccounts = accounts.filter((account) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return account.nombre.toLowerCase().includes(q) || String(account.tutores?.nombre_completo || '').toLowerCase().includes(q);
  });

  const tabs: Array<[Tab, string]> = [
    ['dashboard', 'Dashboard'], ['cuentas', 'Cuentas'], ['pagos', 'Pagos'], ['egresos', 'Egresos'], ['flujo', 'Flujo'],
  ];

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-amber-400/20 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,.12),transparent_38%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Finanzas · modo compatible</p>
          <h1 className="mt-2 text-3xl font-black text-white">Finanzas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa6b5]">La información financiera sigue disponible. Las funciones avanzadas de Cobranza 2.0 se habilitarán automáticamente cuando el backend termine de actualizarse.</p>
        </div>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={`${field} lg:max-w-md`}>
          <option value="">Vista consolidada · toda la academia</option>
          {branches.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}
        </select>
      </div>
    </section>

    {loading ? <div className={`${panel} p-10 text-center text-emerald-300`}>Cargando estado financiero...</div> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Recaudado</p><p className="mt-1 text-2xl font-black text-emerald-300">{money(summary?.totalIngresosReales || 0)}</p></div>
        <div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Por cobrar</p><p className="mt-1 text-2xl font-black text-amber-300">{money(summary?.totalPorCobrar || 0)}</p></div>
        <div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Egresos</p><p className="mt-1 text-2xl font-black text-red-300">{money(summary?.totalEgresos || 0)}</p></div>
        <div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Balance {branch ? `· ${branch.nombre}` : 'consolidado'}</p><p className={`mt-1 text-2xl font-black ${(summary?.balanceNeto || 0) >= 0 ? 'text-[#70e4df]' : 'text-red-300'}`}>{money(summary?.balanceNeto || 0)}</p></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Alumnos</p><p className="mt-1 text-xl font-black text-white">{summary?.totalAlumnos || 0}</p></div>
        <div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Con deuda vencida</p><p className="mt-1 text-xl font-black text-red-300">{summary?.alumnosMorosos || 0}</p></div>
        <div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Morosidad</p><p className="mt-1 text-xl font-black text-amber-300">{summary?.tasaMorosidad || 0}%</p></div>
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1117]"><div className="flex min-w-max">{tabs.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`px-5 py-3 text-sm font-black ${activeTab === key ? 'bg-[#289E9D] text-white' : 'text-[#8995a4]'}`}>{label}</button>)}</div></div>

      {activeTab === 'dashboard' ? <FinanceSchoolDashboard summary={summary} accounts={accounts} payments={payments} expenses={expenses} flow={flow} branches={branches} branchId={branchId} /> : null}

      {activeTab === 'cuentas' ? <section className="space-y-4">
        <div className={`${panel} flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between`}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar alumno o apoderado" className={`${field} sm:max-w-md`} /><span className="text-xs text-[#8995a4]">{filteredAccounts.length} alumnos</span></div>
        <div className="grid gap-3 lg:grid-cols-2">{filteredAccounts.map((account) => <article key={account.id} className={`${panel} p-5`}><div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-white">{account.nombre}</h2><p className="mt-1 text-xs text-[#8995a4]">{account.tutores?.nombre_completo || 'Sin apoderado'}</p></div><div className="text-right"><p className="text-[10px] uppercase text-[#697586]">Saldo pendiente</p><p className={`text-lg font-black ${Number(account.saldoTotalPendiente || 0) > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>{money(account.saldoTotalPendiente || 0)}</p></div></div><div className="mt-4 space-y-2">{(account.cobros || []).filter((charge) => charge.estado !== 'Anulado').slice(0, 8).map((charge) => <div key={charge.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3"><div><p className="text-sm font-bold text-white">{charge.concepto}</p><p className="text-[11px] text-[#697586]">{charge.fecha_vencimiento || 'Sin vencimiento'} · {charge.estado}</p></div><p className="text-sm font-black text-[#b6c0cc]">{money(Math.max(Number(charge.monto || 0) - Number(charge.monto_pagado || 0), 0))}</p></div>)}</div></article>)}</div>
      </section> : null}

      {activeTab === 'pagos' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Pagos registrados</h2></div><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-white/10">{payments.map((item) => <tr key={item.id}><td className="px-4 py-3 text-[#8995a4]">{item.fecha_pago ? new Date(item.fecha_pago).toLocaleDateString('es-CL') : '—'}</td><td className="px-4 py-3 font-bold text-white">{item.jugador?.nombre || 'General'}</td><td className="px-4 py-3 text-[#b6c0cc]">{item.cobro?.concepto || 'Pago'}</td><td className="px-4 py-3 text-[#8995a4]">{item.metodo_pago || '—'}</td><td className="px-4 py-3 text-right font-black text-emerald-300">{money(item.monto)}</td></tr>)}</tbody></table></div></section> : null}

      {activeTab === 'egresos' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Egresos</h2></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Centro de costo</th><th className="px-4 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-white/10">{expenses.map((item) => <tr key={item.id}><td className="px-4 py-3 text-[#8995a4]">{item.fecha_gasto || '—'}</td><td className="px-4 py-3 font-bold text-white">{item.concepto}</td><td className="px-4 py-3 text-[#8995a4]">{item.categoria_gasto || 'Otros'}</td><td className="px-4 py-3 text-[#8995a4]">{item.centro_costo || 'General'}</td><td className="px-4 py-3 text-right font-black text-red-300">{money(item.monto)}</td></tr>)}</tbody></table></div></section> : null}

      {activeTab === 'flujo' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Flujo de caja</h2></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-white/10">{flow.map((item) => <tr key={`${item.tipo}-${item.id}`}><td className="px-4 py-3 text-[#8995a4]">{item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : '—'}</td><td className={`px-4 py-3 font-black ${item.tipo === 'Ingreso' ? 'text-emerald-300' : 'text-red-300'}`}>{item.tipo}</td><td className="px-4 py-3 text-white">{item.concepto}</td><td className="px-4 py-3 text-[#8995a4]">{item.metodo || '—'}</td><td className={`px-4 py-3 text-right font-black ${item.tipo === 'Ingreso' ? 'text-emerald-300' : 'text-red-300'}`}>{item.tipo === 'Ingreso' ? '+' : '-'}{money(item.monto)}</td></tr>)}</tbody></table></div></section> : null}
    </>}
  </div>;
}
