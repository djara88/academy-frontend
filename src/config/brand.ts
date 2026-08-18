export const BRAND = {
  name: 'Lestra',
  displayName: 'LESTRA',
  tagline: 'Gestión que mueve el deporte.',
  descriptor: 'Plataforma de gestión para academias y clubes deportivos',
  domain: 'lestra.app',
} as const;

export const getAcademyName = (name?: string | null) => (
  name?.trim() || 'Tu academia'
);
