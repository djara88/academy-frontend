export const normalizeRole = (role?: string | null) => (
  String(role || '').trim().toLowerCase().replace(/[_-]/g, '')
);

export const isSuperAdminRole = (role?: string | null) => normalizeRole(role) === 'superadmin';
export const isProfessorRole = (role?: string | null) => normalizeRole(role) === 'profesor';
export const isGuardianRole = (role?: string | null) => ['apoderado', 'tutor'].includes(normalizeRole(role));

