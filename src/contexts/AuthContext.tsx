import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axiosConfig';
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
    // 1. Cargar usuario inicial de localStorage (Para el login manual)
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedToken) {
      setToken(storedToken);
    }

    // 2. Escuchar activamente la sesión de Supabase Auth (Para las academias con Google)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        
        const { data: usuarioBD } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

        const currentPath = window.location.pathname;

        if (usuarioBD) {
          const newUser: User = {
            id: usuarioBD.id,
            email: session.user.email || '',
            nombre_completo: usuarioBD.nombre_completo || 'Usuario',
            rol: usuarioBD.rol || 'director',
            academia_id: usuarioBD.academia_id,
            nombre_academia: usuarioBD.academias?.nombre,
            logo_url: usuarioBD.academias?.logo,
            requiere_cambio_password: usuarioBD.requiere_cambio_password
          };

          setUser(newUser);
          localStorage.setItem('user', JSON.stringify(newUser));

          // REDIRECCIÓN INTELIGENTE GENERAL
          if (currentPath === '/' || currentPath === '/login' || currentPath === '/registro') {
            if (newUser.rol === 'SUPER_ADMIN' || newUser.email === 'd.jarazerene@gmail.com') {
              window.location.href = '/admin'; // El admin va a su panel
            } else if (newUser.requiere_cambio_password) {
              window.location.href = '/cambiar-password';
            } else {
              window.location.href = '/dashboard'; // Directores van a su academia
            }
          }
        } else {
          // Si el usuario es nuevo de Google y NO está en la BD, va a crear su academia
          if (currentPath !== '/completar-perfil') {
            window.location.href = '/completar-perfil';
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
      // ESTE ES TU LOGIN MANUAL (CORREO Y CONTRASEÑA)
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
