'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MisRutinasPage({ params }: { params: Promise<{ gymId: string }> }) {
  const { gymId } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/${gymId}/panel/mi-plan-semanal`)
  }, [gymId, router])

  return null
}
