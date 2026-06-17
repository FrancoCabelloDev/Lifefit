'use client'
import { use } from 'react'
import { redirect } from 'next/navigation'

// El contenido de Nivel y Puntos vive en /mi-progreso (tab "Nivel y Puntos").
// Esta ruta se mantiene como redirect para no romper enlaces antiguos.
export default function MiNivelRedirect({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  redirect(`/${gymId}/panel/mi-progreso`)
}
