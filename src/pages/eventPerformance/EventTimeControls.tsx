import { splitTime, replaceTimePart, formatOfficialTime } from './eventTime';

type TimeValueProps = {
  value?: number;
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
};

type TimeSelectProps = {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
};

const smallField = 'w-full rounded-lg border border-[#30363d] lestra-performance-surface bg-[#0d1117] px-2 py-2 text-center text-sm font-black text-white outline-none focus:border-[#289E9D]';
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const BASE_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

export function TimeSelect({ label, helper, value, onChange }: TimeSelectProps) {
  const [hour, minute] = splitTime(value);
  const minuteOptions = BASE_MINUTE_OPTIONS.includes(minute) ? BASE_MINUTE_OPTIONS : [...BASE_MINUTE_OPTIONS, minute].sort();
  return <div className="lestra-performance-card rounded-2xl border border-white/10 lestra-performance-surface bg-[#0d1117] p-3">
    <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#70e4df]">{label}</p>
    <p className="mt-1 min-h-9 text-[11px] leading-4 text-[#7f8b99]">{helper}</p>
    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <label><span className="mb-1 block text-center text-[9px] uppercase text-[#5f6b78]">Hora</span><select value={hour} onChange={(event) => onChange(replaceTimePart(value, 'hour', event.target.value))} className={smallField}>{HOUR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <span className="pt-5 text-lg font-black lestra-performance-muted text-[#697586]">:</span>
      <label><span className="mb-1 block text-center text-[9px] uppercase text-[#5f6b78]">Min</span><select value={minute} onChange={(event) => onChange(replaceTimePart(value, 'minute', event.target.value))} className={smallField}>{minuteOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
  </div>;
}

export function OfficialTimeInput({ value, disabled, onChange }: TimeValueProps) {
  const hasValue = Number.isFinite(Number(value)) && Number(value) > 0;
  const totalMs = hasValue ? Math.round(Number(value) * 1000) : 0;
  const parts = {
    minutes: hasValue ? Math.floor(totalMs / 60000) : '',
    seconds: hasValue ? Math.floor((totalMs % 60000) / 1000) : '',
    millis: hasValue ? totalMs % 1000 : '',
  };
  const update = (part: 'minutes' | 'seconds' | 'millis', raw: string) => {
    if (raw === '' && !hasValue) return onChange(undefined);
    const next = {
      minutes: part === 'minutes' ? Math.max(0, Math.min(999, Number(raw) || 0)) : Number(parts.minutes || 0),
      seconds: part === 'seconds' ? Math.max(0, Math.min(59, Number(raw) || 0)) : Number(parts.seconds || 0),
      millis: part === 'millis' ? Math.max(0, Math.min(999, Number(raw) || 0)) : Number(parts.millis || 0),
    };
    const seconds = next.minutes * 60 + next.seconds + next.millis / 1000;
    onChange(seconds > 0 ? Math.round(seconds * 1000) / 1000 : undefined);
  };
  return <div>
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1.5">
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase lestra-performance-muted text-[#697586]">Min</span><input type="number" min="0" max="999" disabled={disabled} value={parts.minutes} onChange={(event) => update('minutes', event.target.value)} className={smallField} placeholder="0" /></label>
      <span className="pb-2 lestra-performance-muted text-[#697586]">:</span>
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase lestra-performance-muted text-[#697586]">Seg</span><input type="number" min="0" max="59" disabled={disabled} value={parts.seconds} onChange={(event) => update('seconds', event.target.value)} className={smallField} placeholder="00" /></label>
      <span className="pb-2 lestra-performance-muted text-[#697586]">.</span>
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase lestra-performance-muted text-[#697586]">Milésimas</span><input type="number" min="0" max="999" disabled={disabled} value={parts.millis} onChange={(event) => update('millis', event.target.value)} className={smallField} placeholder="000" /></label>
    </div>
    <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[10px] lestra-performance-muted text-[#697586]">{hasValue ? `Registro: ${formatOfficialTime(Number(value))}` : 'Sin registro aún'}</span>{hasValue ? <button type="button" disabled={disabled} onClick={() => onChange(undefined)} className="text-[10px] font-bold text-red-300 disabled:opacity-30">Limpiar</button> : null}</div>
  </div>;
}

