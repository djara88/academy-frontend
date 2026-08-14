import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { getAcademyName } from '../config/brand';

export const useAcademyMessages = () => {
  const { user } = useAuth();
  const dialog = useAppDialog();
  const academyName = getAcademyName(user?.nombre_academia);

  const notify = useCallback((message: string) => {
    return dialog.notify(message, { title: academyName });
  }, [academyName, dialog]);

  const confirmAction = useCallback((message: string, tone: 'default' | 'danger' = 'default') => (
    dialog.confirmAction(message, { title: academyName, tone })
  ), [academyName, dialog]);

  return { academyName, confirmAction, notify };
};
