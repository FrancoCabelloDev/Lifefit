'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardAuthProvider } from '@/hooks/useDashboardAuth'
import { ThemeProvider, type Theme } from '@/hooks/useTheme'
import { Toaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialTheme={initialTheme}>
        <DashboardAuthProvider>{children}</DashboardAuthProvider>
      </ThemeProvider>
      <Toaster richColors closeButton position="bottom-right" />
    </QueryClientProvider>
  )
}
