import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';

interface User {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  academia_id?: string | null; // 🔥 Hacemos que sea opcional para el SuperAdmin
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
    // 1. Cargar usuario inicial de localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }

    // 2. Escuchar activamente la sesión de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Consultar la tabla de 'usuarios' en la BD
        const { data: usuarioBD } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

        const currentPath = window.location.pathname;
        const isMasterAdmin = session.user.email === 'd.jarazerene@gmail.com';

        if (usuarioBD) {
          const newUser: User = {
            id: usuarioBD.id,
            email: session.user.email || '',
            nombre_completo: usuarioBD.nombre_completo || 'Administrador',
            rol: usuarioBD.rol || 'director',
            academia_id: usuarioBD.academia_id,
            nombre_academia: usuarioBD.academias?.nombre,
            logo_url: usuarioBD.academias?.logo,
            requiere_cambio_password: usuarioBD.requiere_cambio_password
          };

          setUser(newUser);
          localStorage.setItem('user', JSON.stringify(newUser));

          // REDIRECCIÓN INTELIGENTE
          if (currentPath === '/' || currentPath === '/login' || currentPath === '/registro') {
            if (isMasterAdmin || newUser.rol === 'SUPER_ADMIN') {
              window.location.href = '/admin'; // Va al panel Maestro
            } else if (newUser.requiere_cambio_password) {
              window.location.href = '/cambiar-password';
            } else {
              window.location.href = '/dashboard';
            }
          }

        } else {
          // 🔥 EL USUARIO NO EXISTE EN LA TABLA 'usuarios'
          if (isMasterAdmin) {
            // 🛡️ AUTO-RESCATE DEL SUPER ADMIN: 
            // Si d.jarazerene se borró por error, el sistema lo vuelve a crear como Dios del sistema
            await supabase.from('usuarios').insert([{
              id: session.user.id,
              email: session.user.email,
              nombre_completo: 'Control Maestro SaaS',
              rol: 'SUPER_ADMIN',
              requiere_cambio_password: false
            }]);

            // Forzamos la entrada a su panel
            window.location.href = '/admin';
          } else {
            // Si es un usuario normal (Director de Academia), lo mandamos a completar su perfil
            if (currentPath !== '/completar-perfil') {
              window.location.href = '/completar-perfil';
            }
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
      const response = await api.post('/api/login', { email, password });
      const { token, user } = response.data;
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
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
