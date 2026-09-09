import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DocumentArrowUpIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { Logo } from '../components/Logo';

type Quota = { id: string; numero: number; total_cuotas: number; monto: number; monto_pagado: number; fecha_vencimiento: string; estado: string; saldo: number; vencida: boolean };
type Reported = { id: string; monto: number; fecha_pago_informada: string; estado: string; created_at: string };
type Charge = { id: string; jugador_id: string; concepto: string; tipo_concepto?: string | null; monto: number; monto_pagado: number; estado: string; fecha_vencimiento?: string | null; saldo: number; vencido: boolean; cuotas: Quota[]; pagos_informados_pendientes: Reported[] };
type Statement = {
  academia: { nombre: string; slug: string; logo?: string | null; colores: { primario?: string; secundario?: string; fondo?: string } };
  jugadores: { id: string; nombre: string; estado_financiero?: string | null }[];
  cobros: Charge[];
  saldo_total: number;
  metodos_pago?: { acepta_efectivo?: boolean; acepta_transferencia?: boolean; acepta_pago_online?: boolean; transferencia_banco?: string | null; transferencia_tipo_cuenta?: string | null; transferencia_numero?: string | null; transferencia_rut?: string | null; transferencia_correo?: string | null } | null;
  expira_at: string;
};
type Target = { key: string; cobro_id: string; cuota_id: string | null; label: string; amount: number; charge: Charge; quota?: Quota | null };
type PaymentVars = CSSProperties & { '--payment-accent'?: string };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0);
const today = () => new Date().toISOString().slice(0, 10);
const friendlyDate = (value?: string | null) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
const apiBase = String(import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const validBrandColor = (value?: string | null) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : undefined;

function SecureShell({ children, step }: { children: React.ReactNode; step: 1 | 2 }) {
  return (
    <main className="payment-trust payment-access">
      <section className="payment-access-brand">
        <Logo variant="mark" />
        <p>Portal seguro Lestra</p>
        <h1>Tu información financiera solo aparece después de verificar tu identidad.</h1>
        <div className="payment-access-steps" aria-label="Proceso de acceso">
          <div className={step >= 1 ? 'is-active' : ''}><span>01</span><strong>Identidad</strong></div>
          <ArrowRightIcon aria-hidden="true" />
          <div className={step >= 2 ? 'is-active' : ''}><span>02</span><strong>Código</strong></div>
          <ArrowRightIcon aria-hidden="true" />
          <div><span>03</span><strong>Estado de cuenta</strong></div>
        </div>
      </section>
      <section className="payment-access-panel">{children}</section>
    </main>
  );
}

function TransferDialog({ target, transfer, setTransfer, receipt, setReceipt, saving, onClose, onSubmit }: {
  target: Target | null;
  transfer: { monto: string; fecha_pago: string; observaciones: string };
  setTransfer: React.Dispatch<React.SetStateAction<{ monto: string; fecha_pago: string; observaciones: string }>>;
  receipt: File | null;
  setReceipt: React.Dispatch<React.SetStateAction<File | null>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (target && !dialog.open) dialog.showModal();
    if (!target && dialog.open) dialog.close();
  }, [target]);
  return (
    <dialog ref={ref} onClose={onClose} className="payment-transfer-dialog">
      {target ? <form onSubmit={onSubmit}>
        <div className="payment-transfer-head"><div><p>Transferencia · Validación</p><h2>Informar comprobante</h2><span>{target.label}</span></div><button type="button" onClick={onClose} aria-label="Cerrar"><XMarkIcon aria-hidden="true" /></button></div>
        <div className="payment-transfer-grid">
          <label><span>Monto *</span><input type="number" min="1" max={Math.round(target.amount)} required value={transfer.monto} onChange={(event) => setTransfer((current) => ({ ...current, monto: event.target.value }))} /></label>
          <label><span>Fecha de transferencia *</span><input type="date" required value={transfer.fecha_pago} onChange={(event) => setTransfer((current) => ({ ...current, fecha_pago: event.target.value }))} /></label>
          <label className="payment-receipt"><span>Comprobante PDF o imagen · máximo 5 MB *</span><input type="file" required accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setReceipt(event.target.files?.[0] || null)} /><small>{receipt?.name || 'Selecciona el archivo enviado por tu banco.'}</small></label>
          <label className="payment-transfer-note"><span>Observación opcional</span><textarea value={transfer.observaciones} onChange={(event) => setTransfer((current) => ({ ...current, observaciones: event.target.value }))} /></label>
        </div>
        <div className="payment-validation-note"><ShieldCheckIcon aria-hidden="true" /><p><strong>No se descuenta la deuda automáticamente.</strong> La transferencia queda pendiente hasta que Dirección valide el comprobante y la convierta en un pago contable.</p></div>
        <div className="payment-transfer-actions"><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary" disabled={saving || !receipt}>{saving ? 'Enviando…' : 'Enviar comprobante'}</button></div>
      </form> : null}
    </dialog>
  );
}

export default function CollectionPortalV2() {
  const { slug = '', token: routeToken = '' } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(routeToken);
  const [rut, setRut] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [code, setCode] = useState('');
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(Boolean(routeToken));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [transferTarget, setTransferTarget] = useState<Target | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [transfer, setTransfer] = useState({ monto: '', fecha_pago: today(), observaciones: '' });

  const load = async (activeToken: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/cobranza/public/estado/${encodeURIComponent(activeToken)}`);
      setStatement(response.data.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'No fue posible cargar el estado de cuenta.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (routeToken) {
      setToken(routeToken);
      void load(routeToken);
    }
  }, [routeToken]);

  const names = useMemo(() => new Map((statement?.jugadores || []).map((player) => [player.id, player.nombre])), [statement]);
  const targets = useMemo<Target[]>(() => {
    const output: Target[] = [];
    for (const charge of statement?.cobros || []) {
      if (charge.cuotas?.length) {
        for (const quota of charge.cuotas) {
          if (quota.saldo > 0) output.push({ key: `${charge.id}:${quota.id}`, cobro_id: charge.id, cuota_id: quota.id, label: `${charge.concepto} · Cuota ${quota.numero}/${quota.total_cuotas}`, amount: quota.saldo, charge, quota });
        }
      } else if (charge.saldo > 0) {
        output.push({ key: `${charge.id}:`, cobro_id: charge.id, cuota_id: null, label: charge.concepto, amount: charge.saldo, charge, quota: null });
      }
    }
    return output;
  }, [statement]);
  const selected = useMemo(() => targets.filter((target) => selectedKeys.includes(target.key)), [targets, selectedKeys]);
  const totalSelected = selected.reduce((sum, target) => sum + target.amount, 0);

  const begin = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await api.post(`/api/cobranza/public/${encodeURIComponent(slug)}/iniciar`, { rut });
      setVerificationId(response.data.verification_id);
      setMessage(response.data.message || 'Revisa el contacto registrado.');
    } catch (requestError: any) { setError(requestError.response?.data?.error || 'No fue posible iniciar la consulta.'); }
    finally { setSaving(false); }
  };
  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const response = await api.post(`/api/cobranza/public/${encodeURIComponent(slug)}/verificar`, { verification_id: verificationId, codigo: code });
      const next = response.data.token;
      setToken(next);
      navigate(`/pagar/${encodeURIComponent(next)}`, { replace: true });
      await load(next);
    } catch (requestError: any) { setError(requestError.response?.data?.error || 'Código inválido o vencido.'); }
    finally { setSaving(false); }
  };
  const toggle = (key: string) => setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]);
  const payOnline = async () => {
    if (!token || !selected.length) return;
    setSaving(true); setError('');
    try {
      const response = await api.post(`/api/mercadopago/academy/checkout/${encodeURIComponent(token)}`, { items: selected.map((target) => ({ cobro_id: target.cobro_id, cuota_id: target.cuota_id })) });
      window.location.assign(response.data.data.checkoutUrl);
    } catch (requestError: any) { setError(requestError.response?.data?.error || 'No fue posible preparar el pago en línea.'); }
    finally { setSaving(false); }
  };
  const openTransfer = (target: Target) => {
    setTransferTarget(target);
    setTransfer({ monto: String(Math.round(target.amount)), fecha_pago: today(), observaciones: '' });
    setReceipt(null); setError('');
  };
  const closeTransfer = () => { if (!saving) { setTransferTarget(null); setReceipt(null); } };
  const reportTransfer = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !transferTarget || !receipt) return;
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.append('comprobante', receipt);
      form.append('cobro_id', transferTarget.cobro_id);
      if (transferTarget.cuota_id) form.append('cuota_id', transferTarget.cuota_id);
      form.append('monto', String(Number(transfer.monto) || 0));
      form.append('fecha_pago', transfer.fecha_pago);
      form.append('observaciones', transfer.observaciones);
      form.append('idempotency_key', crypto.randomUUID());
      const response = await fetch(`${apiBase}/api/cobranza/recibos/public/transferencia/${encodeURIComponent(token)}`, { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No fue posible informar la transferencia.');
      closeTransfer();
      setMessage(payload.message || 'Transferencia informada para validación.');
      await load(token);
    } catch (requestError: any) { setError(requestError.message || 'No fue posible informar la transferencia.'); }
    finally { setSaving(false); }
  };

  if (!routeToken && !statement && !verificationId) {
    return <SecureShell step={1}><div className="payment-access-form"><p>01 · Identidad</p><h2>Consulta tu estado de cuenta</h2><span>Ingresa el RUT del apoderado o deportista. No mostraremos montos ni nombres hasta verificar el contacto registrado.</span><form onSubmit={begin}><label><span>RUT</span><input required autoFocus value={rut} onChange={(event) => setRut(event.target.value)} placeholder="12.345.678-9" autoComplete="off" /></label><button type="submit" disabled={saving}>{saving ? 'Verificando…' : <><LockClosedIcon aria-hidden="true" />Continuar de forma segura</>}</button></form>{error ? <div className="payment-error" role="alert">{error}</div> : null}</div></SecureShell>;
  }
  if (!routeToken && !statement && verificationId) {
    return <SecureShell step={2}><div className="payment-access-form"><p>02 · Código temporal</p><h2>Confirma que eres tú</h2><span>{message}</span><form onSubmit={verify}><label><span>Código de 6 dígitos</span><input required inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="payment-code" autoComplete="one-time-code" /></label><button type="submit" disabled={saving || code.length !== 6}>{saving ? 'Validando…' : <><ShieldCheckIcon aria-hidden="true" />Validar y continuar</>}</button></form>{error ? <div className="payment-error" role="alert">{error}</div> : null}</div></SecureShell>;
  }
  if (loading) return <main className="payment-trust payment-state"><span className="payment-spinner" aria-hidden="true" /><strong>Verificando estado de cuenta…</strong></main>;
  if (error && !statement) return <main className="payment-trust payment-state"><ExclamationTriangleIcon aria-hidden="true" /><h1>Enlace no disponible</h1><p>{error}</p></main>;
  if (!statement) return null;

  const primary = validBrandColor(statement.academia.colores?.primario);
  const vars: PaymentVars = primary ? { '--payment-accent': primary } : {};
  const pendingReports = statement.cobros.reduce((sum, charge) => sum + (charge.pagos_informados_pendientes?.length || 0), 0);

  return (
    <div className="payment-trust payment-statement" style={vars}>
      <header className="payment-statement-nav">
        <div className="payment-academy-brand">{statement.academia.logo ? <img src={statement.academia.logo} alt="" /> : <Logo variant="mark" />}<span><small>Estado de cuenta verificado</small><strong>{statement.academia.nombre}</strong></span></div>
        <div className="payment-trust-mark"><ShieldCheckIcon aria-hidden="true" /><span>Sesión protegida</span></div>
      </header>

      <main className="payment-statement-main">
        {message ? <div className="payment-success" role="status"><CheckCircleIcon aria-hidden="true" />{message}</div> : null}
        {error ? <div className="payment-error" role="alert">{error}</div> : null}

        <section className="payment-balance-command">
          <div className="payment-balance-main"><p>Saldo familiar pendiente</p><strong>{money(statement.saldo_total)}</strong><span>{statement.jugadores.map((player) => player.nombre).join(' · ')}</span></div>
          <div className="payment-balance-context"><div><span>Conceptos abiertos</span><strong>{targets.length}</strong></div><div><span>Transferencias por validar</span><strong>{pendingReports}</strong></div><div><span>Sesión vigente hasta</span><strong>{new Date(statement.expira_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</strong></div></div>
        </section>

        {!targets.length ? (
          <section className="payment-clear-state"><CheckCircleIcon aria-hidden="true" /><h2>Sin pagos pendientes</h2><p>El estado de cuenta verificado no tiene obligaciones abiertas en este momento.</p></section>
        ) : (
          <section className="payment-obligations" aria-labelledby="payment-obligations-title">
            <div className="payment-section-heading"><div><p>Obligaciones</p><h2 id="payment-obligations-title">Elige qué quieres pagar</h2></div><span>{selected.length ? `${selected.length} seleccionada${selected.length === 1 ? '' : 's'}` : 'Ninguna seleccionada'}</span></div>
            <div className="payment-obligation-ledger">
              {targets.map((target) => {
                const overdue = Boolean(target.quota?.vencida || (!target.quota && target.charge.vencido));
                const checked = selectedKeys.includes(target.key);
                return <article key={target.key} className={checked ? 'is-selected' : ''}><label className="payment-obligation-check"><input type="checkbox" checked={checked} onChange={() => toggle(target.key)} /><span aria-hidden="true" /></label><div className="payment-obligation-person"><small>{names.get(target.charge.jugador_id) || 'Deportista'} · {target.charge.tipo_concepto || 'Cobro'}</small><strong>{target.label}</strong><span className={overdue ? 'is-overdue' : ''}>{overdue ? 'Vencida' : 'Vence'} · {friendlyDate(target.quota?.fecha_vencimiento || target.charge.fecha_vencimiento)}</span></div><div className="payment-obligation-amount"><strong>{money(target.amount)}</strong>{statement.metodos_pago?.acepta_transferencia ? <button type="button" onClick={() => openTransfer(target)}><DocumentArrowUpIcon aria-hidden="true" />Informar transferencia</button> : null}</div></article>;
              })}
            </div>
          </section>
        )}

        <div className="payment-method-layout">
          <section className="payment-methods" aria-labelledby="payment-methods-title">
            <div className="payment-section-heading"><div><p>Formas de pago</p><h2 id="payment-methods-title">Cómo puedes pagar</h2></div></div>
            <div className="payment-method-ledger">
              {statement.metodos_pago?.acepta_pago_online ? <article><CreditCardIcon aria-hidden="true" /><div><strong>Pago en línea</strong><span>Selecciona uno o más conceptos y continúa de forma segura a Mercado Pago.</span></div><small>Disponible</small></article> : null}
              {statement.metodos_pago?.acepta_transferencia ? <article><BanknotesIcon aria-hidden="true" /><div><strong>Transferencia bancaria</strong><span>{statement.metodos_pago.transferencia_banco || 'Banco por confirmar'} · {statement.metodos_pago.transferencia_tipo_cuenta || ''} {statement.metodos_pago.transferencia_numero || ''}</span></div><small>Requiere validación</small></article> : null}
              {statement.metodos_pago?.acepta_efectivo ? <article><BanknotesIcon aria-hidden="true" /><div><strong>Pago presencial</strong><span>La academia registra directamente los pagos realizados en efectivo.</span></div><small>En academia</small></article> : null}
            </div>
          </section>

          <aside className="payment-security-note"><ShieldCheckIcon aria-hidden="true" /><p>Protección del estado de cuenta</p><h2>Los datos financieros no son públicos.</h2><span>El enlace fue emitido después de verificar el contacto registrado. Si informas una transferencia, seguirá pendiente hasta validación de la academia.</span></aside>
        </div>
      </main>

      {selected.length ? <section className="payment-selection-bar" aria-live="polite"><div><span>{selected.length} concepto{selected.length === 1 ? '' : 's'}</span><strong>{money(totalSelected)}</strong></div>{statement.metodos_pago?.acepta_pago_online ? <button type="button" disabled={saving} onClick={() => void payOnline()}><CreditCardIcon aria-hidden="true" />{saving ? 'Preparando…' : 'Pagar selección'}<ArrowRightIcon aria-hidden="true" /></button> : <p>Pago online no habilitado.</p>}</section> : null}

      <TransferDialog target={transferTarget} transfer={transfer} setTransfer={setTransfer} receipt={receipt} setReceipt={setReceipt} saving={saving} onClose={closeTransfer} onSubmit={reportTransfer} />
    </div>
  );
}
