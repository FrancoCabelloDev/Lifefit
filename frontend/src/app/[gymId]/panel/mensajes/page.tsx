'use client'
import { use } from 'react'
import { redirect } from 'next/navigation'

export default function MensajesRedirect({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  redirect(`/${gymId}/panel/mensajes-nutricionista`)
}
