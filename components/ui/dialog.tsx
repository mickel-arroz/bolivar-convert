'use client'

import { ComponentProps, ReactNode, useEffect, useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { cn } from '@/lib/utils'
import { useBackDismissProps } from '@/hooks/useBackToClose'
import { CloseIcon } from '@/components/icons'

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  const backDismiss = useBackDismissProps(props)
  return <DialogPrimitive.Root data-slot="dialog" {...props} {...backDismiss} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-[6px] transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0',
        className
      )}
      {...props}
    />
  )
}

/** Alto de la barra superior fija (título compacto + botones). */
const BAR_HEIGHT = 56

/**
 * Observa el header dentro del popup: cuando sale de la vista, devuelve el título para
 * mostrarlo compacto en la barra fija.
 */
function useCollapsedTitle(popup: HTMLElement | null) {
  const [collapsed, setCollapsed] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!popup || typeof IntersectionObserver === 'undefined') return
    const header = popup.querySelector('[data-slot="dialog-header"]')
    if (!header) return
    const io = new IntersectionObserver(
      ([entry]) => {
        const hidden = !entry.isIntersecting
        if (hidden) setTitle(popup.querySelector('[data-slot="dialog-title"]')?.textContent ?? '')
        setCollapsed(hidden)
      },
      { root: popup, rootMargin: `-${BAR_HEIGHT}px 0px 0px 0px` }
    )
    io.observe(header)
    return () => io.disconnect()
  }, [popup])

  return { collapsed, title }
}

function DialogContent({
  className,
  children,
  showClose = true,
  actions,
  ...props
}: DialogPrimitive.Popup.Props & {
  showClose?: boolean
  /** Botones junto a la X; siguen visibles en la barra fija al hacer scroll. */
  actions?: ReactNode
}) {
  const [popup, setPopup] = useState<HTMLElement | null>(null)
  const { collapsed, title } = useCollapsedTitle(popup)
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          'fixed inset-0 z-50 m-auto h-fit flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-md flex-col overflow-y-auto overscroll-contain rounded-3xl bg-card ring-1 ring-border/70 p-6 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:translate-y-2 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:translate-y-4 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
          'max-lg:h-dvh! max-lg:max-h-dvh! max-lg:w-screen! max-lg:max-w-[100vw]! max-lg:rounded-none! max-lg:border-0! max-lg:shadow-none max-lg:ring-0 max-lg:data-starting-style:translate-y-12 max-lg:data-starting-style:scale-100 max-lg:data-ending-style:scale-100',
          className
        )}
        {...props}
        ref={setPopup}
      >
        <div data-slot="dialog-bar" className="sticky -top-[26px] z-20 -mx-6 -mt-6 mb-6 h-0 shrink-0">
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1 pl-6 pr-4 pt-0.5 transition-colors duration-200',
              collapsed ? 'bg-card' : 'bg-transparent'
            )}
            style={{ height: BAR_HEIGHT }}
          >
            <p
              aria-hidden
              className={cn(
                'min-w-0 flex-1 truncate pr-2 text-base font-black tracking-tight transition-all duration-200',
                collapsed ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
              )}
            >
              {title}
            </p>
            <div className="pointer-events-auto flex items-center gap-1">
              {actions}
              {showClose && (
                <DialogPrimitive.Close
                  data-slot="dialog-close-x"
                  className="rounded-full p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <CloseIcon className="size-4" />
                  <span className="sr-only">Cerrar</span>
                </DialogPrimitive.Close>
              )}
            </div>
          </div>
        </div>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('mb-6 flex flex-col gap-1 pr-8', className)} {...props} />
}

function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'sticky -bottom-[26px] z-10 -mx-6 -mb-6 mt-6 flex flex-col-reverse gap-2 bg-card px-6 pt-4 pb-[max(calc(1rem+2px),env(safe-area-inset-bottom))] sm:flex-row sm:justify-end',
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-xl font-black leading-tight tracking-tight text-foreground', className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
