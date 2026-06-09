import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LandmarkIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { RateMetadata } from './types'

interface HistoryVisibilityProps {
  availableRateKeys: string[]
  activeLines: string[]
  rateMetadata: Record<string, RateMetadata>
  onToggleLine: (id: string) => void
}

export function HistoryVisibility({
  availableRateKeys,
  activeLines,
  rateMetadata,
  onToggleLine,
}: HistoryVisibilityProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Visibilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {availableRateKeys.map((key) => {
          const meta = rateMetadata[key]
          const Icon = meta?.icon || LandmarkIcon
          const isActive = activeLines.includes(key)

          return (
            <Button
              key={key}
              variant="outline"
              className={cn(
                "justify-start gap-3 h-14 w-full transition-all border-border/50",
                isActive && "bg-muted/50 ring-1"
              )}
              style={
                isActive
                  ? {
                      borderColor: `oklch(from ${meta?.color} l c h / 0.5)`,
                      boxShadow: `0 0 0 1px oklch(from ${meta?.color} l c h / 0.2)`,
                    }
                  : {}
              }
              onClick={() => onToggleLine(key)}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `oklch(from ${meta?.color || 'var(--muted)'} l c h / 0.1)` }}
              >
                <Icon className="w-5 h-5" style={{ color: meta?.color || 'var(--muted-foreground)' }} />
              </div>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="text-sm font-bold truncate">{meta?.label || key}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  {meta?.sub || 'Otro'}
                </span>
              </div>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
