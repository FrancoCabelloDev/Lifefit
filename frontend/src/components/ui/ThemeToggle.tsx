'use client'

import { useTheme } from '@/hooks/useTheme'
import { useEffect, useState } from 'react'

type ThemeToggleProps = {
  label?: string
  variant?: 'pill' | 'icon'
}

const iconLight = '☀️'
const iconDark = '🌙'

export default function ThemeToggle({ label, variant = 'pill' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = theme === 'dark'

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={`rounded-full border p-2 text-lg shadow-sm ${
          variant === 'pill' ? 'w-[120px] h-9' : 'h-9 w-9'
        } bg-slate-100 dark:bg-slate-800 animate-pulse`}
      />
    )
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label="Cambiar tema"
        onClick={toggleTheme}
        className="rounded-full border border-slate-200 bg-white/80 p-2 text-lg shadow hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        {isDark ? iconLight : iconDark}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-1 text-xs font-semibold text-slate-600 shadow hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
    >
      <span
        className={`text-base ${isDark ? 'text-amber-200' : 'text-emerald-500'}`}
      >
        {isDark ? iconLight : iconDark}
      </span>
      {label ?? (isDark ? 'Modo claro' : 'Modo oscuro')}
    </button>
  )
}
