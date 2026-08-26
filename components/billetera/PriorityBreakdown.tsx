'use client'

import { CurrencyId } from '@/constants/currencies'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/constants/shoppingPriority'
import type { PriorityTotal } from '@/lib/wallet/shoppingTotals'
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@/components/ui/collapsible'
import { ChevronDownIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

interface PriorityBreakdownProps {
  byPriority: PriorityTotal[]
  displayCurrency: CurrencyId
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Una prioridad está cubierta cuando ya no le queda nada por pagar. */
function isCovered(row: PriorityTotal): boolean {
  return row.remaining === 0
}

/** Porcentaje ya comprado de una prioridad. 0 si no hay cifras o el total es cero. */
function purchasedPercent(row: PriorityTotal): number {
  if (row.total === null || row.remaining === null || row.total <= 0) return 0
  return Math.min(100, Math.max(0, ((row.total - row.remaining) / row.total) * 100))
}

export function PriorityBreakdown({
  byPriority,
  displayCurrency,
  open,
  onOpenChange,
}: PriorityBreakdownProps) {
  if (byPriority.length <= 1) return null

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Por prioridad
        </span>
        <span className="flex items-center gap-1">
          {byPriority.map((row) => (
            <span
              key={row.priority}
              data-testid="priority-dot"
              data-covered={isCovered(row)}
              className="size-2.5 rounded-full transition-opacity data-[covered=true]:opacity-40"
              style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
            />
          ))}
        </span>
        <ChevronDownIcon
          className={cn(
            'ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsiblePanel>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2 pb-3 pt-1">
          {byPriority.map((row) => (
            <div
              key={row.priority}
              data-testid="priority-card"
              data-covered={isCovered(row)}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 p-2.5 transition-opacity data-[covered=true]:opacity-50"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="flex size-5 shrink-0 items-center justify-center rounded-[5px] text-[11px] font-bold leading-none text-white"
                  style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
                >
                  {row.priority}
                </span>
                <span className="truncate text-xs font-bold">{PRIORITY_LABELS[row.priority]}</span>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black tabular-nums sm:text-base">
                  {row.remaining === null ? '—' : formatMoney(row.remaining, displayCurrency)}
                </p>
                {row.total !== null && (
                  <p className="truncate text-xs tabular-nums text-muted-foreground">
                    de {formatMoney(row.total, displayCurrency)}
                  </p>
                )}
              </div>

              {row.total !== null && row.remaining !== null && (
                <div aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    data-testid="priority-progress"
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${purchasedPercent(row)}%`,
                      backgroundColor: PRIORITY_COLORS[row.priority],
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="h-px bg-border/60" />
      </CollapsiblePanel>
    </Collapsible>
  )
}
