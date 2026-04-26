'use client'

import StaffList from '@/components/team/StaffList'

export default function NutritionistsPage() {
  return (
    <StaffList 
      role="nutritionist" 
      title="Departamento de Nutrición" 
      description="Gestiona a los especialistas encargados de los planes de alimentación de los socios." 
    />
  )
}
