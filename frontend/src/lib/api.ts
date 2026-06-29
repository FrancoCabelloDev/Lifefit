import { getToken, getRefreshToken, setTokens, clearAuth, dispatchAuthEvent } from "./auth"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type RequestOptions = {
  method?: Method
  body?: unknown
  params?: Record<string, string>
  authenticated?: boolean
  formData?: boolean
}

export class ApiError extends Error {
  status: number
  data: unknown
  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.access, data.refresh || refresh)
    return true
  } catch {
    return false
  }
}

export async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, params, authenticated = true, formData = false } = opts

  const url = new URL(`${API_BASE}${endpoint}`)
  if (params) {
    url.search = new URLSearchParams(params).toString()
  }

  const headers: Record<string, string> = {}
  if (!formData) {
    headers["Content-Type"] = "application/json"
  }
  if (authenticated) {
    const token = getToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }
  }

  let response = await fetch(url.toString(), {
    method,
    headers,
    body: formData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })

  if (response.status === 401 && authenticated) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getToken()}`
      response = await fetch(url.toString(), {
        method,
        headers,
        body: formData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      })
    } else {
      clearAuth()
      dispatchAuthEvent()
      if (typeof window !== "undefined") {
        window.location.href = "/ingresar"
      }
      throw new ApiError("Sesión expirada", 401)
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const data = await response.json()

  if (!response.ok) {
    throw new ApiError(
      data?.detail ?? data?.message ?? `Error ${response.status}`,
      response.status,
      data,
    )
  }

  return data as T
}

// Descarga un archivo autenticado y lo dispara como descarga en el browser
export async function downloadFile(endpoint: string, filename: string): Promise<void> {
  const { getToken } = await import("./auth")
  const token = getToken()
  const url = `${API_BASE}${endpoint}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(objectUrl)
}

// Convierte URLs relativas de media (ej: "media/gyms/logos/x.png") a absolutas
// apuntando al backend. En producción con Cloudinary ya vienen absolutas (https://...)
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith("http://") || url.startsWith("https://")) return url
  const base = API_BASE.replace(/\/$/, "")
  return `${base}/${url.replace(/^\//, "")}`
}

export const api = {
  get: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: "GET" }),

  post: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: "POST", body }),

  put: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: "PUT", body }),

  patch: <T>(url: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: "PATCH", body }),

  delete: <T>(url: string, opts?: RequestOptions) =>
    request<T>(url, { ...opts, method: "DELETE" }),
}
