import type { Metadata } from 'next'
import { ReactNode } from 'react'
import { Geist, Geist_Mono, Montserrat } from 'next/font/google'
import './globals.css'
import 'sileo/styles.css'
import { Header } from '@/components/navbar/Header'
import { Footer } from '@/components/layout/Footer'
import { SileoToaster } from '@/components/SileoToaster'
import { MobileNav } from '@/components/navbar/MobileNav'
import { ThemeProvider } from '@/components/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RedirectGuard } from '@/components/RedirectGuard'
import { OfflineBanner } from '@/components/OfflineBanner'
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

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
      <body className="min-h-full flex flex-col items-center" suppressHydrationWarning>
      <Analytics />
      <SpeedInsights />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SileoToaster />
            <RedirectGuard>
              <Header />
              <main className="flex-1 w-full pt-[4.5rem]">
                <OfflineBanner />
                <div className="max-w-7xl mx-auto py-6 px-4 md:px-6 md:py-10">
                  {children}
                </div>
              </main>
              <Footer />
              <MobileNav />
            </RedirectGuard>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
