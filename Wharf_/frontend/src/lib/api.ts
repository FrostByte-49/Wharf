import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import { getEphemeralByokHeaders } from './ephemeralByok';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787/api',
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  } else {
    Object.entries(getEphemeralByokHeaders()).forEach(([header, value]) => {
      config.headers.set(header, value);
    });
  }
  return config;
});

// Handle Global 401 Unauthorized Errors (e.g. JWT Expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Dispatch Global Event So The UI Can Toast And Redirect Cleanly
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    if (error.response && error.response.status === 429) {
      const defaultMsg = 'Too Many Requests';
      let message = error.response.data?.error || error.response.data?.message || defaultMsg;
      
      // Convert Message To Title Case
      message = message.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

      window.dispatchEvent(new CustomEvent('api:rate-limit', { detail: { message } }));
    }

    return Promise.reject(error);
  }
);

export default api;
