import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { academyMessage, getAcademyName } from '../config/brand';

export const useAcademyMessages = () => {
  const { user } = useAuth();
  const academyName = getAcademyName(user?.nombre_academia);

  const notify = useCallback((message: string) => {
    window.alert(academyMessage(academyName, message));
  }, [academyName]);

  const confirmAction = useCallback((message: string) => (
    window.confirm(academyMessage(academyName, message))
  ), [academyName]);

  return { academyName, confirmAction, notify };
};
