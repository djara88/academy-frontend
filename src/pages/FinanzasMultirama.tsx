import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import api from '../api/axiosConfig';
import { useAcademyMessages } from '../hooks/useAcademyMessages';
import FinanceSchoolDashboard from '../components/FinanceSchoolDashboard';
import CollectionAccountsTable, { type AccountMeta, type CollectionAccount, type FinanceCharge } from '../components/finance/CollectionAccountsTable';
import PaymentValidationPanel, { type ReportedPayment } from '../components/finance/PaymentValidationPanel';
import CollectionAutomationPanel, { type CollectionConfig, type CollectionNotification } from '../components/finance/CollectionAutomationPanel';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorPanel,
  DirectorStat,
  DirectorTabButton,
  DirectorTabs,
} from '../components/director/DirectorModule';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Summary = { totalIngresosReales: number; totalPorCobrar: number; totalVencido: number; totalPorVencer: number; totalEgresos: number; balanceNeto: number; totalAlumnos: number; alumnosMorosos: number; tasaMorosidad: number; calendarioMensual?: { configured?: boolean; dueDay?: number; warningDays?: number } };
type Payment = { id: string; monto: number; metodo_pago?: string | null; fecha_pago?: string | null; observaciones?: string | null; cobro?: { concepto?: string | null; tipo_concepto?: string | null } | null; jugador?: { nombre?: string | null } | null };
type Expense = { id: string; concepto: string; categoria_gasto?: string | null; centro_costo?: string | null; monto: number; metodo_pago?: string | null; fecha_gasto?: string | null; rama_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type FlowRow = { id: string; tipo: 'Ingreso' | 'Egreso'; concepto: string; monto: number; fecha?: string | null; metodo?: string | null; categoria?: string | null };
type Tab = 'dashboard' | 'cuentas' | 'validacion' | 'pagos' | 'egresos' | 'flujo' | 'cobranza';

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const emptyMeta: AccountMeta = { page: 1, page_size: 25, total: 0, pages: 0 };
const labelClass = 'mb-1.5 block text-[10px] font-black uppercase tracking-[.08em] text-[#697468]';

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
    event.preventDefault();
    if (!branchId) return;
    setSaving(true);
    try {
      await api.post('/api/finanzas/cobros', { ...chargeForm, rama_id: branchId, monto: Number(chargeForm.monto) || 0 });
      setChargeModal(false);
      await Promise.all([loadBase(), loadAccounts()]);
      await notify('Cobro creado en la inscripción deportiva seleccionada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible crear el cobro.');
    } finally { setSaving(false); }
  };

  const saveExpense = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/finanzas/egresos', { ...expenseForm, rama_id: branchId || undefined, monto: Number(expenseForm.monto) || 0, centro_costo: expenseForm.centro_costo || branch?.nombre || 'General' });
      setExpenseModal(false);
      await loadBase();
      await notify(branchId ? 'Egreso registrado en la rama.' : 'Egreso general registrado.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible registrar el egreso.');
    } finally { setSaving(false); }
  };

  const openPayment = (charge: FinanceCharge) => {
    const pending = Math.max(Number(charge.monto || 0) - Number(charge.monto_pagado || 0), 0);
    setPaymentCharge(charge);
    setPaymentForm({ monto_abono: String(pending), metodo_pago: 'Transferencia', observaciones: '', idempotency_key: `finance-${charge.id}-${Date.now()}` });
  };

  const savePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentCharge) return;
    setSaving(true);
    try {
      await api.put(`/api/finanzas/cobros/${paymentCharge.id}/pagar`, { ...paymentForm, monto_abono: Number(paymentForm.monto_abono) || 0 });
      setPaymentCharge(null);
      await Promise.all([loadBase(), loadAccounts(), loadReported()]);
      await notify('Pago registrado y distribuido sobre las cuotas pendientes.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible registrar el pago.');
    } finally { setSaving(false); }
  };

  const removeExpense = async (expense: Expense) => {
    const accepted = await confirmAction(`¿Anular el egreso “${expense.concepto}”?`);
    if (!accepted) return;
    try {
      await api.delete(`/api/finanzas/egresos/${expense.id}`);
      await loadBase();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible anular el egreso.');
    }
  };

  const validateReported = async (id: string) => {
    const accepted = await confirmAction('¿Validar esta transferencia? Se registrará inmediatamente como ingreso real y descontará la deuda.');
    if (!accepted) return;
    setValidationBusyId(id);
    try {
      const response = await api.patch(`/api/finanzas/cobranza/pagos-informados/${id}/validar`);
      await Promise.all([loadReported(), loadBase(), loadAccounts()]);
      await notify(response.data.message || 'Pago validado.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible validar el pago.');
    } finally { setValidationBusyId(null); }
  };

  const rejectReported = async (id: string, reason: string) => {
    setValidationBusyId(id);
    try {
      const response = await api.patch(`/api/finanzas/cobranza/pagos-informados/${id}/rechazar`, { motivo: reason });
      await loadReported();
      await notify(response.data.message || 'Pago rechazado.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible rechazar el pago.');
    } finally { setValidationBusyId(null); }
  };

  const sendReminders = async (tutorIds: string[], onlyOverdue: boolean, channels: string[] = ['email', 'whatsapp']) => {
    const scope = tutorIds.length ? `${tutorIds.length} apoderado(s) seleccionado(s)` : 'todas las familias con saldo';
    const accepted = await confirmAction(`¿Enviar ${onlyOverdue ? 'recordatorio de deuda vencida' : 'estado de cuenta'} a ${scope} por ${channels.join(' + ')}?`);
    if (!accepted) return;
    setCollectionSending(true);
    try {
      const response = await api.post('/api/finanzas/cobranza/recordatorios', { tutor_ids: tutorIds, solo_vencidos: onlyOverdue, canales: channels });
      setSelectedTutorIds(new Set());
      await loadCollection();
      await notify(response.data.message || 'Cobranza enviada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible enviar la cobranza.');
    } finally { setCollectionSending(false); }
  };

  const saveCollectionConfig = async (value: CollectionConfig) => {
    setCollectionSaving(true);
    try {
      const response = await api.patch('/api/finanzas/cobranza/configuracion', value);
      setCollectionConfig(response.data.data || value);
      await notify(response.data.message || 'Configuración guardada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la automatización.');
    } finally { setCollectionSaving(false); }
  };

  const tabs: Array<[Tab, string]> = [
    ['dashboard', 'Resumen'],
    ['cuentas', 'Cuentas'],
    ['validacion', `Por validar${pendingValidationCount ? ` · ${pendingValidationCount}` : ''}`],
    ['pagos', 'Pagos'],
    ['egresos', 'Egresos'],
    ['flujo', 'Flujo'],
    ['cobranza', 'Cobranza'],
  ];

  return <div className="mx-auto max-w-7xl space-y-4 pb-16">
    <DirectorPanel className="p-3 sm:p-4">
      <label className="block">
        <span className={labelClass}>Alcance financiero</span>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={DIRECTOR_FIELD}>
          <option value="">Vista consolidada · toda la academia</option>
          {branches.map((item) => <option key={item.id} value={item.id}>{item.disciplina} · {item.nombre}{item.sedes?.nombre ? ` · ${item.sedes.nombre}` : ''}</option>)}
        </select>
      </label>
    </DirectorPanel>

    {loading ? <DirectorPanel className="p-10 text-center text-sm font-bold text-[#697468]">Cargando estado financiero…</DirectorPanel> : <>
      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <DirectorStat label="Recaudado" value={<span className="text-emerald-700">{money(summary?.totalIngresosReales || 0)}</span>} detail="Ingresos reales validados" />
        <DirectorStat label="Por cobrar" value={<span className="text-amber-700">{money(summary?.totalPorCobrar || 0)}</span>} detail="Saldo pendiente total" />
        <DirectorStat label="Vencido" value={<span className="text-rose-700">{money(summary?.totalVencido || 0)}</span>} detail="Deuda que requiere atención" />
        <DirectorStat label={branch ? `Balance · ${branch.nombre}` : 'Balance consolidado'} value={<span className={(summary?.balanceNeto || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{money(summary?.balanceNeto || 0)}</span>} detail="Ingresos menos egresos" />
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniFact label="Alumnos" value={String(summary?.totalAlumnos || 0)} />
        <MiniFact label="Con mora" value={String(summary?.alumnosMorosos || 0)} tone="danger" />
        <MiniFact label="Morosidad" value={`${summary?.tasaMorosidad || 0}%`} tone="pending" />
        <MiniFact label="Por revisar" value={reportedFilter === 'Pendiente' ? String(reportedPayments.length) : '—'} tone="pending" />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openCharge} className={DIRECTOR_BUTTON}>+ Crear cobro</button>
          <button type="button" onClick={() => setExpenseModal(true)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-4 text-sm font-black text-rose-800 transition hover:bg-rose-50">− Registrar egreso</button>
        </div>
        {!branchId ? <span className="text-xs font-semibold text-[#697468]">Selecciona una rama para crear un cobro manual. Los egresos pueden ser generales.</span> : null}
      </div>

      <div className="overflow-x-auto pb-1">
        <DirectorTabs className="grid-cols-7">
          {tabs.map(([key, label]) => <DirectorTabButton key={key} active={activeTab === key} onClick={() => setActiveTab(key)}>{label}</DirectorTabButton>)}
        </DirectorTabs>
      </div>

      {activeTab === 'dashboard' ? <FinanceSchoolDashboard summary={summary} accounts={legacyAccounts} payments={payments} expenses={expenses} flow={flow} branches={branches} branchId={branchId} /> : null}
      {activeTab === 'cuentas' ? <CollectionAccountsTable accounts={collectionAccounts} meta={accountMeta} loading={accountLoading} search={accountSearchInput} status={accountStatus} pageSize={accountPageSize} selectedTutorIds={selectedTutorIds} onSearch={setAccountSearchInput} onStatus={(value) => { setAccountStatus(value); setAccountPage(1); }} onPage={setAccountPage} onPageSize={(value) => { setAccountPageSize(value); setAccountPage(1); }} onSelection={setSelectedTutorIds} onPayment={openPayment} onReminder={(ids, overdue) => void sendReminders(ids, overdue)} /> : null}
      {activeTab === 'validacion' ? <PaymentValidationPanel rows={reportedPayments} filter={reportedFilter} loading={reportedLoading} busyId={validationBusyId} onFilter={setReportedFilter} onValidate={(id) => void validateReported(id)} onReject={(id, reason) => void rejectReported(id, reason)} /> : null}
      {activeTab === 'pagos' ? <PaymentsTable rows={payments} /> : null}
      {activeTab === 'egresos' ? <ExpensesTable rows={expenses} onRemove={(item) => void removeExpense(item)} /> : null}
      {activeTab === 'flujo' ? <CashFlowTable rows={flow} /> : null}
      {activeTab === 'cobranza' ? <CollectionAutomationPanel config={collectionConfig} notifications={notifications} dueDay={summary?.calendarioMensual?.dueDay} warningDays={summary?.calendarioMensual?.warningDays} saving={collectionSaving} sending={collectionSending} onSave={(value) => void saveCollectionConfig(value)} onSendAll={(overdue, channels) => void sendReminders([], overdue, channels)} /> : null}
    </>}

    {chargeModal ? <FinanceModal title={`Nuevo cobro · ${branch?.nombre || 'Rama'}`} description="El cobro quedará asociado a la inscripción deportiva seleccionada." onClose={() => setChargeModal(false)}>
      <form onSubmit={saveCharge} className="grid gap-3">
        <label><span className={labelClass}>Alumno</span><select required value={chargeForm.jugador_id} onChange={(event) => setChargeForm({ ...chargeForm, jugador_id: event.target.value })} className={DIRECTOR_FIELD}><option value="">Selecciona alumno</option>{legacyAccounts.map((account: any) => <option key={account.id} value={account.id}>{account.nombre}</option>)}</select></label>
        <label><span className={labelClass}>Concepto</span><input required value={chargeForm.concepto} onChange={(event) => setChargeForm({ ...chargeForm, concepto: event.target.value })} className={DIRECTOR_FIELD} placeholder="Ej. Matrícula extraordinaria" /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Monto</span><input required type="number" min="1" value={chargeForm.monto} onChange={(event) => setChargeForm({ ...chargeForm, monto: event.target.value })} className={DIRECTOR_FIELD} /></label><label><span className={labelClass}>Vencimiento</span><input type="date" value={chargeForm.fecha_vencimiento} onChange={(event) => setChargeForm({ ...chargeForm, fecha_vencimiento: event.target.value })} className={DIRECTOR_FIELD} /></label></div>
        <label><span className={labelClass}>Observaciones</span><textarea value={chargeForm.observaciones} onChange={(event) => setChargeForm({ ...chargeForm, observaciones: event.target.value })} className={`${DIRECTOR_FIELD} min-h-24 py-3`} placeholder="Opcional" /></label>
        <div className="mt-1 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setChargeModal(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button disabled={saving} className={DIRECTOR_BUTTON}>{saving ? 'Guardando…' : 'Crear cobro'}</button></div>
      </form>
    </FinanceModal> : null}

    {expenseModal ? <FinanceModal title="Registrar egreso" description="Este movimiento reduce el balance financiero del alcance seleccionado." onClose={() => setExpenseModal(false)} tone="danger">
      <form onSubmit={saveExpense} className="grid gap-3">
        <label><span className={labelClass}>Concepto</span><input required value={expenseForm.concepto} onChange={(event) => setExpenseForm({ ...expenseForm, concepto: event.target.value })} className={DIRECTOR_FIELD} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Monto</span><input required type="number" min="1" value={expenseForm.monto} onChange={(event) => setExpenseForm({ ...expenseForm, monto: event.target.value })} className={DIRECTOR_FIELD} /></label><label><span className={labelClass}>Fecha</span><input type="date" value={expenseForm.fecha_gasto} onChange={(event) => setExpenseForm({ ...expenseForm, fecha_gasto: event.target.value })} className={DIRECTOR_FIELD} /></label></div>
        <label><span className={labelClass}>Categoría</span><input value={expenseForm.categoria_gasto} onChange={(event) => setExpenseForm({ ...expenseForm, categoria_gasto: event.target.value })} className={DIRECTOR_FIELD} placeholder="Otros" /></label>
        <label><span className={labelClass}>Centro de costo</span><input value={expenseForm.centro_costo} onChange={(event) => setExpenseForm({ ...expenseForm, centro_costo: event.target.value })} className={DIRECTOR_FIELD} placeholder={branch?.nombre || 'General'} /></label>
        <label><span className={labelClass}>Observaciones</span><textarea value={expenseForm.observaciones} onChange={(event) => setExpenseForm({ ...expenseForm, observaciones: event.target.value })} className={`${DIRECTOR_FIELD} min-h-24 py-3`} placeholder="Opcional" /></label>
        <div className="mt-1 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setExpenseModal(false)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button disabled={saving} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-rose-700 bg-rose-700 px-4 text-sm font-black text-white transition hover:bg-rose-800 disabled:opacity-40">{saving ? 'Guardando…' : 'Registrar egreso'}</button></div>
      </form>
    </FinanceModal> : null}

    {paymentCharge ? <FinanceModal title="Registrar pago real" description={`${paymentCharge.concepto}. El monto se aplicará primero a la cuota pendiente más antigua.`} onClose={() => setPaymentCharge(null)}>
      <form onSubmit={savePayment} className="grid gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><strong>Impacto contable:</strong> este registro sí ingresará a caja y descontará deuda.</div>
        <label><span className={labelClass}>Monto a abonar</span><input required type="number" min="1" max={Math.max(Number(paymentCharge.monto) - Number(paymentCharge.monto_pagado), 0)} value={paymentForm.monto_abono} onChange={(event) => setPaymentForm({ ...paymentForm, monto_abono: event.target.value })} className={DIRECTOR_FIELD} /></label>
        <label><span className={labelClass}>Método</span><select value={paymentForm.metodo_pago} onChange={(event) => setPaymentForm({ ...paymentForm, metodo_pago: event.target.value })} className={DIRECTOR_FIELD}><option>Transferencia</option><option>Efectivo</option><option>Tarjeta</option><option>Otro</option></select></label>
        <label><span className={labelClass}>Observaciones</span><textarea value={paymentForm.observaciones} onChange={(event) => setPaymentForm({ ...paymentForm, observaciones: event.target.value })} className={`${DIRECTOR_FIELD} min-h-24 py-3`} placeholder="Opcional" /></label>
        <div className="mt-1 flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setPaymentCharge(null)} className={DIRECTOR_BUTTON_GHOST}>Cancelar</button><button disabled={saving} className={DIRECTOR_BUTTON_DARK}>{saving ? 'Registrando…' : 'Confirmar pago real'}</button></div>
      </form>
    </FinanceModal> : null}
  </div>;
}

function MiniFact({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'danger' | 'pending' }) {
  const valueClass = tone === 'danger' ? 'text-rose-700' : tone === 'pending' ? 'text-amber-700' : 'text-[#111711]';
  return <div className="rounded-xl border border-[#e0e5dd] bg-[#fafbf9] px-3 py-2.5 text-center"><p className="text-[9px] font-black uppercase tracking-[.08em] text-[#748073]">{label}</p><p className={`mt-1 text-base font-black ${valueClass}`}>{value}</p></div>;
}

function PaymentsTable({ rows }: { rows: Payment[] }) {
  return <FinanceTable title="Pagos registrados" description="Solo movimientos contables ya validados." headers={['Fecha', 'Alumno', 'Concepto', 'Método', 'Monto']} empty="No hay pagos registrados.">
    {rows.map((item) => <tr key={item.id} className="transition hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha_pago ? new Date(item.fecha_pago).toLocaleDateString('es-CL') : '—'}</td><td className="px-4 py-3 font-bold text-[#111711]">{item.jugador?.nombre || 'General'}</td><td className="px-4 py-3 text-[#596456]">{item.cobro?.concepto || 'Pago'}</td><td className="px-4 py-3 text-[#697468]">{item.metodo_pago || '—'}</td><td className="px-4 py-3 text-right font-black text-emerald-700">+ {money(item.monto)}</td></tr>)}
  </FinanceTable>;
}

function ExpensesTable({ rows, onRemove }: { rows: Expense[]; onRemove: (item: Expense) => void }) {
  return <FinanceTable title="Egresos" description="Salidas vigentes que afectan el balance." headers={['Fecha', 'Concepto', 'Categoría', 'Centro de costo', 'Monto', '']} empty="No hay egresos registrados.">
    {rows.map((item) => <tr key={item.id} className="transition hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha_gasto || '—'}</td><td className="px-4 py-3 font-bold text-[#111711]">{item.concepto}</td><td className="px-4 py-3 text-[#697468]">{item.categoria_gasto || 'Otros'}</td><td className="px-4 py-3 text-[#697468]">{item.centro_costo || item.ramas?.nombre || 'General'}</td><td className="px-4 py-3 text-right font-black text-rose-700">− {money(item.monto)}</td><td className="px-4 py-3 text-right"><button type="button" onClick={() => onRemove(item)} className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-black text-rose-800 transition hover:bg-rose-50">Anular</button></td></tr>)}
  </FinanceTable>;
}

function CashFlowTable({ rows }: { rows: FlowRow[] }) {
  return <FinanceTable title="Flujo de caja" description="Ingresos validados menos egresos vigentes." headers={['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto']} empty="No hay movimientos de caja.">
    {rows.map((item) => <tr key={`${item.tipo}-${item.id}`} className="transition hover:bg-[#fafbf9]"><td className="px-4 py-3 text-[#697468]">{item.fecha ? new Date(item.fecha).toLocaleDateString('es-CL') : '—'}</td><td className={`px-4 py-3 font-black ${item.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.tipo}</td><td className="px-4 py-3 font-semibold text-[#111711]">{item.concepto}</td><td className="px-4 py-3 text-[#697468]">{item.metodo || '—'}</td><td className={`px-4 py-3 text-right font-black ${item.tipo === 'Ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>{item.tipo === 'Ingreso' ? '+' : '−'} {money(item.monto)}</td></tr>)}
  </FinanceTable>;
}

function FinanceTable({ title, description, headers, empty, children }: { title: string; description: string; headers: string[]; empty: string; children: React.ReactNode }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <DirectorPanel className="overflow-hidden"><header className="border-b border-[#e2e7df] p-4 sm:p-5"><h2 className="text-lg font-black text-[#111711]">{title}</h2><p className="mt-1 text-xs text-[#697468]">{description}</p></header><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-[#e1e6de] bg-[#f7f9f5] text-[10px] uppercase tracking-wider text-[#697468]"><tr>{headers.map((header, index) => <th key={`${header}-${index}`} className={`px-4 py-3 ${index === headers.length - 1 ? 'text-right' : ''}`}>{header}</th>)}</tr></thead><tbody className="divide-y divide-[#e6ebe3]">{children}</tbody></table></div>{!hasRows ? <div className="p-8 text-center text-sm font-semibold text-[#697468]">{empty}</div> : null}</DirectorPanel>;
}

function FinanceModal({ title, description, onClose, tone = 'default', children }: { title: string; description?: string; onClose: () => void; tone?: 'default' | 'danger'; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`w-full max-w-lg rounded-3xl border bg-white p-5 shadow-2xl sm:p-6 ${tone === 'danger' ? 'border-rose-200' : 'border-[#d9e0d6]'}`}><div className="mb-5"><p className={`text-[10px] font-black uppercase tracking-[.12em] ${tone === 'danger' ? 'text-rose-700' : 'text-[#6d8700]'}`}>{tone === 'danger' ? 'Salida de caja' : 'Movimiento financiero'}</p><h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">{title}</h2>{description ? <p className="mt-1 text-sm leading-6 text-[#697468]">{description}</p> : null}</div>{children}</div></div>;
}
