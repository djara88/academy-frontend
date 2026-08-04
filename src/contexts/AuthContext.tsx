import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../config/supabase';

interface User {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  academia_id?: string | null;
  nombre_academia?: string;
  logo_url?: string;
  requiere_cambio_password?: boolean;
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        
        const { data: usuarioBD } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

        const currentPath = window.location.pathname;
        const isMasterAdmin = session.user.email?.toLowerCase() === 'd.jarazerene@gmail.com';

        let newUser: User;

        if (usuarioBD) {
          newUser = {
            id: usuarioBD.id,
            email: session.user.email || '',
            nombre_completo: usuarioBD.nombre_completo || 'Usuario',
            rol: usuarioBD.rol || 'director',
            academia_id: usuarioBD.academia_id,
            nombre_academia: usuarioBD.academias?.nombre,
            logo_url: usuarioBD.academias?.logo,
            requiere_cambio_password: usuarioBD.requiere_cambio_password
          };
        } else if (isMasterAdmin) {
          // 🛡️ PASE VIP: Si la BD falla o no te encuentra, te construye en memoria
          newUser = {
            id: session.user.id,
            email: session.user.email || '',
            nombre_completo: 'Control Maestro SaaS',
            rol: 'superadmin',
            academia_id: null,
            requiere_cambio_password: false
          };
        } else {
          // Si es un cliente real y no tiene perfil, lo mandamos a crearlo
          if (currentPath !== '/completar-perfil') {
            window.location.href = '/completar-perfil';
          }
          setLoading(false);
          return;
        }

        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));

        // REDIRECCIÓN INTELIGENTE
        if (currentPath === '/' || currentPath === '/login' || currentPath === '/registro') {
          if (newUser.rol === 'SUPER_ADMIN' || newUser.rol === 'superadmin' || isMasterAdmin) {
            window.location.href = '/admin'; // El jefe SIEMPRE va aquí
          } else if (newUser.requiere_cambio_password) {
            window.location.href = '/cambiar-password';
          } else {
            window.location.href = '/dashboard';
          }
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) throw authError;

      const { data: usuarioBD } = await supabase
        .from('usuarios')
        .select('*, academias(nombre, logo)')
        .eq('id', authData.user.id)
        .maybeSingle();

      const isMasterAdmin = authData.user.email?.toLowerCase() === 'd.jarazerene@gmail.com';
      let newUser: User;

      if (usuarioBD) {
        newUser = {
          id: usuarioBD.id,
          email: authData.user.email || '',
          nombre_completo: usuarioBD.nombre_completo || 'Usuario',
          rol: usuarioBD.rol || 'director',
          academia_id: usuarioBD.academia_id,
          nombre_academia: usuarioBD.academias?.nombre,
          logo_url: usuarioBD.academias?.logo,
          requiere_cambio_password: usuarioBD.requiere_cambio_password
        };
      } else if (isMasterAdmin) {
        // 🛡️ PASE VIP EN LOGIN MANUAL
        newUser = {
          id: authData.user.id,
          email: authData.user.email || '',
          nombre_completo: 'Control Maestro SaaS',
          rol: 'superadmin',
          academia_id: null,
          requiere_cambio_password: false
        };
      } else {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      const newToken = authData.session.access_token;

      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));

    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Credenciales inválidas');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    localStorage.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
