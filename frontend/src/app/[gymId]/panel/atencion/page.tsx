'use client'

import StaffList from '@/components/team/StaffList'

export default function ReceptionistsPage() {
  return (
    <StaffList 
      role="receptionist" 
      title="Atención al Cliente" 
      description="Gestiona al personal de recepción y soporte administrativo de tu gimnasio." 
    />
  )
}
