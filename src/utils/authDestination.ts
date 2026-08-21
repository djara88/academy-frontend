import { isGuardianRole, isProfessorRole, isSuperAdminRole } from './roles';

type AuthDestinationUser = {
  rol?: string | null;
  academia_id?: string | null;
  requiere_cambio_password?: boolean;
};

export const getPostAuthDestination = (user?: AuthDestinationUser | null) => {
  if (!user) return '/login';
  if (isSuperAdminRole(user.rol)) return '/admin';
  if (user.requiere_cambio_password) return '/cambiar-password';
  if (!user.academia_id) return '/completar-perfil';
  if (isProfessorRole(user.rol)) return '/profesor';
  if (isGuardianRole(user.rol)) return '/apoderado';
  return '/dashboard';
};
