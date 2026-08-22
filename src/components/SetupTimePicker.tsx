import { ClockIcon } from '@heroicons/react/24/outline';

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const splitTime = (value: string) => {
  const [hour = '', minute = ''] = String(value || '').split(':');
  return { hour, minute };
};

const mergeTime = (hour: string, minute: string) => hour && minute ? `${hour}:${minute}` : '';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export default function SetupTimePicker({ label, value, onChange }: Props) {
  const { hour, minute } = splitTime(value);

  return (
    <label className="setup-time-picker block">
      <span className="setup-time-picker__label">{label}</span>
      <div className="setup-time-picker__control">
        <ClockIcon className="setup-time-picker__icon" />
        <select
          aria-label={`${label}, hora`}
          value={hour}
          onChange={(event) => onChange(mergeTime(event.target.value, minute || '00'))}
        >
          <option value="">--</option>
          {HOURS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <span className="setup-time-picker__colon">:</span>
        <select
          aria-label={`${label}, minutos`}
          value={minute}
          onChange={(event) => onChange(mergeTime(hour || '00', event.target.value))}
        >
          <option value="">--</option>
          {MINUTES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <span className="setup-time-picker__suffix">hrs</span>
      </div>
    </label>
  );
}
