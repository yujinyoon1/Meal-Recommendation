import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:9534/api';

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

let onUnauthorized: (() => Promise<string | null>) | null = null;
let getAccessToken: (() => string | null) | null = null;

export function configureClient(opts: {
  onUnauthorized: () => Promise<string | null>;
  getAccessToken: () => string | null;
}) {
  onUnauthorized = opts.onUnauthorized;
  getAccessToken = opts.getAccessToken;
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true, // refresh httpOnly cookie
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken?.();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      onUnauthorized
    ) {
      original._retried = true;
      const newToken = await onUnauthorized();
      if (newToken) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
        return api.request(original);
      }
    }
    return Promise.reject(error);
  },
);
