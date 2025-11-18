'use client'

import { DashboardAuthProvider } from '@/hooks/useDashboardAuth'
import { ThemeProvider } from '@/hooks/useTheme'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardAuthProvider>{children}</DashboardAuthProvider>
    </ThemeProvider>
  )
}
