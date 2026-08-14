import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AdminTheme = 'dark' | 'light';
type Value = { theme: AdminTheme; setTheme: (theme: AdminTheme) => void; toggleTheme: () => void };
const AdminThemeContext = createContext<Value | null>(null);

export const AdminThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<AdminTheme>(() => localStorage.getItem('syncademia-admin-theme') === 'light' ? 'light' : 'dark');
  const setTheme = (next: AdminTheme) => {
    localStorage.setItem('syncademia-admin-theme', next);
    setThemeState(next);
  };
  useEffect(() => { document.documentElement.dataset.adminTheme = theme; }, [theme]);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }), [theme]);
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
};

export const useAdminTheme = () => {
  const value = useContext(AdminThemeContext);
  if (!value) throw new Error('useAdminTheme debe usarse dentro de AdminThemeProvider');
  return value;
};

