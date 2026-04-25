import type { Metadata, Viewport } from 'next'
import { Lexend, Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const lexend = Lexend({
  variable: '--font-lexend',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
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
  themeColor: '#F8F9FA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
      </head>
      <body className={`${lexend.variable} ${inter.variable} min-h-screen bg-background text-foreground font-sans selection:bg-secondary/30`}>
        <Providers initialTheme="light">{children}</Providers>
      </body>
    </html>
  )
}
