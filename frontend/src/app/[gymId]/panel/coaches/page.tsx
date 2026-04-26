'use client'

import StaffList from '@/components/team/StaffList'

export default function CoachesPage() {
  return (
    <StaffList 
      role="coach" 
      title="Cuerpo Técnico" 
      description="Gestiona a los entrenadores encargados de las rutinas y el progreso de los atletas." 
    />
  )
}
