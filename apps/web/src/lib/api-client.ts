import axios from 'axios'
import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { env } from './env.ts'

export interface ApiErrorPayload {
  message?: string
  statusCode?: number
  error?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  public readonly status: number
  public readonly data?: ApiErrorPayload
  public readonly isApiError = true

  constructor(message: string, status = 500, data?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * API configuration centralized in one place.
 * Better Auth uses session cookies, so withCredentials is true for all requests.
 */
export const API_CONFIG = {
  baseURL: `${env.VITE_API_URL.replace(/\/$/, '')}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
} as const

/**
 * Global reusable Axios client instance configured for cookie-based Better Auth session.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  headers: API_CONFIG.headers,
  withCredentials: API_CONFIG.withCredentials,
})

// ==========================================
// Request Interceptor
// ==========================================
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Better Auth authentication uses session cookies
    config.withCredentials = true
    return config
  },
  (error: unknown) => Promise.reject(error),
)

// ==========================================
// Response Interceptor & Unified Error Handling
// ==========================================
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const status = error.response?.status ?? 500
    const data = error.response?.data
    const message =
      data?.message ??
      error.message ??
      `Request failed with status code ${status}`

    return Promise.reject(new ApiError(message, status, data))
  },
)

/**
 * Type-safe helper for standard HTTP / QUERY methods
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
  query: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient
      .request<T>({
        url,
        method: 'QUERY',
        data,
        ...config,
      })
      .then((res) => res.data),
}

export default apiClient
