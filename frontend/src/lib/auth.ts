export const KEYS = {
  ACCESS: "lifefit_access_token",
  REFRESH: "lifefit_refresh_token",
  USER: "lifefit_user",
  ADMIN_BACKUP: "lifefit_admin_backup",
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

export function backupAdminTokens(): void {
  if (typeof window === "undefined") return
  const access = localStorage.getItem(KEYS.ACCESS)
  const refresh = localStorage.getItem(KEYS.REFRESH)
  const rawUser = localStorage.getItem(KEYS.USER)
  if (access && refresh && rawUser) {
    localStorage.setItem(KEYS.ADMIN_BACKUP, JSON.stringify({ access, refresh, user: JSON.parse(rawUser) }))
  }
}

export function getAdminBackup(): { access: string; refresh: string; user: { role: string } } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(KEYS.ADMIN_BACKUP)
  return raw ? JSON.parse(raw) : null
}

export function restoreAdminTokens(): boolean {
  const backup = getAdminBackup()
  if (!backup) return false
  localStorage.setItem(KEYS.ACCESS, backup.access)
  localStorage.setItem(KEYS.REFRESH, backup.refresh)
  localStorage.setItem(KEYS.USER, JSON.stringify(backup.user))
  localStorage.removeItem(KEYS.ADMIN_BACKUP)
  return true
}
