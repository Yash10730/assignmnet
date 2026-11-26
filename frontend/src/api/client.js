import axios from 'axios';

const TOKEN_KEY = 'helpdesk_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

/** Extracts a readable message (including field errors) from an API error. */
export function errorMessage(err) {
  const e = err.response?.data?.error;
  if (!e) return err.message || 'Something went wrong';
  if (e.details?.length) return e.details.map((d) => `${d.field}: ${d.message}`).join(' • ');
  return e.message;
}

export default api;
