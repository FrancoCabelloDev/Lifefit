'use client'

import { DashboardAuthProvider } from '@/hooks/useDashboardAuth'
import { ThemeProvider, type Theme } from '@/hooks/useTheme'

export default function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <DashboardAuthProvider>{children}</DashboardAuthProvider>
    </ThemeProvider>
  )
}
