import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Lifefit',
  description: 'Plataforma PWA de entrenamiento y gamificación',
  themeColor: '#0f172a',
  icons: {
    icon: '/icons/icon-192.png',     // favicon general
    apple: '/icons/icon-192.png',    // icono para iOS (Add to Home Screen)
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
