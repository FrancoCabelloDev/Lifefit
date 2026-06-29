export const KEYS = {
  ACCESS: "lifefit_access_token",
  REFRESH: "lifefit_refresh_token",
  USER: "lifefit_user",
  ADMIN_BACKUP: "lifefit_admin_backup",   // legacy — mantenido para compatibilidad
  SESSION_STACK: "lifefit_session_stack", // nuevo: pila de sesiones anidadas
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
  try {
    const raw = localStorage.getItem(KEYS.USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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

// ── Session stack (soporta impersonation anidada ilimitada) ───────────────────

type StackEntry = { access: string; refresh: string; user: Record<string, unknown> }

function getStack(): StackEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(KEYS.SESSION_STACK)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStack(stack: StackEntry[]): void {
  localStorage.setItem(KEYS.SESSION_STACK, JSON.stringify(stack))
}

// Guarda la sesión activa en el stack antes de impersonar
export function backupAdminTokens(): void {
  if (typeof window === "undefined") return
  const access = localStorage.getItem(KEYS.ACCESS)
  const refresh = localStorage.getItem(KEYS.REFRESH)
  const rawUser = localStorage.getItem(KEYS.USER)
  if (!access || !refresh || !rawUser) return
  const stack = getStack()
  try {
    stack.push({ access, refresh, user: JSON.parse(rawUser) })
  } catch {
    stack.push({ access, refresh, user: {} })
  }
  saveStack(stack)
}

// Devuelve la sesión anterior (tope del stack) sin removerla
export function getAdminBackup(): { access: string; refresh: string; user: Record<string, unknown> } | null {
  const stack = getStack()
  return stack.length > 0 ? stack[stack.length - 1] : null
}

// Restaura la sesión anterior haciendo pop del stack
export function restoreAdminTokens(): boolean {
  const stack = getStack()
  if (stack.length === 0) return false
  const prev = stack.pop()!
  saveStack(stack)
  localStorage.setItem(KEYS.ACCESS, prev.access)
  localStorage.setItem(KEYS.REFRESH, prev.refresh)
  localStorage.setItem(KEYS.USER, JSON.stringify(prev.user))
  // Limpiar legacy key si existe
  localStorage.removeItem(KEYS.ADMIN_BACKUP)
  return true
}
