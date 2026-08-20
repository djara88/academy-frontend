import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import FinanceSchoolDashboard from '../components/FinanceSchoolDashboard';
import CollectionAccountsTable, { type AccountMeta, type CollectionAccount, type FinanceCharge } from '../components/finance/CollectionAccountsTable';
import PaymentValidationPanel, { type ReportedPayment } from '../components/finance/PaymentValidationPanel';
import CollectionAutomationPanel, { type CollectionConfig, type CollectionNotification } from '../components/finance/CollectionAutomationPanel';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Summary = { totalIngresosReales: number; totalPorCobrar: number; totalVencido: number; totalPorVencer: number; totalEgresos: number; balanceNeto: number; totalAlumnos: number; alumnosMorosos: number; tasaMorosidad: number; calendarioMensual?: { configured?: boolean; dueDay?: number; warningDays?: number } };
type Payment = { id: string; monto: number; metodo_pago?: string | null; fecha_pago?: string | null; observaciones?: string | null; cobro?: { concepto?: string | null; tipo_concepto?: string | null } | null; jugador?: { nombre?: string | null } | null };
type Expense = { id: string; concepto: string; categoria_gasto?: string | null; centro_costo?: string | null; monto: number; metodo_pago?: string | null; fecha_gasto?: string | null; rama_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type FlowRow = { id: string; tipo: 'Ingreso' | 'Egreso'; concepto: string; monto: number; fecha?: string | null; metodo?: string | null; categoria?: string | null };
type Tab = 'dashboard' | 'cuentas' | 'validacion' | 'pagos' | 'egresos' | 'flujo' | 'cobranza';

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const emptyMeta: AccountMeta = { page: 1, page_size: 25, total: 0, pages: 0 };

export default function FinanzasMultirama() {
  const { confirmAction, notify } = useAcademyMessages();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [legacyAccounts, setLegacyAccounts] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [flow, setFlow] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [collectionAccounts, setCollectionAccounts] = useState<CollectionAccount[]>([]);
  const [accountMeta, setAccountMeta] = useState<AccountMeta>(emptyMeta);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountSearchInput, setAccountSearchInput] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('todos');
  const [accountPage, setAccountPage] = useState(1);
  const [accountPageSize, setAccountPageSize] = useState(25);
  const [selectedTutorIds, setSelectedTutorIds] = useState<Set<string>>(new Set());

  const [reportedPayments, setReportedPayments] = useState<ReportedPayment[]>([]);
  const [reportedFilter, setReportedFilter] = useState('Pendiente');
  const [reportedLoading, setReportedLoading] = useState(false);
  const [validationBusyId, setValidationBusyId] = useState<string | null>(null);
  const [collectionConfig, setCollectionConfig] = useState<CollectionConfig | null>(null);
  const [notifications, setNotifications] = useState<CollectionNotification[]>([]);
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [collectionSending, setCollectionSending] = useState(false);

  const [chargeModal, setChargeModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [paymentCharge, setPaymentCharge] = useState<FinanceCharge | null>(null);
  const [saving, setSaving] = useState(false);
  const [chargeForm, setChargeForm] = useState({ jugador_id: '', concepto: '', tipo_concepto: 'Otro', monto: '0', fecha_vencimiento: new Date().toISOString().slice(0, 10), observaciones: '' });
  const [expenseForm, setExpenseForm] = useState({ concepto: '', categoria_gasto: 'Otros', centro_costo: '', monto: '0', metodo_pago: 'Transferencia', fecha_gasto: new Date().toISOString().slice(0, 10), observaciones: '' });
  const [paymentForm, setPaymentForm] = useState({ monto_abono: '0', metodo_pago: 'Transferencia', observaciones: '', idempotency_key: '' });

  const params = useMemo(() => branchId ? { rama_id: branchId } : undefined, [branchId]);
  const branch = branches.find((item) => item.id === branchId) || null;
  const pendingValidationCount = reportedFilter === 'Pendiente' ? reportedPayments.length : 0;

  const loadBase = useCallback(async () => {
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
      setLegacyAccounts(accountsResponse.data.data || []);
      setPayments(paymentsResponse.data.data || []);
      setExpenses(expensesResponse.data.data || []);
      setFlow(flowResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar Finanzas.');
    } finally { setLoading(false); }
  }, [params, notify]);

  const loadAccounts = useCallback(async () => {
    setAccountLoading(true);
    try {
      const response = await api.get('/api/finanzas/cobranza/cuentas', { params: {
        ...(branchId ? { rama_id: branchId } : {}), q: accountSearch || undefined, estado: accountStatus, page: accountPage, page_size: accountPageSize,
      } });
      setCollectionAccounts(response.data.data || []);
      setAccountMeta(response.data.meta || { ...emptyMeta, page: accountPage, page_size: accountPageSize });
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar las cuentas corrientes.');
    } finally { setAccountLoading(false); }
  }, [branchId, accountSearch, accountStatus, accountPage, accountPageSize, notify]);

  const loadReported = useCallback(async () => {
    setReportedLoading(true);
    try {
      const response = await api.get('/api/finanzas/cobranza/pagos-informados', { params: { estado: reportedFilter } });
      setReportedPayments(response.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar los pagos informados.');
    } finally { setReportedLoading(false); }
  }, [reportedFilter, notify]);

  const loadCollection = useCallback(async () => {
    try {
      const [configResponse, notificationResponse] = await Promise.all([
        api.get('/api/finanzas/cobranza/configuracion'), api.get('/api/finanzas/cobranza/notificaciones'),
      ]);
      setCollectionConfig(configResponse.data.data || null);
      setNotifications(notificationResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar la configuración de cobranza.');
    }
  }, [notify]);

  useEffect(() => { void loadBase(); void loadReported(); void loadCollection(); }, [loadBase, loadReported, loadCollection]);
  useEffect(() => { void loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    const timer = window.setTimeout(() => { setAccountPage(1); setAccountSearch(accountSearchInput.trim()); }, 350);
    return () => window.clearTimeout(timer);
  }, [accountSearchInput]);
  useEffect(() => { setAccountPage(1); setSelectedTutorIds(new Set()); }, [branchId, accountStatus, accountPageSize]);

  const openCharge = () => {
    if (!branchId) return void notify('Selecciona una rama antes de asignar un cobro manual; así el cargo queda asociado a la inscripción deportiva correcta.');
    setChargeForm({ jugador_id: '', concepto: '', tipo_concepto: 'Otro', monto: '0', fecha_vencimiento: new Date().toISOString().slice(0, 10), observaciones: '' });
    setChargeModal(true);
  };
  const saveCharge = async (event: FormEvent) => {
    event.preventDefault(); if (!branchId) return; setSaving(true);
    try {
      await api.post('/api/finanzas/cobros', { ...chargeForm, rama_id: branchId, monto: Number(chargeForm.monto) || 0 });
      setChargeModal(false); await Promise.all([loadBase(), loadAccounts()]); await notify('Cobro creado en la inscripción deportiva seleccionada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible crear el cobro.'); }
    finally { setSaving(false); }
  };
  const saveExpense = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      await api.post('/api/finanzas/egresos', { ...expenseForm, rama_id: branchId || undefined, monto: Number(expenseForm.monto) || 0, centro_costo: expenseForm.centro_costo || branch?.nombre || 'General' });
      setExpenseModal(false); await loadBase(); await notify(branchId ? 'Egreso registrado en la rama.' : 'Egreso general registrado.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible registrar el egreso.'); }
    finally { setSaving(false); }
  };
  const openPayment = (charge: FinanceCharge) => {
    const pending = Math.max(Number(charge.monto || 0) - Number(charge.monto_pagado || 0), 0);
    setPaymentCharge(charge);
    setPaymentForm({ monto_abono: String(pending), metodo_pago: 'Transferencia', observaciones: '', idempotency_key: `finance-${charge.id}-${Date.now()}` });
  };
  const savePayment = async (event: FormEvent) => {
    event.preventDefault(); if (!paymentCharge) return; setSaving(true);
    try {
      await api.put(`/api/finanzas/cobros/${paymentCharge.id}/pagar`, { ...paymentForm, monto_abono: Number(paymentForm.monto_abono) || 0 });
      setPaymentCharge(null); await Promise.all([loadBase(), loadAccounts(), loadReported()]); await notify('Pago registrado y distribuido sobre las cuotas pendientes.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible registrar el pago.'); }
    finally { setSaving(false); }
  };
  const removeExpense = async (expense: Expense) => {
    const accepted = await confirmAction(`¿Anular el egreso “${expense.concepto}”?`); if (!accepted) return;
    try { await api.delete(`/api/finanzas/egresos/${expense.id}`); await loadBase(); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible anular el egreso.'); }
  };

  const validateReported = async (id: string) => {
    const accepted = await confirmAction('¿Validar esta transferencia? Se registrará inmediatamente como ingreso real y descontará la deuda.');
    if (!accepted) return;
    setValidationBusyId(id);
    try {
      const response = await api.patch(`/api/finanzas/cobranza/pagos-informados/${id}/validar`);
      await Promise.all([loadReported(), loadBase(), loadAccounts()]); await notify(response.data.message || 'Pago validado.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible validar el pago.'); }
    finally { setValidationBusyId(null); }
  };
  const rejectReported = async (id: string, reason: string) => {
    setValidationBusyId(id);
    try {
      const response = await api.patch(`/api/finanzas/cobranza/pagos-informados/${id}/rechazar`, { motivo: reason });
      await loadReported(); await notify(response.data.message || 'Pago rechazado.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible rechazar el pago.'); }
    finally { setValidationBusyId(null); }
  };

  const sendReminders = async (tutorIds: string[], onlyOverdue: boolean, channels: string[] = ['email', 'whatsapp']) => {
    const scope = tutorIds.length ? `${tutorIds.length} apoderado(s) seleccionado(s)` : 'todas las familias con saldo';
    const accepted = await confirmAction(`¿Enviar ${onlyOverdue ? 'recordatorio de deuda vencida' : 'estado de cuenta'} a ${scope} por ${channels.join(' + ')}?`);
    if (!accepted) return;
    setCollectionSending(true);
    try {
      const response = await api.post('/api/finanzas/cobranza/recordatorios', { tutor_ids: tutorIds, solo_vencidos: onlyOverdue, canales: channels });
      setSelectedTutorIds(new Set()); await loadCollection(); await notify(response.data.message || 'Cobranza enviada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible enviar la cobranza.'); }
    finally { setCollectionSending(false); }
  };
  const saveCollectionConfig = async (value: CollectionConfig) => {
    setCollectionSaving(true);
    try {
      const response = await api.patch('/api/finanzas/cobranza/configuracion', value);
      setCollectionConfig(response.data.data || value); await notify(response.data.message || 'Configuración guardada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible guardar la automatización.'); }
    finally { setCollectionSaving(false); }
  };

  const tabs: Array<[Tab, string]> = [['dashboard', 'Dashboard'], ['cuentas', 'Cuentas'], ['validacion', `Por validar${pendingValidationCount ? ` · ${pendingValidationCount}` : ''}`], ['pagos', 'Pagos'], ['egresos', 'Egresos'], ['flujo', 'Flujo'], ['cobranza', 'Cobranza']];

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.14),transparent_38%),#151b25] p-6 sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-emerald-300">ERP financiero y cobranza</p><h1 className="mt-2 text-3xl font-black text-white">Finanzas</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Caja real, cuentas corrientes, cuotas, validación de transferencias y cobranza familiar en un mismo circuito. Los pagos informados nunca afectan caja hasta ser validados.</p></div><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={`${field} lg:max-w-md`}><option value="">Vista consolidada · toda la academia</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}</select></div></section>

    {loading ? <div className={`${panel} p-10 text-center text-emerald-300`}>Cargando estado financiero...</div> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Recaudado</p><p className="mt-1 text-2xl font-black text-emerald-300">{money(summary?.totalIngresosReales || 0)}</p></div><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Por cobrar</p><p className="mt-1 text-2xl font-black text-amber-300">{money(summary?.totalPorCobrar || 0)}</p></div><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Vencido</p><p className="mt-1 text-2xl font-black text-red-300">{money(summary?.totalVencido || 0)}</p></div><div className={`${panel} p-5`}><p className="text-[10px] font-black uppercase text-[#697586]">Balance {branch ? `· ${branch.nombre}` : 'consolidado'}</p><p className={`mt-1 text-2xl font-black ${(summary?.balanceNeto || 0) >= 0 ? 'text-[#70e4df]' : 'text-red-300'}`}>{money(summary?.balanceNeto || 0)}</p></div></section>
      <section className="grid gap-3 sm:grid-cols-4"><div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Alumnos</p><p className="mt-1 text-xl font-black text-white">{summary?.totalAlumnos || 0}</p></div><div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Con mora</p><p className="mt-1 text-xl font-black text-red-300">{summary?.alumnosMorosos || 0}</p></div><div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Morosidad</p><p className="mt-1 text-xl font-black text-amber-300">{summary?.tasaMorosidad || 0}%</p></div><div className={`${panel} p-4 text-center`}><p className="text-[10px] uppercase text-[#697586]">Pagos por revisar</p><p className="mt-1 text-xl font-black text-violet-300">{reportedFilter === 'Pendiente' ? reportedPayments.length : '—'}</p></div></section>

      <div className="flex flex-wrap gap-2"><button onClick={openCharge} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black text-white">+ Cobro {branch ? 'de rama' : 'manual'}</button><button onClick={() => setExpenseModal(true)} className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300">- Registrar egreso</button>{!branchId ? <span className="self-center text-xs text-[#697586]">Para crear un cobro manual selecciona una rama; los egresos sí pueden ser generales.</span> : null}</div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1117]"><div className="flex min-w-max">{tabs.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`px-4 py-3 text-sm font-black ${activeTab === key ? 'bg-[#289E9D] text-white' : 'text-[#8995a4]'}`}>{label}</button>)}</div></div>

      {activeTab === 'dashboard' ? <FinanceSchoolDashboard summary={summary} accounts={legacyAccounts} payments={payments} expenses={expenses} flow={flow} branches={branches} branchId={branchId} /> : null}
      {activeTab === 'cuentas' ? <CollectionAccountsTable accounts={collectionAccounts} meta={accountMeta} loading={accountLoading} search={accountSearchInput} status={accountStatus} pageSize={accountPageSize} selectedTutorIds={selectedTutorIds} onSearch={setAccountSearchInput} onStatus={(value) => { setAccountStatus(value); setAccountPage(1); }} onPage={setAccountPage} onPageSize={(value) => { setAccountPageSize(value); setAccountPage(1); }} onSelection={setSelectedTutorIds} onPayment={openPayment} onReminder={(ids, overdue) => void sendReminders(ids, overdue)} /> : null}
      {activeTab === 'validacion' ? <PaymentValidationPanel rows={reportedPayments} filter={reportedFilter} loading={reportedLoading} busyId={validationBusyId} onFilter={setReportedFilter} onValidate={(id) => void validateReported(id)} onReject={(id, reason) => void rejectReported(id, reason)} /> : null}

      {activeTab === 'pagos' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Pagos registrados</h2><p className="text-xs text-[#8995a4]">Solo aparecen movimientos contables ya validados.</p></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Alumno</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-white/10">{payments.map((item) => <tr key={item.id}><td className="px-4 py-3 text-[#8995a4]">{item.fecha_pago ? new Date(item.fecha_pago).toLocaleDateString('es-CL') : '—'}</td><td className="px-4 py-3 font-bold text-white">{item.jugador?.nombre || 'General'}</td><td className="px-4 py-3 text-[#b6c0cc]">{item.cobro?.concepto || 'Pago'}</td><td className="px-4 py-3 text-[#8995a4]">{item.metodo_pago || '—'}</td><td className="px-4 py-3 text-right font-black text-emerald-300">{money(item.monto)}</td></tr>)}</tbody></table></div>{!payments.length ? <div className="p-8 text-center text-[#697586]">No hay pagos registrados.</div> : null}</section> : null}

      {activeTab === 'egresos' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Egresos</h2></div><div className="overflow-x-auto"><table className="min-w-[800px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Centro de costo</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3"></th></tr></thead><tbody className="divide-y divide-white/10">{expenses.map((item) => <tr key={item.id}><td className="px-4 py-3 text-[#8995a4]">{item.fecha_gasto || '—'}</td><td className="px-4 py-3 font-bold text-white">{item.concepto}</td><td className="px-4 py-3 text-[#8995a4]">{item.categoria_gasto || 'Otros'}</td><td className="px-4 py-3 text-[#8995a4]">{item.centro_costo || item.ramas?.nombre || 'General'}</td><td className="px-4 py-3 text-right font-black text-red-300">{money(item.monto)}</td><td className="px-4 py-3 text-right"><button onClick={() => void removeExpense(item)} className="rounded-lg border border-red-400/20 px-2.5 py-1.5 text-xs font-black text-red-300">Anular</button></td></tr>)}</tbody></table></div></section> : null}

      {activeTab === 'flujo' ? <section className={`${panel} overflow-hidden`}><div className="border-b border-white/10 p-5"><h2 className="text-xl font-black text-white">Flujo de caja</h2><p className="text-xs text-[#8995a4]">Ingresos validados menos egresos vigentes.</p></div><div className="overflow-x-auto"><table className="min-w-[780px] w-full text-left text-sm"><thead className="bg-[#0d1117] text-[10px] uppercase text-[#697586]"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Método</th><th className="px-4 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-white/10">{flow.map((item) => <tr key={`${item.tipo}-${item.id}`}><td className="px-4 py-3 text-[#8995a4]">{item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : '—'}</td><td className={`px-4 py-3 font-black ${item.tipo === 'Ingreso' ? 'text-emerald-300' : 'text-red-300'}`}>{item.tipo}</td><td className="px-4 py-3 text-white">{item.concepto}</td><td className="px-4 py-3 text-[#8995a4]">{item.metodo || '—'}</td><td className={`px-4 py-3 text-right font-black ${item.tipo === 'Ingreso' ? 'text-emerald-300' : 'text-red-300'}`}>{item.tipo === 'Ingreso' ? '+' : '-'}{money(item.monto)}</td></tr>)}</tbody></table></div></section> : null}

      {activeTab === 'cobranza' ? <CollectionAutomationPanel config={collectionConfig} notifications={notifications} dueDay={summary?.calendarioMensual?.dueDay} warningDays={summary?.calendarioMensual?.warningDays} saving={collectionSaving} sending={collectionSending} onSave={(value) => void saveCollectionConfig(value)} onSendAll={(overdue, channels) => void sendReminders([], overdue, channels)} /> : null}
    </>}

    {chargeModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={saveCharge} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b25] p-6"><h2 className="text-xl font-black text-white">Nuevo cobro · {branch?.nombre}</h2><div className="mt-5 space-y-3"><select required value={chargeForm.jugador_id} onChange={(event) => setChargeForm({ ...chargeForm, jugador_id: event.target.value })} className={field}><option value="">Selecciona alumno</option>{legacyAccounts.map((account: any) => <option key={account.id} value={account.id}>{account.nombre}</option>)}</select><input required value={chargeForm.concepto} onChange={(event) => setChargeForm({ ...chargeForm, concepto: event.target.value })} className={field} placeholder="Concepto" /><div className="grid gap-3 sm:grid-cols-2"><input required type="number" min="1" value={chargeForm.monto} onChange={(event) => setChargeForm({ ...chargeForm, monto: event.target.value })} className={field} placeholder="Monto" /><input type="date" value={chargeForm.fecha_vencimiento} onChange={(event) => setChargeForm({ ...chargeForm, fecha_vencimiento: event.target.value })} className={field} /></div><textarea value={chargeForm.observaciones} onChange={(event) => setChargeForm({ ...chargeForm, observaciones: event.target.value })} className={`${field} min-h-20`} placeholder="Observaciones" /></div><div className="mt-5 flex gap-2"><button disabled={saving} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Guardar</button><button type="button" onClick={() => setChargeModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#b6c0cc]">Cancelar</button></div></form></div> : null}

    {expenseModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={saveExpense} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b25] p-6"><h2 className="text-xl font-black text-white">Registrar egreso</h2><div className="mt-5 space-y-3"><input required value={expenseForm.concepto} onChange={(event) => setExpenseForm({ ...expenseForm, concepto: event.target.value })} className={field} placeholder="Concepto" /><div className="grid gap-3 sm:grid-cols-2"><input required type="number" min="1" value={expenseForm.monto} onChange={(event) => setExpenseForm({ ...expenseForm, monto: event.target.value })} className={field} placeholder="Monto" /><input type="date" value={expenseForm.fecha_gasto} onChange={(event) => setExpenseForm({ ...expenseForm, fecha_gasto: event.target.value })} className={field} /></div><input value={expenseForm.categoria_gasto} onChange={(event) => setExpenseForm({ ...expenseForm, categoria_gasto: event.target.value })} className={field} placeholder="Categoría" /><input value={expenseForm.centro_costo} onChange={(event) => setExpenseForm({ ...expenseForm, centro_costo: event.target.value })} className={field} placeholder={branch?.nombre || 'Centro de costo'} /><textarea value={expenseForm.observaciones} onChange={(event) => setExpenseForm({ ...expenseForm, observaciones: event.target.value })} className={`${field} min-h-20`} placeholder="Observaciones" /></div><div className="mt-5 flex gap-2"><button disabled={saving} className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Guardar egreso</button><button type="button" onClick={() => setExpenseModal(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#b6c0cc]">Cancelar</button></div></form></div> : null}

    {paymentCharge ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={savePayment} className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b25] p-6"><h2 className="text-xl font-black text-white">Registrar pago</h2><p className="mt-2 text-sm text-[#8995a4]">{paymentCharge.concepto}. El monto se aplicará primero a la cuota pendiente más antigua.</p><div className="mt-5 space-y-3"><input required type="number" min="1" max={Math.max(Number(paymentCharge.monto) - Number(paymentCharge.monto_pagado), 0)} value={paymentForm.monto_abono} onChange={(event) => setPaymentForm({ ...paymentForm, monto_abono: event.target.value })} className={field} /><select value={paymentForm.metodo_pago} onChange={(event) => setPaymentForm({ ...paymentForm, metodo_pago: event.target.value })} className={field}><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select><textarea value={paymentForm.observaciones} onChange={(event) => setPaymentForm({ ...paymentForm, observaciones: event.target.value })} className={`${field} min-h-20`} placeholder="Observaciones" /></div><div className="mt-5 flex gap-2"><button disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">Registrar pago real</button><button type="button" onClick={() => setPaymentCharge(null)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-black text-[#b6c0cc]">Cancelar</button></div></form></div> : null}
  </div>;
}
