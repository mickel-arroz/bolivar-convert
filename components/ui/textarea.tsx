'use client'

import { ComponentProps, useCallback, useLayoutEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/**
 * Textarea que crece en altura según su contenido, desde su tamaño inicial hasta un
 * máximo (`maxHeight`, por defecto 160px), a partir del cual hace scroll interno.
 */
function Textarea({
  className,
  maxHeight = 160,
  onChange,
  value,
  ...props
}: ComponentProps<'textarea'> & { maxHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(
    (el: HTMLTextAreaElement | null) => {
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    },
    [maxHeight]
  )

  // Ajusta al montar y cuando cambia el valor externamente (p. ej. al abrir en edición).
  useLayoutEffect(() => {
    resize(ref.current)
  }, [resize, value])

  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      value={value}
      onChange={(e) => {
        resize(e.currentTarget)
        onChange?.(e)
      }}
      className={cn(
        'w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none',
        'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
        'md:text-sm dark:bg-input/30 dark:disabled:bg-input/80',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
