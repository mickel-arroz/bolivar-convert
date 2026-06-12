import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  icon?: ReactNode
  title: string
  description?: string
  titleClassName?: string
  badge?: ReactNode
  className?: string
}

export function PageHeader({ icon, title, description, titleClassName, badge, className }: PageHeaderProps) {
  if (icon) {
    // Horizontal layout with icon — used for convertir, dividir, historial
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        {badge && <div className="mb-1">{badge}</div>}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div>
            <h1 className={cn('text-3xl font-black tracking-tighter', titleClassName)}>{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
      </div>
    )
  }
  // Centered layout — used for root/dashboard
  return (
    <div className={cn('flex flex-col items-center justify-center text-center gap-3', className)}>
      {badge && <div>{badge}</div>}
      <h1 className={cn('text-3xl font-black tracking-tighter bg-linear-to-br from-foreground to-muted-foreground bg-clip-text text-transparent', titleClassName)}>{title}</h1>
      {description && <p className="text-muted-foreground text-sm max-w-lg">{description}</p>}
    </div>
  )
}
