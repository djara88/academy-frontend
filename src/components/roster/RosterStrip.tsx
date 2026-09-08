import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export type RosterStripPlayer = {
  id: string;
  name: string;
  document?: string | null;
  age?: number | null;
  photo?: string | null;
  medicalAlert?: string | null;
  financialState?: string | null;
  recognitionCount?: number;
  enrollments: Array<{
    id: string;
    discipline: string;
    category?: string | null;
    primary?: boolean;
  }>;
};

type RosterStripProps = {
  title: string;
  context: string;
  players: RosterStripPlayer[];
  onSelect: (playerId: string) => void;
};

const financeTone = (state?: string | null) => {
  if (!state) return 'text-[var(--ls-muted)]';
  if (state.toLowerCase() === 'al día' || state.toLowerCase() === 'al dia') return 'text-[var(--ls-success)]';
  return 'text-[var(--ls-warning)]';
};

export default function RosterStrip({ title, context, players, onSelect }: RosterStripProps) {
  const medicalAlerts = players.filter((player) => Boolean(player.medicalAlert?.trim())).length;
  const financeAttention = players.filter((player) => {
    const state = player.financialState?.trim().toLowerCase();
    return Boolean(state) && state !== 'al día' && state !== 'al dia';
  }).length;

  return (
    <section className="overflow-hidden rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)] shadow-[var(--ls-shadow)]" aria-labelledby="roster-strip-title">
      <header className="bg-[var(--ls-sidebar)] px-4 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[var(--ls-accent-on-dark)]">Roster Strip</p>
            <h2 id="roster-strip-title" className="mt-1 truncate text-2xl font-black tracking-[-.035em] text-white sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm font-semibold text-white/58">{context}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-black">
            <span className="text-white/78">{players.length} deportistas</span>
            <span className={medicalAlerts ? 'text-amber-300' : 'text-white/48'}>{medicalAlerts ? `${medicalAlerts} con alerta médica` : 'Sin alertas médicas en esta vista'}</span>
            <span className={financeAttention ? 'text-amber-300' : 'text-white/48'}>{financeAttention ? `${financeAttention} con situación financiera` : 'Sin alertas financieras en esta vista'}</span>
          </div>
        </div>
      </header>

      {players.length ? (
        <div>
          <div className="hidden grid-cols-[48px_minmax(220px,1.2fr)_minmax(220px,1fr)_150px_140px_92px_28px] gap-3 border-b border-[var(--ls-line)] bg-[var(--ls-surface-soft)] px-5 py-2.5 text-[10px] font-black uppercase tracking-[.08em] text-[var(--ls-muted)] xl:grid">
            <span>#</span>
            <span>Deportista</span>
            <span>Contexto deportivo</span>
            <span>Salud</span>
            <span>Finanzas</span>
            <span>Logros</span>
            <span aria-hidden="true" />
          </div>

          <div className="divide-y divide-[var(--ls-line)]">
            {players.map((player, index) => {
              const primaryEnrollment = player.enrollments.find((item) => item.primary) || player.enrollments[0];
              const otherEnrollments = player.enrollments.filter((item) => item.id !== primaryEnrollment?.id);
              const hasMedicalAlert = Boolean(player.medicalAlert?.trim());
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelect(player.id)}
                  aria-label={`Abrir ficha deportiva de ${player.name}`}
                  className="group grid w-full gap-3 px-4 py-4 text-left transition hover:bg-[var(--ls-surface-soft)] sm:px-5 xl:grid-cols-[48px_minmax(220px,1.2fr)_minmax(220px,1fr)_150px_140px_92px_28px] xl:items-center"
                >
                  <span className="hidden text-xs font-black tabular-nums text-[var(--ls-muted)] xl:block">{String(index + 1).padStart(2, '0')}</span>

                  <span className="flex min-w-0 items-center gap-3">
                    {player.photo ? (
                      <img src={player.photo} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-[var(--ls-line)] object-cover" />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--ls-line-strong)] bg-[var(--ls-surface-soft)] text-lg font-black text-[var(--ls-accent-text)]">
                        {player.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[var(--ls-ink)] sm:text-base">{player.name}</span>
                      <span className="mt-1 block truncate text-xs font-semibold text-[var(--ls-muted)]">
                        {player.document || 'Sin documento'}{player.age !== null && player.age !== undefined ? ` · ${player.age} años` : ''}
                      </span>
                    </span>
                  </span>

                  <span className="min-w-0 border-l-2 border-[var(--ls-accent)] pl-3 xl:border-l-0 xl:pl-0">
                    {primaryEnrollment ? (
                      <>
                        <span className="block truncate text-sm font-black text-[var(--ls-ink)]">{primaryEnrollment.discipline}</span>
                        <span className="mt-1 block truncate text-xs font-semibold text-[var(--ls-muted)]">{primaryEnrollment.category || 'Sin categoría'}{otherEnrollments.length ? ` · +${otherEnrollments.length} disciplina${otherEnrollments.length > 1 ? 's' : ''}` : ''}</span>
                      </>
                    ) : (
                      <span className="text-xs font-black text-[var(--ls-warning)]">Sin inscripción activa</span>
                    )}
                  </span>

                  <span className="flex items-center gap-2 text-xs font-black">
                    {hasMedicalAlert ? <ExclamationTriangleIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--ls-warning)]" /> : <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[var(--ls-success)]" />}
                    <span className={hasMedicalAlert ? 'text-[var(--ls-warning)]' : 'text-[var(--ls-muted)]'}>{hasMedicalAlert ? 'Revisar alerta' : 'Sin alerta'}</span>
                  </span>

                  <span className={`text-xs font-black ${financeTone(player.financialState)}`}>{player.financialState || 'Sin estado'}</span>

                  <span className="text-xs font-black tabular-nums text-[var(--ls-ink)]">{player.recognitionCount || 0} <span className="font-semibold text-[var(--ls-muted)]">logros</span></span>

                  <ChevronRightIcon aria-hidden="true" className="hidden h-5 w-5 text-[var(--ls-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--ls-accent-text)] xl:block" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-base font-black text-[var(--ls-ink)]">Este plantel no tiene deportistas visibles con los filtros actuales.</p>
          <p className="mt-2 text-sm text-[var(--ls-muted)]">Cambia disciplina, categoría o búsqueda para volver a la lista operacional.</p>
        </div>
      )}
    </section>
  );
}
