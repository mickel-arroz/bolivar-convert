import { cn } from "@/lib/utils"
import { ClockIcon, AlertIcon } from "@/components/icons"

interface LastUpdateBadgeProps {
  lastUpdate: string
  isStale: boolean
  formattedDate: string
  className?: string
}

/**
 * Reusable component to display the last update timestamp of exchange rates.
 * Handles the visual state for stale data (data older than a certain threshold).
 */
export function LastUpdateBadge({ lastUpdate, isStale, formattedDate, className }: LastUpdateBadgeProps) {
  if (lastUpdate === '---') return null

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center gap-y-1 sm:gap-x-2 text-sm px-4 py-2 rounded-lg border transition-colors",
      isStale 
        ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" 
        : "bg-secondary/50 text-muted-foreground border-border/50",
      className
    )}>
      <div className="flex items-center gap-2">
        {isStale ? <AlertIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4 text-primary" />}
        <span className="whitespace-nowrap">
          {isStale ? 'Mostrando datos antiguos: ' : 'Última actualización: '}
        </span>
      </div>
      <strong className="font-bold">{formattedDate}</strong>
    </div>
  )
}
