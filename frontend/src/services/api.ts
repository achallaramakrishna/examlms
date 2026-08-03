import axios from 'axios';

// Overridable for production builds served from a subpath, e.g.
// VITE_API_BASE_URL=/examlms-api/api when nginx proxies that prefix to the
// backend. Local dev keeps the default, which Vite's own /api proxy handles.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    return Promise.reject(error);
  }
);
