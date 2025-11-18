'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'lifefit_theme'
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const persistTheme = (value: Theme) => {
  if (typeof document === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch (error) {
    console.error(error)
  }
  document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=31536000`
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(value === 'dark' ? 'dark' : 'light')
  root.dataset.theme = value
}

export function ThemeProvider({ children, initialTheme = 'light' }: { children: React.ReactNode; initialTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
    return initialTheme
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    persistTheme(theme)
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
