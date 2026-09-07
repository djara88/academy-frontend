import React, { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type JerseyStatus = 'available' | 'reserved' | 'occupied';
type JerseyPerson = { id?: string | null; name?: string | null };
type JerseyMapPlayer = { id: string; name: string; jerseyNumber: number | null };
type JerseyEntry = {
  number: number;
  status: JerseyStatus;
  occupiedBy?: JerseyPerson[];
  reservedBy?: JerseyPerson[];
};
type JerseyMap = {
  numbers: JerseyEntry[];
  summary: { total: number; available: number; occupied: number; reserved: number };
  players?: JerseyMapPlayer[];
  scope?: {
    rama?: { id: string; nombre: string; disciplina?: string | null } | null;
    categoria?: { id: string; nombre: string } | null;
  };
};

type Props = {
  branchId: string;
  categoryId?: string | null;
  value?: number | string | null;
  excludePrematriculaId?: string | null;
  excludePlayerId?: string | null;
  selectable?: boolean;
  title?: string;
  description?: string;
  refreshKey?: string | number;
  onSelect?: (number: number) => void;
  onLoaded?: (map: JerseyMap) => void;
};

const statusLabel: Record<JerseyStatus, string> = {
  available: 'Disponible',
  reserved: 'Reservado',
  occupied: 'Ocupado',
};

const JerseyShirt: React.FC<{ number: number; status: JerseyStatus; selected: boolean }> = ({ number, status, selected }) => {
  const fill = selected ? '#111711' : status === 'available' ? '#ffffff' : status === 'reserved' ? '#fff7e6' : '#eef1ed';
  const stroke = selected ? '#111711' : status === 'available' ? '#a3c63a' : status === 'reserved' ? '#d79a28' : '#c4cbc3';
  const numberColor = selected ? '#d8e8a8' : status === 'available' ? '#33420e' : status === 'reserved' ? '#875a08' : '#737b74';
  return (
    <svg viewBox="0 0 92 78" aria-hidden="true" className="h-16 w-[74px] drop-shadow-[0_5px_9px_rgba(17,23,17,.08)]">
      <path
        d="M28 7 38 3h16l10 4 18 10-10 18-11-6v43H31V29l-11 6-10-18L28 7Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M38 4c1.5 7 14.5 7 16 0" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <text x="46" y="49" textAnchor="middle" fill={numberColor} fontSize="24" fontWeight="900" fontFamily="Inter, sans-serif">{number}</text>
    </svg>
  );
};

const JerseyNumberPicker: React.FC<Props> = ({
  branchId,
  categoryId,
  value,
  excludePrematriculaId,
  excludePlayerId,
  selectable = true,
  title = 'Mapa de dorsales',
  description = 'Revisa qué números están disponibles y selecciona uno libre.',
  refreshKey,
  onSelect,
  onLoaded,
}) => {
  const [data, setData] = useState<JerseyMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const selected = value === '' || value == null ? null : Number(value);

  const load = async () => {
    if (!branchId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/api/uniformes/dorsales', {
        params: {
          rama_id: branchId,
          categoria_id: categoryId || undefined,
          exclude_prematricula_id: excludePrematriculaId || undefined,
          exclude_jugador_id: excludePlayerId || undefined,
        },
      });
      const next = response.data?.data as JerseyMap;
      setData(next);
      onLoaded?.(next);
    } catch (requestError: any) {
      setData(null);
      setError(requestError?.response?.data?.error || 'No fue posible cargar los dorsales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [branchId, categoryId, excludePrematriculaId, excludePlayerId, refreshKey]);

  const visible = useMemo(() => {
    const list = data?.numbers || [];
    if (filter === 'available') return list.filter((item) => item.status === 'available' || item.number === selected);
    if (filter === 'unavailable') return list.filter((item) => item.status !== 'available');
    return list;
  }, [data, filter, selected]);

  if (!branchId) {
    return <div className="rounded-[20px] border border-dashed border-[#ccd4ca] bg-[#f8faf7] p-5 text-sm text-[#687068]">Selecciona primero una rama deportiva para consultar los dorsales.</div>;
  }

  return (
    <section className="rounded-[24px] border border-[#dfe4dc] bg-white p-4 shadow-[0_12px_34px_rgba(18,24,19,.06)] sm:p-5" aria-labelledby="jersey-map-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#5e751d]">Dorsales 1–99</p>
          <h3 id="jersey-map-title" className="mt-1 text-xl font-black text-[#161a17]">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-[#687068]">{description}</p>
          {data?.scope ? <p className="mt-2 text-xs font-bold text-[#586158]">{data.scope.rama?.nombre}{data.scope.categoria ? ` · ${data.scope.categoria.nombre}` : ' · toda la rama'}</p> : null}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d8ded5] bg-white px-3 text-sm font-black text-[#384139] hover:bg-[#f5f7f3] disabled:opacity-50">
          <ArrowPathIcon aria-hidden="true" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {data ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#dce7bd] bg-[#f5f9ea] p-3"><p className="text-[10px] font-black uppercase text-[#637423]">Disponibles</p><p className="mt-1 text-2xl font-black text-[#27300f]">{data.summary.available}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3"><p className="text-[10px] font-black uppercase text-amber-700">Reservados</p><p className="mt-1 text-2xl font-black text-amber-900">{data.summary.reserved}</p></div>
          <div className="rounded-2xl border border-[#e0e4df] bg-[#f3f5f2] p-3"><p className="text-[10px] font-black uppercase text-[#717970]">Ocupados</p><p className="mt-1 text-2xl font-black text-[#303631]">{data.summary.occupied}</p></div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar dorsales">
        {([
          ['all', 'Todos'],
          ['available', 'Disponibles'],
          ['unavailable', 'Ocupados / reservados'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`min-h-10 rounded-full border px-3 text-xs font-black ${filter === key ? 'border-[#111711] bg-[#111711] text-white' : 'border-[#dce1da] bg-white text-[#5f685f] hover:bg-[#f4f6f2]'}`}>{label}</button>
        ))}
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{error}</div> : null}
      {loading && !data ? <div className="mt-5 rounded-2xl border border-[#e1e5df] bg-[#f8faf7] p-6 text-center text-sm font-bold text-[#687068]">Consultando dorsales…</div> : null}

      {data ? (
        <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
          {visible.map((item) => {
            const isSelected = item.number === selected;
            const selectableNow = selectable && (item.status === 'available' || isSelected);
            const occupiedNames = (item.occupiedBy || []).map((person) => person.name).filter(Boolean).join(', ');
            const reservedNames = (item.reservedBy || []).map((person) => person.name).filter(Boolean).join(', ');
            const details = item.status === 'occupied' ? occupiedNames : item.status === 'reserved' ? reservedNames : '';
            return (
              <button
                type="button"
                key={item.number}
                disabled={!selectableNow}
                onClick={() => selectableNow && onSelect?.(item.number)}
                aria-pressed={isSelected || undefined}
                aria-label={`Dorsal ${item.number}. ${isSelected ? 'Seleccionado. ' : ''}${statusLabel[item.status]}${details ? `. ${details}` : ''}`}
                title={details || statusLabel[item.status]}
                className={`group relative flex min-h-[116px] flex-col items-center justify-center rounded-[18px] border p-2 text-center transition-[transform,border-color,box-shadow,background-color] duration-150 ${
                  isSelected
                    ? 'border-[#111711] bg-[#f3f7e6] shadow-[0_9px_22px_rgba(17,23,17,.12)]'
                    : item.status === 'available'
                      ? 'border-[#d9e5bd] bg-[#fbfdf8] hover:-translate-y-0.5 hover:border-[#a3c63a] hover:shadow-[0_8px_18px_rgba(17,23,17,.08)]'
                      : item.status === 'reserved'
                        ? 'cursor-not-allowed border-amber-200 bg-amber-50/60 opacity-90'
                        : 'cursor-not-allowed border-[#e0e4df] bg-[#f4f5f3] opacity-80'
                }`}
              >
                {isSelected ? <CheckCircleIcon aria-hidden="true" className="absolute right-2 top-2 h-5 w-5 text-[#5e751d]" /> : item.status !== 'available' ? <LockClosedIcon aria-hidden="true" className={`absolute right-2 top-2 h-4 w-4 ${item.status === 'reserved' ? 'text-amber-600' : 'text-[#879087]'}`} /> : null}
                <JerseyShirt number={item.number} status={item.status} selected={isSelected} />
                <span className={`mt-1 text-[10px] font-black uppercase tracking-[.04em] ${isSelected ? 'text-[#425417]' : item.status === 'available' ? 'text-[#66752d]' : item.status === 'reserved' ? 'text-amber-700' : 'text-[#7d857e]'}`}>{isSelected ? 'Tu selección' : statusLabel[item.status]}</span>
                {details ? <span className="mt-0.5 max-w-full truncate text-[9px] font-semibold text-[#7d857e]">{details}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};

export type { JerseyEntry, JerseyMap, JerseyMapPlayer, JerseyStatus };
export default JerseyNumberPicker;
