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
    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 🔥 LA MAGIA CONTRA RECARGAS: Ignorar eventos de refresco de pestaña
      // Solo consultamos la BD en el login o carga inicial
      if (event !== 'INITIAL_SESSION' && event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') {
        if (event === 'TOKEN_REFRESHED' && session) {
          setToken(session.access_token);
          sessionStorage.setItem('token', session.access_token);
        }
        return; // Salimos de aquí, no volvemos a consultar la base de datos
      }

      if (session?.user) {
        const { data: usuarioBD } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

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
          newUser = {
            id: session.user.id,
            email: session.user.email || '',
            nombre_completo: 'Control Maestro SaaS',
            rol: 'superadmin',
            academia_id: null,
            requiere_cambio_password: false
          };
        } else {
          newUser = {
            id: session.user.id,
            email: session.user.email || '',
            nombre_completo: session.user.user_metadata?.full_name || 'Nuevo Usuario',
            rol: 'director',
            academia_id: null,
            requiere_cambio_password: false
          };
        }

        setUser(newUser);
        setToken(session.access_token);
        sessionStorage.setItem('user', JSON.stringify(newUser));
        sessionStorage.setItem('token', session.access_token);
        
        // ❌ ELIMINAMOS los window.location.href. Dejamos que App.tsx haga el ruteo suave.
      } else {
        setUser(null);
        setToken(null);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
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
        newUser = {
          id: authData.user.id,
          email: authData.user.email || '',
          nombre_completo: 'Control Maestro SaaS',
          rol: 'superadmin',
          academia_id: null,
          requiere_cambio_password: false
        };
      } else {
        newUser = {
          id: authData.user.id,
          email: authData.user.email || '',
          nombre_completo: authData.user.user_metadata?.full_name || 'Nuevo Usuario',
          rol: 'director',
          academia_id: null,
          requiere_cambio_password: false
        };
      }

      const newToken = authData.session.access_token;
      setToken(newToken);
      setUser(newUser);
      sessionStorage.setItem('token', newToken);
      sessionStorage.setItem('user', JSON.stringify(newUser));

    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Credenciales inválidas');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    sessionStorage.clear();
    window.location.href = '/login'; // En logout SÍ es sano limpiar todo de golpe
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
