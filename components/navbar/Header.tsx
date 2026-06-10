'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import {
  MoonIcon,
  SunIcon
} from '@/components/icons'

import { Button } from '@/components/ui/button'

import { SITE_CONFIG, NAV_ITEMS } from '@/constants/site'

export function Header() {
  const { setTheme, theme } = useTheme()

  return (
    <header className="sticky top-4 z-50 w-[calc(100%-2rem)] max-w-7xl mx-auto flex justify-center h-14 transition-all duration-500">
      <div className="w-full px-6 flex items-center justify-between h-full rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.5)] bg-background/60 backdrop-blur-md border border-border/50">
        {/* LEFT SECTION */}
        <div className="flex items-center gap-8 z-20">
          {/* Desktop: Title + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-black tracking-tighter text-foreground brand-font whitespace-nowrap">
                {SITE_CONFIG.name}
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-8 text-[11px] font-black uppercase tracking-widest">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-all hover:text-primary text-muted-foreground/80"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center z-20">
          <Button
            variant="ghost"
            className="w-9 px-0"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        
      </div>
    </header>
  )
}
