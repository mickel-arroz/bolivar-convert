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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex justify-center h-14">
      <div className="w-full max-w-7xl px-4 md:px-6 flex items-center justify-between h-full relative">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6 z-20">
          {/* Desktop: Title + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-foreground brand-font whitespace-nowrap">
                {SITE_CONFIG.name}
              </span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="transition-colors hover:text-foreground text-foreground/70"
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
