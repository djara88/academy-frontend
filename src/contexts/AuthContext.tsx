import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../config/supabase';
import { BRAND } from '../config/brand';
import { getPostAuthDestination } from '../utils/authDestination';

export interface User {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  academia_id?: string | null;
  nombre_academia?: string;
  logo_url?: string;
  requiere_cambio_password?: boolean;
  activo?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const MASTER_ADMIN_EMAIL = 'd.jarazerene@gmail.com';
const GOOGLE_LOGIN_INTENT_KEY = 'lestra_google_login_intent';

const isGoogleSession = (authUser: any) => {
  const provider = String(authUser?.app_metadata?.provider || '').toLowerCase();
  const providers = Array.isArray(authUser?.app_metadata?.providers)
    ? authUser.app_metadata.providers.map((item: unknown) => String(item).toLowerCase())
    : [];
  return provider === 'google' || providers.includes('google');
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearLocalSession = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
        if (event === 'TOKEN_REFRESHED' && session) {
          setToken(session.access_token);
          sessionStorage.setItem('token', session.access_token);
        }
        return;
      }

      if (!session?.user) {
        clearLocalSession();
        setLoading(false);
        return;
      }

      const isMasterAdmin = session.user.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
      let usuarioBD: any = null;

      if (!isMasterAdmin) {
        const { data, error: profileError } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          clearLocalSession();
          setLoading(false);
          return;
        }
        usuarioBD = data;
      }

      let newUser: User;

      if (isMasterAdmin) {
        newUser = {
          id: session.user.id,
          email: session.user.email || '',
          nombre_completo: session.user.user_metadata?.full_name || `Administración ${BRAND.name}`,
          rol: 'superadmin',
          academia_id: null,
          requiere_cambio_password: false,
        };
      } else if (usuarioBD) {
        if (usuarioBD.activo === false) {
          await supabase.auth.signOut();
          clearLocalSession();
          setLoading(false);
          return;
        }
        newUser = {
          id: usuarioBD.id,
          email: session.user.email || '',
          nombre_completo: usuarioBD.nombre_completo || 'Usuario',
          rol: usuarioBD.rol || 'director',
          academia_id: usuarioBD.academia_id,
          nombre_academia: usuarioBD.academias?.nombre,
          logo_url: usuarioBD.academias?.logo,
          requiere_cambio_password: usuarioBD.requiere_cambio_password,
          activo: usuarioBD.activo !== false,
        };
      } else if (isGoogleSession(session.user)) {
        newUser = {
          id: session.user.id,
          email: session.user.email || '',
          nombre_completo: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Director',
          rol: 'director',
          academia_id: null,
          requiere_cambio_password: false,
        };
      } else {
        await supabase.auth.signOut();
        clearLocalSession();
        setLoading(false);
        return;
      }

      setUser(newUser);
      setToken(session.access_token);
      sessionStorage.setItem('user', JSON.stringify(newUser));
      sessionStorage.setItem('token', session.access_token);
      setLoading(false);

      const shouldEnterApp =
        (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
        sessionStorage.getItem(GOOGLE_LOGIN_INTENT_KEY) === '1';

      if (shouldEnterApp) {
        sessionStorage.removeItem(GOOGLE_LOGIN_INTENT_KEY);
        window.location.replace(getPostAuthDestination(newUser));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const isMasterAdmin = authData.user.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
      let usuarioBD: any = null;

      if (!isMasterAdmin) {
        const { data, error: profileError } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        usuarioBD = data;
      }

      let newUser: User;

      if (isMasterAdmin) {
        newUser = {
          id: authData.user.id,
          email: authData.user.email || '',
          nombre_completo: authData.user.user_metadata?.full_name || `Administración ${BRAND.name}`,
          rol: 'superadmin',
          academia_id: null,
          requiere_cambio_password: false,
        };
      } else if (usuarioBD) {
        if (usuarioBD.activo === false) {
          await supabase.auth.signOut();
          throw new Error('ACCOUNT_DISABLED');
        }
        newUser = {
          id: usuarioBD.id,
          email: authData.user.email || '',
          nombre_completo: usuarioBD.nombre_completo || 'Usuario',
          rol: usuarioBD.rol || 'director',
          academia_id: usuarioBD.academia_id,
          nombre_academia: usuarioBD.academias?.nombre,
          logo_url: usuarioBD.academias?.logo,
          requiere_cambio_password: usuarioBD.requiere_cambio_password,
          activo: usuarioBD.activo !== false,
        };
      } else {
        await supabase.auth.signOut();
        clearLocalSession();
        throw new Error('ACCOUNT_NOT_REGISTERED');
      }

      const newToken = authData.session.access_token;
      setToken(newToken);
      setUser(newUser);
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('user', JSON.stringify(newUser));
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof Error && ['ACCOUNT_DISABLED', 'ACCOUNT_NOT_REGISTERED'].includes(error.message)) {
        throw error;
      }
      throw new Error('Credenciales inválidas');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    sessionStorage.clear();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
