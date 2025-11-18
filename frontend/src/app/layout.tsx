import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { headers } from 'next/headers'
import './globals.css'
import Providers from './providers'

const STORAGE_KEY = 'lifefit_theme'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Lifefit',
  description: 'Plataforma PWA de entrenamiento y gamificacion',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

async function getServerTheme(): Promise<'light' | 'dark'> {
  try {
    const headerList = await headers()
    const cookieHeader = headerList.get('cookie') ?? ''
    const match = cookieHeader.match(/(?:^|;\s*)lifefit_theme=(dark|light)/)
    if (match && (match[1] === 'dark' || match[1] === 'light')) {
      return match[1]
    }
  } catch (error) {
    console.warn('Theme cookie read failed', error)
  }
  return 'light'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialTheme = await getServerTheme()

  const themeInitializer = `
    (function() {
      try {
        var defaultTheme = '${initialTheme}';
        var cookieMatch = document.cookie.match(/(?:^|; )${STORAGE_KEY}=([^;]+)/);
        var cookieTheme = cookieMatch ? cookieMatch[1] : null;
        var stored = null;
        try {
          stored = localStorage.getItem('${STORAGE_KEY}');
        } catch (err) {}
        var theme = stored || cookieTheme || defaultTheme;
        localStorage.setItem('${STORAGE_KEY}', theme);
        document.cookie = '${STORAGE_KEY}=' + theme + '; path=/; max-age=31536000';
        var root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme === 'dark' ? 'dark' : 'light');
        root.dataset.theme = theme;
      } catch (e) {}
    })();
  `

  return (
    <html lang="es" className={initialTheme} data-theme={initialTheme} suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground transition-colors`}>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializer}
        </Script>
        <Providers initialTheme={initialTheme}>{children}</Providers>
      </body>
    </html>
  )
}
