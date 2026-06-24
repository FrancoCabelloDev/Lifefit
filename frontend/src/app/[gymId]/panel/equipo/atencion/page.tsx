'use client'

import { useParams } from 'next/navigation'
import StaffList from '@/components/team/StaffList'
import { useRoleGuard } from '@/hooks/useRoleGuard'

export default function ReceptionistsPage() {
  const { gymId } = useParams<{ gymId: string }>()
  useRoleGuard(gymId, ['gym_admin', 'super_admin'])

  return (
    <StaffList 
      role="receptionist" 
      title="Atención al Cliente" 
      description="Gestiona al personal de recepción y soporte administrativo de tu gimnasio." 
    />
  )
}
