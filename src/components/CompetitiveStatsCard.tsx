import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';

interface CompetitiveMetricValue {
  code: string;
  label: string;
  value: number;
  unit?: string | null;
  decimals?: number;
}

interface CompetitiveStats {
  code: string;
  label: string;
  icon: string;
  activityLabel: string;
  participations: number;
  mvp: number;
  metrics: CompetitiveMetricValue[];
}

interface Props {
  jugadorId: string;
  fallbackLabel?: string;
}

const formatValue = (metric: CompetitiveMetricValue) => {
  const decimals = Number.isInteger(metric.decimals) ? Number(metric.decimals) : 0;
  return `${Number(metric.value || 0).toLocaleString('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${metric.unit ? ` ${metric.unit}` : ''}`;
};

const CompetitiveStatsCard: React.FC<Props> = ({ jugadorId, fallbackLabel = 'Deporte' }) => {
  const [stats, setStats] = useState<CompetitiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/api/sport-profiles/player/${jugadorId}/competitive-stats`)
      .then((response) => { if (active) setStats(response.data?.data || null); })
      .catch(() => { if (active) setStats(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jugadorId]);

  if (loading) {
    return <div className="rounded-lg border border-[#30363d] bg-[#0d1117] p-4 text-sm text-gray-500">Cargando estadísticas competitivas...</div>;
  }

  const activityLabel = stats?.activityLabel || 'Encuentro';
  const metrics = stats?.metrics || [];

  return (
    <div className="space-y-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Competencia · {stats?.label || fallbackLabel}</h4>
          <p className="mt-1 text-[11px] text-gray-600">Las métricas corresponden a la disciplina actual de la rama.</p>
        </div>
        <span className="text-xl" aria-hidden="true">{stats?.icon || '🏅'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
        <div className="rounded border border-[#289E9D]/30 bg-[#161b22] p-3">
          <span className="block text-[10px] font-bold uppercase text-gray-400">{activityLabel}s registrados</span>
          <span className="text-xl font-black text-[#289E9D]">{stats?.participations || 0}</span>
        </div>
        <div className="rounded border border-amber-500/25 bg-[#161b22] p-3">
          <span className="block text-[10px] font-bold uppercase text-gray-400">Destacado/a</span>
          <span className="text-xl font-black text-amber-400">{stats?.mvp || 0}</span>
        </div>
        {metrics.map((metric) => (
          <div key={metric.code} className="rounded border border-[#30363d] bg-[#161b22] p-3">
            <span className="block text-[10px] font-bold uppercase text-gray-400">{metric.label}</span>
            <span className="text-xl font-black text-white">{formatValue(metric)}</span>
          </div>
        ))}
      </div>

      {!stats?.participations && <p className="text-xs leading-5 text-gray-500">Aún no hay resultados competitivos registrados para esta disciplina.</p>}
    </div>
  );
};

export default CompetitiveStatsCard;
