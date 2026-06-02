import { toast } from 'sonner'
import { ApiError } from './api'

export function showError(err: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (err instanceof ApiError) {
    const data = err.data as Record<string, unknown> | undefined
    const detail = data?.detail || data?.message || ''
    toast.error(String(detail) || fallback)
  } else if (err instanceof Error) {
    toast.error(err.message || fallback)
  } else {
    toast.error(fallback)
  }
}

export function showSuccess(message: string) {
  toast.success(message)
}

export function showPromise<T>(promise: Promise<T>, messages: { loading: string; success: string; error?: string }) {
  return toast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error || 'Error al procesar la solicitud.',
  })
}
