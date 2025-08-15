import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"
import { API_CONFIG } from "../config/constants"
import toast from "react-hot-toast"

export type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

let isRefreshing = false
let failedQueue: Array<{
  resolve: (cfg: InternalAxiosRequestConfig) => void
  reject: (err: any) => void
  config: RetryConfig
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error)
    } else {
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`)
      }
      resolve(config)
    }
  })
  failedQueue = []
}

const createApiInstance = (baseURL: string) => {
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  })

  // Request interceptor - Attach JWT token
  instance.interceptors.request.use(
    (config: RetryConfig) => {
      const token = localStorage.getItem("token")
      if (token) {
        const cleanToken = token.replace(/^"(.*)"$/, "$1").trim()
        config.headers.set("Authorization", `Bearer ${cleanToken}`)
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  // Response interceptor - Handle token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (err: AxiosError & { config?: RetryConfig }) => {
      const error = err
      const original = error.config as RetryConfig

      if (error.response?.status === 401 && original && !original._retry) {
        // No intentar refresh en rutas de auth
        if (original.url?.includes("/auth/")) {
          return Promise.reject(error)
        }

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject, config: original })
          }).then((cfg) => instance(cfg))
        }

        original._retry = true
        isRefreshing = true

        try {
          // Intentar refresh del token
          const refreshResponse = await axios.post(
            `${API_CONFIG.BACKEND1_URL}/api/auth/refresh-token`,
            {},
            {
              headers: {
                Authorization: `Bearer ${localStorage
                  .getItem("token")
                  ?.replace(/^"(.*)"$/, "$1")
                  .trim()}`,
              },
            },
          )

          const newToken = refreshResponse.data.token
          if (!newToken) throw new Error("No token received")

          localStorage.setItem("token", newToken)
          instance.defaults.headers.common["Authorization"] = `Bearer ${newToken}`
          processQueue(null, newToken)

          return instance(original)
        } catch (refreshError) {
          processQueue(refreshError, null)
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          toast.error("Sesión expirada. Por favor, inicia sesión nuevamente.")
          window.location.href = "/login?session_expired=1"
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      }

      return Promise.reject(error)
    },
  )

  return instance
}

export const backend1Api = createApiInstance(API_CONFIG.BACKEND1_URL)
export const backend2Api = createApiInstance(API_CONFIG.BACKEND2_URL)

export const handleApiError = (err: any): string => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const data = err.response?.data

    if (status === 401) return "Sesión expirada. Por favor, inicia sesión nuevamente."
    if (status === 403) return "No tienes permisos para realizar esta acción."
    if (status === 400)
      return Array.isArray(data?.errors) ? data.errors.join(", ") : data.message || "Solicitud inválida."
    if (status && status >= 500) return "Error del servidor. Por favor, intenta más tarde."

    return err.message || "Error de conexión."
  }

  return "Error desconocido."
}
