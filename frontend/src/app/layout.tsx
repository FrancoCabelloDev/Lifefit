import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const themeInitializer = `
    (function() {
      try {
        var stored = localStorage.getItem('lifefit_theme');
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored ? stored : (prefersDark ? 'dark' : 'light');
        var root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme === 'dark' ? 'dark' : 'light');
        root.dataset.theme = theme;
      } catch (e) {}
    })();
  `;

  return (
    <html lang="es" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background text-foreground transition-colors`}>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {themeInitializer}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
