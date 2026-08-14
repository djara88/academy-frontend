export const BRAND = {
  name: 'Syncademia',
  tagline: 'Gestión de academias deportivas, tu ecosistema de élite',
  mark: '/syncademia-mark.png',
} as const;

export const getAcademyName = (name?: string | null) => (
  name?.trim() || 'Tu academia'
);
