export const DISCIPLINES = [
  'Fútbol',
  'Futsal',
  'Básquetbol',
  'Vóleibol',
  'Tenis',
  'Pádel',
  'Hockey',
  'Atletismo',
  'Natación',
  'Gimnasia',
  'Karate',
  'Artes marciales',
  'Rugby',
  'Otro',
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

export const defaultBranchName = (discipline: string) => discipline === 'Otro' ? '' : discipline;
