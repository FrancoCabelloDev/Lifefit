'use client'
import { use } from 'react'
import { redirect } from 'next/navigation'

// La racha vive en /mis-logros ("Logros y Racha").
// Esta ruta se mantiene como redirect para no romper enlaces antiguos.
export default function MiRachaRedirect({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  redirect(`/${gymId}/panel/mis-logros`)
}
