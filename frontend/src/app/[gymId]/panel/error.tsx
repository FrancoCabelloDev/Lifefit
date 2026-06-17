'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Panel Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="rounded-full bg-red-50 p-4">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Algo salió mal</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-sm">
          {error.message || 'Ocurrió un error inesperado al cargar esta página.'}
        </p>
      </div>
      <Button onClick={reset} variant="outline" size="sm">
        Intentar de nuevo
      </Button>
    </div>
  )
}
