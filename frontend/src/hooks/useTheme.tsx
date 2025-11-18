'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'lifefit_theme'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getPreferredTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== 'undefined' ? (document.documentElement.classList.contains('dark') ? 'dark' : 'light') : 'light',
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, theme)
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme === 'dark' ? 'dark' : 'light')
    root.dataset.theme = theme
  }, [theme])

  const setTheme = (value: Theme) => {
    setThemeState(value === 'dark' ? 'dark' : 'light')
  }

  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
