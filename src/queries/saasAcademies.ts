import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';

export const SAAS_ACADEMIES_QUERY_KEY = ['saas-academias'] as const;

export const fetchSaasAcademies = async <T = unknown[]>() => {
  const { data, error } = await supabase.rpc('get_saas_academies_admin');
  if (!error && Array.isArray(data)) return data as T;

  // Fallback compatible: si la RPC todavía no está desplegada o Supabase falla,
  // conserva exactamente el flujo actual mediante Render.
  const response = await api.get('/api/academias');
  return response.data as T;
};
