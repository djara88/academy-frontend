export type ProfessorEventCategory = { id: string; nombre: string };

export type ProfessorAgendaEvent = {
  id: string;
  tipo: 'Entrenamiento' | 'Partido';
  categoria_id: string;
  fecha: string;
  hora?: string | null;
  estado?: string | null;
  categorias?: ProfessorEventCategory | null;
  lugar?: string | null;
  es_recuperacion?: boolean;
  bitacora_completa?: boolean;
  rival?: string;
  ubicacion?: string | null;
  condicion?: string | null;
  es_amistoso?: boolean;
  preparacion_estado?: 'Borrador' | 'Lista' | null;
};

export type MatchPlanRole = 'Titular' | 'Suplente';

export type MatchPlanPlayer = {
  id: string;
  nombre: string;
  posicion_principal?: string | null;
  posicion_cancha?: string | null;
  foto_url?: string | null;
  avatar_url?: string | null;
  rol_plan?: MatchPlanRole | null;
  posicion_plan?: string;
  orden_plan?: number | null;
};
