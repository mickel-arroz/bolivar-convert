import { ComponentProps, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface RateCardProps extends ComponentProps<typeof Card> {
  label: string
  icon: ReactNode
  rate: string
  colorClass: string
  badge: ReactNode
}

export function RateCard({
  label,
  icon,
  rate,
  colorClass,
  badge,
  className,
  ...props
}: RateCardProps) {
  return (
    <Card
      className={cn(
        'relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 bg-linear-to-b from-card to-card/50',
        className
      )}
      {...props}
    >
      <div className={cn('absolute top-0 left-0 w-full h-1', colorClass)}></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            colorClass.replace('bg-', 'bg-').replace('/80', '/10') // Basic opacity replacement if standard tailwind class
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-extrabold tracking-tighter">
            Bs. {rate}
          </span>
        </div>
        {badge}
      </CardContent>
    </Card>
  )
}
