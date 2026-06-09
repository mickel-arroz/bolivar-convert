'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MenuIcon } from '@/components/icons'
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetTitle,
  SheetHeader
} from '@/components/ui/sheet'
import { SITE_CONFIG, NAV_ITEMS } from '@/constants/site'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 px-6 pb-safe rounded-t-2xl shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.1)]">
      <nav className="flex items-center justify-between h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => (
          <Link 
            key={item.href}
            href={item.href} 
            className={cn(
              "flex flex-col items-center gap-1 transition-colors",
              pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="w-5 h-5 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
          </Link>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger 
            render={
              <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none" />
            }
          >
            <MenuIcon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Menú</span>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="h-[60dvh] rounded-t-3xl border-t border-border/50 bg-background/60 backdrop-blur-3xl p-0 flex flex-col"
          >
            <SheetHeader className="p-6 border-b border-border/10">
              <SheetTitle className="text-left">
                <span className="text-xl font-black brand-font">{SITE_CONFIG.name}</span>
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-95",
                      pathname === item.href ? "bg-primary/10 text-primary" : "bg-muted/30 text-foreground hover:bg-muted/50"
                    )}
                  >
                    <div className="w-6 h-6 flex items-center justify-center opacity-70">
                      {item.icon}
                    </div>
                    <span className="text-lg font-bold">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="p-8 border-t border-border/10 bg-muted/20 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground font-medium">
                Desarrollado por{' '}
                <a
                  href={SITE_CONFIG.links.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 decoration-border/50 hover:decoration-foreground transition-colors"
                >
                  {SITE_CONFIG.author}
                </a>
                <span className="mx-2 opacity-30">|</span>
                <a
                  href={SITE_CONFIG.links.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4 decoration-border/50 hover:decoration-foreground transition-colors"
                >
                  Portafolio
                </a>
              </p>
              <p className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
                &copy; {new Date().getFullYear()}
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}
