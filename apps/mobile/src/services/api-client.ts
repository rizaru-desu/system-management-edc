import axios from "axios";
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL, API_CONFIG, getAppOrigin } from "@/config/api";

export interface ApiErrorPayload {
  message?: string;
  statusCode?: number;
  error?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: ApiErrorPayload;
  public readonly isApiError = true;

  constructor(message: string, status = 500, data?: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Re-export API_BASE_URL and API_CONFIG from centralized config
export { API_BASE_URL, API_CONFIG };

/**
 * Global reusable Axios client instance for Mobile App
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  withCredentials: API_CONFIG.withCredentials,
});

// ==========================================
// Request Interceptor
// ==========================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Better Auth authentication uses session cookies
    config.withCredentials = true;

    // React Native / Axios does not attach Origin header by default.
    // Better Auth's CSRF protection requires an Origin header matching trustedOrigins.
    const origin = getAppOrigin();
    if (origin) {
      config.headers.set('Origin', origin);
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ==========================================
// Response Interceptor & Unified Error Handling
// ==========================================
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status ?? 500;
    const data = error.response?.data;
    const message =
      data?.message ||
      error.message ||
      `Request failed with status code ${status}`;

    return Promise.reject(new ApiError(message, status, data));
  },
);

/**
 * Type-safe helper for standard HTTP methods
 */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export default apiClient;
