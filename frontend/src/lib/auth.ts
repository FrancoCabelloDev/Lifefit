export const KEYS = {
  ACCESS: "lifefit_access_token",
  REFRESH: "lifefit_refresh_token",
  USER: "lifefit_user",
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(KEYS.ACCESS)
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(KEYS.REFRESH)
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(KEYS.ACCESS, access)
  localStorage.setItem(KEYS.REFRESH, refresh)
}

export function clearAuth(): void {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEYS.USER)
  return raw ? JSON.parse(raw) : null
}

export function setStoredUser(user: unknown): void {
  localStorage.setItem(KEYS.USER, JSON.stringify(user))
}

export const AUTH_EVENT = "lifefit-auth-changed"

export function dispatchAuthEvent(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT))
  }
}
