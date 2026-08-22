import { useEffect, useState } from 'react';
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type FinanceConfig = {
  acepta_efectivo: boolean;
  acepta_transferencia: boolean;
  acepta_pago_online?: boolean;
  transferencia_banco: string;
  transferencia_tipo_cuenta: string;
  transferencia_numero: string;
  transferencia_rut: string;
  transferencia_correo: string;
};

const BANK_OPTIONS = [
  'BancoEstado',
  'Banco de Chile / Edwards',
  'Banco Internacional',
  'Scotiabank Chile',
  'BCI - Banco de Crédito e Inversiones',
  'Banco BICE',
  'Banco Santander-Chile',
  'Itaú Chile',
  'Banco Security',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Consorcio',
  'Banco BTG Pactual Chile',
  'Coopeuch',
  'Tenpo',
  'Mercado Pago',
  'MACH / Bci',
] as const;

const OTHER_BANK = '__otra__';
const empty: FinanceConfig = {
  acepta_efectivo: false,
  acepta_transferencia: false,
  acepta_pago_online: false,
  transferencia_banco: '',
  transferencia_tipo_cuenta: '',
  transferencia_numero: '',
  transferencia_rut: '',
  transferencia_correo: '',
};

const isCataloguedBank = (value: string) => BANK_OPTIONS.some((bank) => bank === value);

export default function SetupFinanceInline({ onSaved }: { onSaved?: () => void | Promise<void> }) {
  const [config, setConfig] = useState<FinanceConfig>(empty);
  const [customBank, setCustomBank] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/api/finanzas/configuracion');
        if (!active) return;
        const data = response.data?.data || {};
        const savedBank = String(data.transferencia_banco || '').trim();
        setCustomBank(Boolean(savedBank) && !isCataloguedBank(savedBank));
        setConfig({
          ...empty,
          ...data,
          acepta_efectivo: data.acepta_efectivo === true,
          acepta_transferencia: data.acepta_transferencia === true,
          acepta_pago_online: data.acepta_pago_online === true,
          transferencia_banco: savedBank,
        });
      } catch (requestError: any) {
        if (active) setError(requestError?.response?.data?.error || 'No fue posible cargar los medios de pago.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const save = async () => {
    setMessage('');
    setError('');
    if (!config.acepta_efectivo && !config.acepta_transferencia) {
      setError('Selecciona al menos un medio de pago para continuar.');
      return;
    }
    if (config.acepta_transferencia) {
      if (!config.transferencia_banco.trim()) return setError('Selecciona el banco o institución financiera.');
      if (!config.transferencia_tipo_cuenta.trim()) return setError('Selecciona el tipo de cuenta.');
      if (!config.transferencia_numero.trim()) return setError('Ingresa el número de cuenta.');
      if (!config.transferencia_rut.trim()) return setError('Ingresa el RUT del titular.');
    }

    setSaving(true);
    try {
      await api.put('/api/finanzas/configuracion', {
        ...config,
        // El pago online sigue siendo una mejora posterior; aquí preservamos su estado actual.
        acepta_pago_online: Boolean(config.acepta_pago_online),
        link_pago_online: '',
      });
      setMessage('Medios de pago guardados. Esta etapa ya puede validarse.');
      await onSaved?.();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'No fue posible guardar los medios de pago.');
    } finally {
      setSaving(false);
    }
  };

  const bankSelectValue = customBank ? OTHER_BANK : config.transferencia_banco;
  const onBankChange = (value: string) => {
    if (value === OTHER_BANK) {
      setCustomBank(true);
      setConfig((current) => ({
        ...current,
        transferencia_banco: isCataloguedBank(current.transferencia_banco) ? '' : current.transferencia_banco,
      }));
      return;
    }
    setCustomBank(false);
    setConfig((current) => ({ ...current, transferencia_banco: value }));
  };

  if (loading) {
    return <div className="mt-4 rounded-2xl border border-[#d9ddd3] bg-white p-4 text-sm font-bold text-[#667064]">Cargando medios de pago…</div>;
  }

  return (
    <div className="mt-4 rounded-[24px] border border-[#d9ddd3] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-[#20261f]">Configura la recaudación aquí mismo</p>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-[#70796c]">Elige cómo recibirá pagos la academia. Los valores de matrícula y mensualidad siguen configurándose individualmente en la operación normal de Lestra.</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#eef3df] px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-[#627800]">Sin salir del setup</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setConfig((current) => ({ ...current, acepta_efectivo: !current.acepta_efectivo }))}
          className={`rounded-2xl border p-4 text-left transition ${config.acepta_efectivo ? 'border-[#b9e937] bg-[#f1facf]' : 'border-[#d9ddd3] bg-[#f7f8f3] hover:border-[#b8c0b3]'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#20261f] text-[#b9e937]"><BanknotesIcon className="h-5 w-5" /></div>
              <div><p className="text-sm font-black text-[#20261f]">Efectivo</p><p className="mt-0.5 text-[11px] font-semibold text-[#70796c]">Dirección registra el pago recibido.</p></div>
            </div>
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs font-black ${config.acepta_efectivo ? 'border-[#8eae19] bg-[#b9e937] text-[#172018]' : 'border-[#c7cdc3] text-transparent'}`}>✓</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setConfig((current) => ({ ...current, acepta_transferencia: !current.acepta_transferencia }))}
          className={`rounded-2xl border p-4 text-left transition ${config.acepta_transferencia ? 'border-[#b9e937] bg-[#f1facf]' : 'border-[#d9ddd3] bg-[#f7f8f3] hover:border-[#b8c0b3]'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#20261f] text-[#b9e937]"><BuildingLibraryIcon className="h-5 w-5" /></div>
              <div><p className="text-sm font-black text-[#20261f]">Transferencia bancaria</p><p className="mt-0.5 text-[11px] font-semibold text-[#70796c]">El apoderado adjunta comprobante.</p></div>
            </div>
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs font-black ${config.acepta_transferencia ? 'border-[#8eae19] bg-[#b9e937] text-[#172018]' : 'border-[#c7cdc3] text-transparent'}`}>✓</span>
          </div>
        </button>
      </div>

      {config.acepta_transferencia ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[#dde1d8] bg-[#f7f8f3] p-4 md:grid-cols-2">
          <label className="block text-[11px] font-black text-[#697266]">Banco / institución
            <select value={bankSelectValue} onChange={(event) => onBankChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdd2c8] bg-white px-3 text-sm text-[#20261f] outline-none focus:border-[#7f8e77]">
              <option value="">Seleccionar banco o institución…</option>
              {BANK_OPTIONS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              <option value={OTHER_BANK}>Otra institución</option>
            </select>
          </label>

          <label className="block text-[11px] font-black text-[#697266]">Tipo de cuenta
            <select value={config.transferencia_tipo_cuenta} onChange={(event) => setConfig((current) => ({ ...current, transferencia_tipo_cuenta: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdd2c8] bg-white px-3 text-sm text-[#20261f] outline-none focus:border-[#7f8e77]">
              <option value="">Seleccionar…</option>
              <option>Cuenta Corriente</option>
              <option>Cuenta Vista</option>
              <option>Cuenta RUT</option>
              <option>Chequera Electrónica</option>
            </select>
          </label>

          {customBank ? <SetupField label="Otra institución" value={config.transferencia_banco} onChange={(value) => setConfig((current) => ({ ...current, transferencia_banco: value }))} /> : null}
          <SetupField label="N° de cuenta" value={config.transferencia_numero} onChange={(value) => setConfig((current) => ({ ...current, transferencia_numero: value }))} />
          <SetupField label="RUT titular" value={config.transferencia_rut} onChange={(value) => setConfig((current) => ({ ...current, transferencia_rut: value }))} />
          <div className={customBank ? '' : 'md:col-span-2'}>
            <SetupField label="Correo de pagos (opcional)" type="email" value={config.transferencia_correo} onChange={(value) => setConfig((current) => ({ ...current, transferencia_correo: value }))} />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{message}</p> : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold leading-5 text-[#747c70]">Mercado Pago y otros pagos online se pueden activar después. No bloquean la apertura de la academia.</p>
        <button type="button" disabled={saving} onClick={() => void save()} className="lestra-setup-primary-action inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black disabled:cursor-not-allowed">
          <CheckCircleIcon className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar cobros'}
        </button>
      </div>
    </div>
  );
}

function SetupField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block text-[11px] font-black text-[#697266]">{label}<input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[#cdd2c8] bg-white px-3 text-sm text-[#20261f] outline-none placeholder:text-[#98a093] focus:border-[#7f8e77]" /></label>;
}
