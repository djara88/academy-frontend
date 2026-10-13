/* Funciones puras de horarios de eventos deportivos; sin dependencias de React. */
const normalizeTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '00:00';
export const splitTime = (value: string) => normalizeTime(value).split(':');
export const replaceTimePart = (value: string, part: 'hour' | 'minute', next: string) => {
  const [hour, minute] = splitTime(value);
  return part === 'hour' ? `${next}:${minute}` : `${hour}:${next}`;
};
export const subtractMinutes = (value: string, amount: number) => {
  const [hour, minute] = splitTime(value).map(Number);
  const total = (hour * 60 + minute - amount + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
export const leadMinutes = (eventTime: string, callTime: string) => {
  const [eh, em] = splitTime(eventTime).map(Number);
  const [ch, cm] = splitTime(callTime).map(Number);
  return eh * 60 + em - (ch * 60 + cm);
};
export const formatOfficialTime = (value: number) => {
  const totalMs = Math.max(0, Math.round(Number(value || 0) * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${minutes ? `${minutes}:` : ''}${minutes ? String(seconds).padStart(2, '0') : seconds}.${String(millis).padStart(3, '0')}`;
};

