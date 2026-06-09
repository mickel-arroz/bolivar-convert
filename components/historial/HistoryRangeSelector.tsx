import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TimeRange } from './types'

interface HistoryRangeSelectorProps {
  range: TimeRange
  onRangeChange: (range: TimeRange) => void
}

export function HistoryRangeSelector({ range, onRangeChange }: HistoryRangeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 bg-muted/50 p-1 rounded-lg">
      {(['7d', '30d', '1y', 'all'] as const).map((r) => (
        <Button
          key={r}
          variant={range === r ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onRangeChange(r)}
          className={cn(
            "h-8 px-3 uppercase text-[10px] font-bold tracking-wider",
            range === r && "bg-background shadow-sm"
          )}
        >
          {r}
        </Button>
      ))}
    </div>
  )
}
