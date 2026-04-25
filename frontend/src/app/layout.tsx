import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

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
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#0a0a0a] text-white selection:bg-yellow-500/30`}>
        <Providers initialTheme="dark">{children}</Providers>
      </body>
    </html>
  )
}
