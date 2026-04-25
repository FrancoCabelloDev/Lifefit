import RegisterForm from '../../../components/auth/RegisterForm'

export default async function GymRegisterPage({ params }: { params: Promise<{ gymId: string }> }) {
  const resolvedParams = await params
  return <RegisterForm gymId={resolvedParams.gymId} />
}
