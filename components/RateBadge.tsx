import { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function RateBadge({
  children,
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-4 text-xs font-medium w-fit px-2.5 py-1 rounded-md',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
