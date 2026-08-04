import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';

interface User {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  academia_id: string;
  nombre_academia?: string;
  logo_url?: string;
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

    // 2. Escuchar activamente la sesión de Supabase Auth (para logins con Google)
    // 🔥 AQUÍ ESTÁ LA CORRECCIÓN: Le pusimos un guion bajo a _event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Consultar la tabla de 'usuarios' en la BD para traer la academia_id correcta
        const { data: usuarioBD } = await supabase
          .from('usuarios')
          .select('*, academias(nombre, logo)')
          .eq('id', session.user.id)
          .maybeSingle();

        if (usuarioBD) {
          const newUser: User = {
            id: usuarioBD.id,
            email: session.user.email || '',
            nombre_completo: usuarioBD.nombre_completo || '',
            rol: usuarioBD.rol || 'director',
            academia_id: usuarioBD.academia_id,
            nombre_academia: usuarioBD.academias?.nombre,
            logo_url: usuarioBD.academias?.logo
          };

          setUser(newUser);
          localStorage.setItem('user', JSON.stringify(newUser));
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
