import axios from 'axios';
import apiBaseUrl from '../config/apiBaseUrl';
import { AUTH_STORAGE_KEYS, clearAuthSession } from '../utils/auth';

const api = axios.create({
  baseURL: apiBaseUrl,
});

const publicAuthPaths = ['/api/auth/login', '/api/auth/register'];

// This automatically attaches your JWT Token to every request
api.interceptors.request.use((config) => {
  const requestUrl = config.url || '';
  if (publicAuthPaths.some((path) => requestUrl.includes(path))) {
    return config;
  }

  const token = localStorage.getItem('hrms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error?.config?.url || '';
    const isPublicAuthRequest = publicAuthPaths.some((path) => requestUrl.includes(path));

    if (error?.response?.status === 401 && !isPublicAuthRequest && !error?.config?.skipUnauthorizedEvent) {
      const alreadyInvalid = sessionStorage.getItem(AUTH_STORAGE_KEYS.invalidSession) === '1';
      clearAuthSession({ invalid: true });
      delete api.defaults.headers.common.Authorization;
      if (!alreadyInvalid) {
        window.dispatchEvent(new Event('hrms:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
