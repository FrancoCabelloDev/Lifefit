'use client'

import { DashboardAuthProvider } from '@/hooks/useDashboardAuth'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <DashboardAuthProvider>{children}</DashboardAuthProvider>
}
