import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import FinanceSchoolDashboard from '../components/FinanceSchoolDashboard';
import {
  DIRECTOR_FIELD,
  DirectorPanel,
  DirectorStat,
  DirectorTabButton,
  DirectorTabs,
} from '../components/director/DirectorModule';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Summary = { totalIngresosReales: number; totalPorCobrar: number; totalVencido: number; totalPorVencer: number; totalEgresos: number; balanceNeto: number; totalAlumnos: number; alumnosMorosos: number; tasaMorosidad: number };
type Charge = { id: string; concepto: string; tipo_concepto?: string | null; monto: number; monto_pagado: number; estado: string; fecha_vencimiento?: string | null; rama_id?: string | null };
type Account = { id: string; nombre: string; tutores?: { nombre_completo?: string | null; telefono?: string | null } | null; cobros: Charge[]; saldoTotalPendiente: number; saldoPendiente: number; alDia: boolean };
type Payment = { id: string; monto: number; metodo_pago?: string | null; fecha_pago?: string | null; cobro?: { concepto?: string | null } | null; jugador?: { nombre?: string | null } | null };
type Expense = { id: string; concepto: string; categoria_gasto?: string | null; centro_costo?: string | null; monto: number; metodo_pago?: string | null; fecha_gasto?: string | null; rama_id?: string | null };
type FlowRow = { id: string; tipo: 'Ingreso' | 'Egreso'; concepto: string; monto: number; fecha?: string | null; metodo?: string | null; categoria?: string | null };
type Tab = 'dashboard' | 'cuentas' | 'pagos' | 'egresos' | 'flujo';

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]';

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
    ['dashboard', 'Resumen'], ['cuentas', 'Cuentas'], ['pagos', 'Pagos'], ['egresos', 'Egresos'], ['flujo', 'Flujo'],
  ];

  return <div className="mx-auto max-w-7xl space-y-4 pb-16">
    <DirectorPanel className="border-amber-200 bg-amber-50/30 p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-800">Modo compatible</p>
          <p className="mt-1 text-sm leading-6 text-[#596456]">La información financiera sigue disponible. Las funciones avanzadas de cobranza se habilitan automáticamente cuando el backend está disponible.</p>
        </div>
        <label><span className={labelClass}>Alcance financiero</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Vista consolidada · toda la academia</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}</select></label>
      </div>
    </DirectorPanel>

    {loading ? <DirectorPanel className="p-10 text-center text-sm font-bold text-[#697468]">Cargando estado financiero…</DirectorPanel> : <>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <DirectorStat label="Recaudado" value={<span className="text-emerald-700">{money(summary?.totalIngresosReales || 0)}</span>} detail="Ingresos reales" />
        <DirectorStat label="Por cobrar" value={<span className="text-amber-700">{money(summary?.totalPorCobrar || 0)}</span>} detail="Saldo pendiente" />
        <DirectorStat label="Egresos" value={<span className="text-rose-700">{money(summary?.totalEgresos || 0)}</span>} detail="Salidas registradas" />
        <DirectorStat label={branch ? `Balance · ${branch.nombre}` : 'Balance consolidado'} value={<span className={(summary?.balanceNeto || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(summary?.balanceNeto || 0)}</span>} detail="Ingresos menos egresos" />
      </section>

      <section className="grid grid-cols-3 gap-2">
        <MiniFact label="Alumnos" value={summary?.totalAlumnos || 0} />
        <MiniFact label="Con deuda vencida" value={summary?.alumnosMorosos || 0} tone="danger" />
        <MiniFact label="Morosidad" value={`${summary?.tasaMorosidad || 0}%`} tone="pending" />
      </section>

      <div className="overflow-x-auto pb-1"><DirectorTabs className="grid-cols-5">{tabs.map(([key, label]) => <DirectorTabButton key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>{label}</DirectorTabButton>)}</DirectorTabs></div>

      {activeTab === 'dashboard' ? <FinanceSchoolDashboard summary={summary} accounts={accounts} payments={payments} expenses={expenses} flow={flow} branches={branches} branchId={branchId} /> : null}

      {activeTab === 'cuentas' ? <section className="space-y-3">
        <DirectorPanel className="flex flex-col gap-3 p-3 sm:flex-row sm:items-end sm:justify-between sm:p-4"><label className="w-full sm:max-w-md"><span className={labelClass}>Buscar cuenta</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Alumno o apoderado" className={DIRECTOR_FIELD} /></label><span className="pb-3 text-xs font-semibold text-[#697468]">{filteredAccounts.length} alumnos</span></DirectorPanel>
        <div className="grid gap-3 lg:grid-cols-2">{filteredAccounts.map((account) => <DirectorPanel key={account.id} className="p-4"><div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-[#111711]">{account.nombre}</h2><p className="mt-1 text-xs text-[#697468]">{account.tutores?.nombre_completo || 'Sin apoderado'}</p></div><div className="text-right"><p className="text-[9px] font-black uppercase tracking-[.08em] text-[#748073]">Saldo pendiente</p><p className={`text-lg font-black ${Number(account.saldoTotalPendiente || 0) > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{money(account.saldoTotalPendiente || 0)}</p></div></div><div className="mt-3 grid gap-1.5">{(account.cobros || []).filter((charge) => charge.estado !== 'Anulado').slice(0, 8).map((charge) => <div key={charge.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e0e5dd] bg-[#fafbf9] p-3"><div><p className="text-sm font-bold text-[#111711]">{charge.concepto}</p><p className="text-[11px] text-[#697468]">{charge.fecha_vencimiento || 'Sin vencimiento'} · {charge.estado}</p></div><p className="text-sm font-black text-[#596456]">{money(Math.max(Number(charge.monto || 0) - Number(charge.monto_pagado || 0), 0))}</p></div>)}</div></DirectorPanel>)}</div>
        {!filteredAccounts.length ? <DirectorPanel className="p-8 text-center text-sm font-semibold text-[#697468]">No hay cuentas que coincidan con la búsqueda.</DirectorPanel> : null}
      </section> : null}

      {activeTab === 'pagos' ? <LegacyTable title="Pagos registrados" headers={['Fecha', 'Alumno', 'Concepto', 'Método', 'Monto']} empty={!payments.length}>{payments.map((item) => <tr key={item.id} className="hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha_pago ? new Date(item.fecha_pago).toLocaleDateString('es-CL') : '—'}</td><td className="px-4 py-3 font-bold text-[#111711]">{item.jugador?.nombre || 'General'}</td><td className="px-4 py-3 text-[#596456]">{item.cobro?.concepto || 'Pago'}</td><td className="px-4 py-3 text-[#697468]">{item.metodo_pago || '—'}</td><td className="px-4 py-3 text-right font-black text-emerald-700">+ {money(item.monto)}</td></tr>)}</LegacyTable> : null}

      {activeTab === 'egresos' ? <LegacyTable title="Egresos" headers={['Fecha', 'Concepto', 'Categoría', 'Centro de costo', 'Monto']} empty={!expenses.length}>{expenses.map((item) => <tr key={item.id} className="hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha_gasto || '—'}</td><td className="px-4 py-3 font-bold text-[#111711]">{item.concepto}</td><td className="px-4 py-3 text-[#697468]">{item.categoria_gasto || 'Otros'}</td><td className="px-4 py-3 text-[#697468]">{item.centro_costo || 'General'}</td><td className="px-4 py-3 text-right font-black text-rose-700">− {money(item.monto)}</td></tr>)}</LegacyTable> : null}

      {activeTab === 'flujo' ? <LegacyTable title="Flujo de caja" headers={['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto']} empty={!flow.length}>{flow.map((item) => <tr key={`${item.tipo}-${item.id}`} className="hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : '—'}</td><td className={`px-4 py-3 font-black ${item.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.tipo}</td><td className="px-4 py-3 font-semibold text-[#111711]">{item.concepto}</td><td className="px-4 py-3 text-[#697468]">{item.metodo || '—'}</td><td className={`px-4 py-3 text-right font-black ${item.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.tipo === 'Ingreso' ? '+' : '−'} {money(item.monto)}</td></tr>)}</LegacyTable> : null}
    </>}
  </div>;
}

function MiniFact({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'danger' | 'pending' }) {
  const valueClass = tone === 'danger' ? 'text-rose-700' : tone === 'pending' ? 'text-amber-700' : 'text-[#111711]';
  return <div className="rounded-xl border border-[#e0e5dd] bg-[#fafbf9] px-3 py-2.5 text-center"><p className="text-[9px] font-black uppercase tracking-[.08em] text-[#748073]">{label}</p><p className={`mt-1 text-base font-black ${valueClass}`}>{value}</p></div>;
}

function LegacyTable({ title, headers, empty, children }: { title: string; headers: string[]; empty: boolean; children: React.ReactNode }) {
  return <DirectorPanel className="overflow-hidden"><header className="border-b border-[#e2e7df] p-4 sm:p-5"><h2 className="text-lg font-black text-[#111711]">{title}</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-[#e1e6de] bg-[#f7f9f5] text-[10px] uppercase tracking-wider text-[#697468]"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className={`px-4 py-3 ${index === headers.length - 1 ? 'text-right' : ''}`}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#e6ebe3]">{children}</tbody></table></div>{empty ? <div className="p-8 text-center text-sm font-semibold text-[#697468]">Sin registros.</div> : null}</DirectorPanel>;
}
