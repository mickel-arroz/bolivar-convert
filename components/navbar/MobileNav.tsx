'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MenuIcon, GripVerticalIcon } from '@/components/icons'
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetTitle,
  SheetHeader
} from '@/components/ui/sheet'
import { SITE_CONFIG } from '@/constants/site'
import { cn } from '@/lib/utils'
import { useNavOrder } from '@/hooks/useNavOrder'
import { SortableNavList } from '@/components/navbar/SortableNavList'
import { DataTransferDialog } from '@/components/layout/DataTransferDialog'

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { orderedItems, reorder, resetOrder } = useNavOrder()

  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg h-16 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_100px_rgba(0,0,0,0.7)] bg-background/60 backdrop-blur-md border border-border/50">
      {/* Contenedor de Elementos - Relativo para estar sobre las capas de cristal y con flex para el layout */}
      <div className="relative z-10 flex items-center justify-around h-full w-full px-2">
        {orderedItems.slice(0, 3).map((item) => {
          const isActive = pathname === item.href
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all active:scale-90 w-20 h-14 rounded-xl",
                isActive 
                  ? "text-primary bg-primary/10 border border-primary/20 shadow-[0_2px_8px_rgba(var(--primary),0.1)]" 
                  : "text-muted-foreground/90 hover:text-foreground"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {item.icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{item.shortLabel}</span>
            </Link>
          )
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger 
            render={
              <button className="flex flex-col items-center justify-center gap-1 text-muted-foreground/90 hover:text-foreground transition-all active:scale-90 focus:outline-none w-20 h-14">
                <MenuIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Más</span>
              </button>
            }
          />
          <SheetContent 
            side="bottom" 
            className="h-[60dvh] rounded-t-2xl border-t border-white/20 dark:border-white/10 bg-background/60 dark:bg-black/40 backdrop-blur-3xl p-0 flex flex-col"
          >
            <SheetHeader className="p-6 border-b border-border/10">
              <SheetTitle className="text-left">
                <span className="text-xl font-black brand-font">{SITE_CONFIG.name}</span>
              </SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                  Mantén presionado{' '}
                  <GripVerticalIcon className="inline w-3 h-3 -mt-0.5" /> para reordenar
                </p>
                <button
                  type="button"
                  onClick={resetOrder}
                  className="text-[10px] text-muted-foreground/70 hover:text-foreground font-bold uppercase tracking-widest transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1"
                >
                  Restablecer
                </button>
              </div>
              <SortableNavList
                items={orderedItems}
                pathname={pathname}
                reorder={reorder}
                onNavigate={() => setOpen(false)}
              />

              <div className="mt-auto pt-4 border-t border-border/10">
                <DataTransferDialog variant="menu" />
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
      </div>
    </nav>
  )
}
