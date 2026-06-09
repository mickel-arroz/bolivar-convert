import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Geist, Geist_Mono, Montserrat } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileNav } from '@/components/MobileNav'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['800']
})

export const metadata: Metadata = {
  title: 'Bolívar Convert',
  description: 'Tasas de cambio del Banco Central de Venezuela y Binance',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg'
  },
  openGraph: {
    title: 'Bolívar Convert',
    description: 'Consulta el valor del Bolívar respecto al Dólar (BCV), Euro (BCV) y Binance P2P en tiempo real.',
    url: 'https://bolivar-convert.vercel.app',
    siteName: 'Bolívar Convert',
    locale: 'es_VE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bolívar Convert',
    description: 'Tasas de cambio del Banco Central de Venezuela y Binance en tiempo real.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bolívar Convert'
  },
  formatDetection: {
    telephone: false
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col items-center">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Header />
            <main className="flex-1 w-full max-w-7xl py-6 px-4 md:px-6 md:py-10">
              {children}
            </main>
            <Footer />
            <MobileNav />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
