import axios from 'axios';
import { supabase } from '../config/supabase';
import { recordClientError } from '../observability/browserTelemetry';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    if (!status || status >= 500) {
      const failure = new Error(status
        ? `API request failed with status ${status}`
        : 'API network request failed');
      failure.name = 'ApiRequestError';
      recordClientError(failure, 'api');
    }
    return Promise.reject(error);
  },
);

export default api;
