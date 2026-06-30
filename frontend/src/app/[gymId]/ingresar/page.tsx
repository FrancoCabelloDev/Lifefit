import { Suspense } from 'react'
import LoginForm from '../../../components/auth/LoginForm'

export default async function GymLoginPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = await params
  return (
    <Suspense>
      <LoginForm gymId={resolvedParams.gymId} />
    </Suspense>
  )
}
