export const BRAND = {
  name: 'Syncademia',
  tagline: 'Gestión de academias deportivas, tu ecosistema de élite',
  logo: '/logo-syncademia.png',
  mark: '/syncademia-mark.png',
} as const;

export const getAcademyName = (name?: string | null) => (
  name?.trim() || 'Tu academia'
);

export const academyMessage = (academyName: string | null | undefined, message: string) => (
  `${getAcademyName(academyName)}\n\n${message}`
);

export const platformMessage = (message: string) => `${BRAND.name}\n\n${message}`;
