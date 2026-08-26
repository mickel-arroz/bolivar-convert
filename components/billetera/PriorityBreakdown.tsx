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

export function PriorityBreakdown({
  byPriority,
  displayCurrency,
  open,
  onOpenChange,
}: PriorityBreakdownProps) {
  if (byPriority.length <= 1) return null

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Por prioridad
        </span>
        <span className="flex items-center gap-1">
          {byPriority.map((row) => (
            <span
              key={row.priority}
              data-testid="priority-dot"
              data-covered={isCovered(row)}
              className="size-2 rounded-full transition-opacity data-[covered=true]:opacity-40"
              style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
            />
          ))}
        </span>
        <ChevronDownIcon
          className={cn(
            'ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform duration-300',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>

      <CollapsiblePanel>
        <div className="flex flex-col gap-1 pt-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[10px] font-semibold text-muted-foreground">
            <span />
            <span className="text-right">total</span>
            <span className="text-right">restante</span>
          </div>

          {byPriority.map((row) => (
            <div
              key={row.priority}
              data-testid="priority-row"
              data-covered={isCovered(row)}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 text-[11px] tabular-nums transition-opacity data-[covered=true]:opacity-40"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="flex size-4 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold leading-none text-white"
                  style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
                >
                  {row.priority}
                </span>
                <span className="truncate">{PRIORITY_LABELS[row.priority]}</span>
              </span>
              <span className="whitespace-nowrap text-right text-muted-foreground">
                {row.total === null ? '—' : formatMoney(row.total, displayCurrency)}
              </span>
              <span className="whitespace-nowrap text-right font-semibold">
                {row.remaining === null ? '—' : formatMoney(row.remaining, displayCurrency)}
              </span>
            </div>
          ))}

          <div className="mt-1 h-px bg-border/60" />
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}
