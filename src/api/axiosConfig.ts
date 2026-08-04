import axios from 'axios';
import { supabase } from '../config/supabase'; // 🔥 Importamos supabase directamente

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el token en CADA petición
api.interceptors.request.use(
  async (config) => {
    // 🔥 Le pedimos la sesión actual y oficial directamente a Supabase
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
