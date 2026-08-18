export type ProfessorEventCategory = { id: string; nombre: string };
export type ProfessorSportMetric = { code: string; label: string; unit?: string | null; decimals?: number };
export type ProfessorSportProfile = {
  code: string;
  label: string;
  icon: string;
  activityLabel: string;
  opponentLabel: string;
  scoreLabel: string;
  usesHeadToHeadScore: boolean;
  metricVersion: number;
  metrics: ProfessorSportMetric[];
};

export type ProfessorAgendaEvent = {
  id: string;
  tipo: 'Entrenamiento' | 'Partido';
  categoria_id: string;
  rama_id?: string | null;
  sede_id?: string | null;
  fecha: string;
  hora?: string | null;
  hora_citacion?: string | null;
  estado?: string | null;
  categorias?: ProfessorEventCategory | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
  sedes?: { id: string; nombre: string } | null;
  lugar?: string | null;
  es_recuperacion?: boolean;
  bitacora_completa?: boolean;
  rival?: string;
  ubicacion?: string | null;
  condicion?: string | null;
  es_amistoso?: boolean;
  preparacion_estado?: 'Borrador' | 'Lista' | null;
  goles_favor?: number | null;
  goles_contra?: number | null;
  en_vivo?: boolean;
  live_etapa?: string | null;
  live_started_at?: string | null;
  live_updated_at?: string | null;
  sport_profile?: ProfessorSportProfile | null;
};

export type MatchPlanRole = 'Titular' | 'Suplente';

export type MatchPlanPlayer = {
  id: string;
  nombre: string;
  posicion_principal?: string | null;
  posicion_cancha?: string | null;
  rol_especialidad?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  rol_plan?: MatchPlanRole | null;
  posicion_plan?: string;
  orden_plan?: number | null;
};

export type ProfessorCaseState = 'abierto' | 'en_revision' | 'resuelto';
export type ProfessorCasePriority = 'baja' | 'normal' | 'alta' | 'urgente';
export type ProfessorCaseType = 'seguimiento' | 'conducta' | 'salud' | 'asistencia' | 'familiar' | 'operativo' | 'feedback' | 'otro';
export type ProfessorCaseMessageRole = 'profesor' | 'director' | 'apoderado';

export type ProfessorCase = {
  id: string;
  profesor_id?: string | null;
  creado_por?: string | null;
  origen: 'profesor' | 'direccion';
  categoria_id?: string | null;
  rama_id?: string | null;
  jugador_id?: string | null;
  tipo: ProfessorCaseType;
  prioridad: ProfessorCasePriority;
  titulo: string;
  detalle: string;
  estado: ProfessorCaseState;
  created_at: string;
  updated_at: string;
  categoria?: { id: string; nombre: string; ramas?: { id: string; nombre: string; disciplina: string } | null } | null;
  jugador?: { id: string; nombre: string; foto_url?: string | null; avatar_url?: string | null } | null;
  profesor?: { id: string; nombre_completo: string } | null;
  mensajes_total?: number;
  ultimo_mensaje?: { autor_rol: ProfessorCaseMessageRole; mensaje: string; created_at: string } | null;
};

export type ProfessorCaseMessage = {
  id: string;
  autor_id?: string | null;
  autor_rol: ProfessorCaseMessageRole;
  autor_nombre: string;
  mensaje: string;
  created_at: string;
};