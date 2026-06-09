'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Menu, Moon, Sun, TrendingUp, Code, User, Layout } from '@/components/icons'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from '@/components/ui/sheet'

import { SITE_CONFIG } from '@/constants/site'

export function Header() {
  const { setTheme, theme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 flex justify-center h-14">
      <div className="w-full max-w-7xl px-4 md:px-6 flex items-center justify-between h-full relative">
        
        {/* LEFT SECTION */}
        <div className="flex items-center gap-6 z-20">
          {/* Desktop: Title + Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-extrabold tracking-tight text-foreground brand-font whitespace-nowrap">
                {SITE_CONFIG.name}
              </span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/"
                className="transition-colors hover:text-foreground text-foreground/70"
              >
                Tasas
              </Link>
            </nav>
          </div>

          {/* Mobile: Burger Menu only */}
          <div className="md:hidden flex items-center">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    className="px-2 text-base hover:bg-muted focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                }
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </SheetTrigger>
              <SheetContent
                side="top"
                className="w-screen h-[100dvh] p-0 flex flex-col border-none bg-background/20 backdrop-blur-3xl transition-all duration-500 pointer-events-auto"
              >
                <div className="flex items-center justify-between p-4 border-b border-foreground/5 bg-background/10">
                  <SheetTitle>
                    <Link href="/" className="flex items-center">
                      <span className="text-xl font-extrabold tracking-tight text-foreground brand-font">
                        {SITE_CONFIG.name}
                      </span>
                    </Link>
                  </SheetTitle>
                </div>

                {/* Main centered option */}
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Link
                    href="/"
                    className="text-5xl font-black text-foreground transition-all hover:scale-105 active:scale-95 flex items-center gap-6 py-8"
                  >
                    <TrendingUp className="w-12 h-12 text-primary" />
                    Tasas
                  </Link>
                </div>

                {/* Minimalist Fixed Footer in Menu */}
                <div className="mt-auto w-full pb-16 pt-8 flex justify-center items-center gap-12 border-t border-foreground/5 bg-background/20">
                  <a
                    href={SITE_CONFIG.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-all">
                      <Code className="w-5 h-5" />
                    </div>
                    GitHub
                  </a>
                  <a
                    href={SITE_CONFIG.links.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center group-hover:bg-foreground/10 transition-all">
                      <User className="w-5 h-5" />
                    </div>
                    Portafolio
                  </a>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* CENTER SECTION (MOBILE ONLY) */}
        <div className="md:hidden absolute inset-0 flex items-center justify-center pointer-events-none">
          <Link href="/" className="pointer-events-auto">
            <span className="text-xl font-extrabold tracking-tight text-foreground brand-font whitespace-nowrap">
              {SITE_CONFIG.name}
            </span>
          </Link>
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center z-20">
          <Button
            variant="ghost"
            className="w-9 px-0"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        
      </div>
    </header>
  )
}
