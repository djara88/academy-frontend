import api from '../api/axiosConfig';

export const SAAS_ACADEMIES_QUERY_KEY = ['saas-academias'] as const;

export const fetchSaasAcademies = async <T = unknown[]>() => {
  const response = await api.get('/api/academias');
  return response.data as T;
};
