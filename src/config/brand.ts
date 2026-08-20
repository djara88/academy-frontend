export const BRAND = {
  name: 'Lestra',
  displayName: 'LESTRA',
  tagline: 'Deportivo · Gestión que mueve el deporte.',
  descriptor: 'Lestra Deportivo · Plataforma de gestión para academias y clubes deportivos',
  domain: 'lestra.app',
  productName: 'Lestra Deportivo',
  productDomain: 'deportivo.lestra.app',
  platformDomain: 'lestra.app',
} as const;

export const getAcademyName = (name?: string | null) => (
  name?.trim() || 'Tu academia'
);
