import { useState } from 'react';
import { ExclamationTriangleIcon, PhoneIcon } from '@heroicons/react/24/outline';

export type AttendanceState = 'Presente' | 'Ausente' | 'Justificado';

export type AttendanceLineupPlayer = {
  id: string;
  nombre: string;
  posicion_cancha?: string | null;
  posicion_principal?: string | null;
  rol_especialidad?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  alerta_medica?: string | null;
  telefono_emergencia?: string | null;
};

type AttendanceLineupProps = {
  players: AttendanceLineupPlayer[];
  attendance: Record<string, AttendanceState>;
  onSetStatus: (playerId: string, status: AttendanceState) => void;
  onMarkAllPresent: () => void;
  disabled?: boolean;
};

const phoneHref = (phone: string) => phone.replace(/[^\d+]/g, '');

export default function AttendanceLineup({
  players,
  attendance,
  onSetStatus,
  onMarkAllPresent,
  disabled = false,
}: AttendanceLineupProps) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const counts = players.reduce((result, player) => {
    const status = attendance[player.id];
    if (status === 'Presente') result.presente += 1;
    if (status === 'Ausente') result.ausente += 1;
    if (status === 'Justificado') result.justificado += 1;
    if (status) result.registered += 1;
    return result;
  }, { presente: 0, ausente: 0, justificado: 0, registered: 0 });

  return (
    <section className="attendance-lineup" aria-labelledby="attendance-lineup-title">
      <header className="attendance-lineup-header">
        <div>
          <p className="attendance-lineup-kicker">Training Session</p>
          <h2 id="attendance-lineup-title">Attendance Lineup</h2>
          <p>{players.length} deportistas · {counts.registered}/{players.length} registrados</p>
        </div>
        <button type="button" onClick={onMarkAllPresent} disabled={disabled || !players.length} className="attendance-lineup-all-present">Todos presentes</button>
      </header>

      <div className="attendance-lineup-score" aria-label="Resumen de asistencia">
        <span><strong>{counts.presente}</strong> Presentes</span>
        <span><strong>{counts.ausente}</strong> Ausentes</span>
        <span><strong>{counts.justificado}</strong> Justificados</span>
        <span><strong>{counts.registered}</strong> Registrados</span>
      </div>

      <div className="attendance-lineup-column-head" aria-hidden="true">
        <span>#</span><span>Deportista</span><span>Contexto</span><span>Estado de asistencia</span>
      </div>

      <div className="attendance-lineup-list">
        {players.map((player, index) => {
          const status = attendance[player.id];
          const photo = player.foto_url || player.avatar_url;
          const position = player.rol_especialidad || player.posicion_principal || player.posicion_cancha || 'Sin posición registrada';
          const hasEmergencyInfo = Boolean(player.alerta_medica || player.telefono_emergencia);
          const expanded = expandedPlayerId === player.id;
          const emergencyRegionId = `lineup-emergency-${player.id}`;

          return (
            <article key={player.id} className="attendance-lineup-row">
              <span className="attendance-lineup-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="attendance-lineup-player">
                {photo ? <img src={photo} alt="" /> : <span className="attendance-lineup-avatar">{player.nombre.slice(0, 1).toUpperCase()}</span>}
                <span className="attendance-lineup-player-copy"><strong>{player.nombre}</strong><small>{position}</small></span>
              </div>

              <div className="attendance-lineup-context">
                {player.alerta_medica ? (
                  <button type="button" aria-expanded={expanded} aria-controls={emergencyRegionId} onClick={() => setExpandedPlayerId(expanded ? null : player.id)} className="attendance-lineup-alert is-medical">
                    <ExclamationTriangleIcon aria-hidden="true" />
                    <span>Alerta médica</span>
                  </button>
                ) : player.telefono_emergencia ? (
                  <button type="button" aria-expanded={expanded} aria-controls={emergencyRegionId} onClick={() => setExpandedPlayerId(expanded ? null : player.id)} className="attendance-lineup-alert">
                    <PhoneIcon aria-hidden="true" />
                    <span>Contacto disponible</span>
                  </button>
                ) : <span className="attendance-lineup-clear">Sin alerta registrada</span>}
              </div>

              <div className="attendance-lineup-status" role="group" aria-label={`Asistencia de ${player.nombre}`}>
                {(['Presente', 'Ausente', 'Justificado'] as AttendanceState[]).map((option) => (
                  <button key={option} type="button" disabled={disabled} aria-pressed={status === option} data-status={option.toLowerCase()} onClick={() => onSetStatus(player.id, option)}>{option}</button>
                ))}
              </div>

              {hasEmergencyInfo && expanded ? (
                <div id={emergencyRegionId} role="region" aria-label={`Información de emergencia de ${player.nombre}`} className="attendance-lineup-emergency">
                  {player.alerta_medica ? <div><strong>Alerta médica</strong><p>{player.alerta_medica}</p></div> : null}
                  {player.telefono_emergencia ? <a href={`tel:${phoneHref(player.telefono_emergencia)}`}><PhoneIcon aria-hidden="true" /> Llamar al {player.telefono_emergencia}</a> : <p>No hay teléfono de emergencia registrado.</p>}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
