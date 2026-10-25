import { useAuthStore } from '../stores/authStore';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8787/api',
});

api.interceptors.request.use((config) => {
  config.withCredentials = true;

  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    } else if (error.response?.status === 429) {
      const defaultMsg = 'Too Many Requests';
      let message =
        error.response.data?.error ||
        error.response.data?.message ||
        defaultMsg;

      message = message
        .split(' ')
        .map(
          (word: string) =>
            word.charAt(0).toUpperCase() +
            word.slice(1).toLowerCase()
        )
        .join(' ');

      window.dispatchEvent(
        new CustomEvent('api:rate-limit', {
          detail: { message },
        })
      );
    } else if (
      !error.response ||
      error.response.status >= 500
    ) {
      window.dispatchEvent(new CustomEvent('api:server-error'));
    }

    return Promise.reject(error);
  }
);

export default api;
