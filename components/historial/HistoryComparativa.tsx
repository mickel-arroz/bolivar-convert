import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LandmarkIcon, TrendingUpIcon, TrendingDownIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { HistoryEntry, RateMetadata, TimeRange } from './types'

interface HistoryComparativaProps {
  data: HistoryEntry[]
  activeLines: string[]
  availableRateKeys: string[]
  rateMetadata: Record<string, RateMetadata>
  range: TimeRange
  selectedDate: string | null
  onClearSelection: () => void
}


function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-VE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function formatBs(value: number) {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}Bs. ${Math.abs(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function HistoryComparativa({
  data,
  activeLines,
  availableRateKeys,
  rateMetadata,
  selectedDate,
  onClearSelection,
}: HistoryComparativaProps) {
  const rows = useMemo(() => {
    // Respetar el orden de las divisas tal como se muestran en Visibilidad
    const keys = availableRateKeys.filter(key => activeLines.includes(key))

    return keys.map(key => {
      const lastEntry = [...data].reverse().find(entry => isFiniteNumber(entry[key]))
      const baseEntry = selectedDate
        ? data.find(entry => entry.date === selectedDate && isFiniteNumber(entry[key]))
        : data.find(entry => isFiniteNumber(entry[key]))

      const last = lastEntry?.[key]
      const base = baseEntry?.[key]

      if (!isFiniteNumber(last) || !isFiniteNumber(base) || base === 0) {
        return { key, hasData: false as const }
      }

      const diffAbs = last - base
      const diffPct = (diffAbs / base) * 100
      const isUp = diffAbs >= 0

      return { key, hasData: true as const, diffAbs, diffPct, isUp }
    })
  }, [data, activeLines, availableRateKeys, selectedDate])

  // Solo se muestra contexto cuando hay una fecha seleccionada; no se repite la
  // palabra del rango (evita duplicar el sentido de "historial").
  const subtitle = selectedDate ? `Desde ${formatDate(selectedDate)} hasta hoy` : null

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Comparativa
          </CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {selectedDate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={onClearSelection}
          >
            Restablecer
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map(row => {
          const meta = rateMetadata[row.key]
          const Icon = meta?.icon || LandmarkIcon

          return (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `oklch(from ${meta?.color || 'var(--muted)'} l c h / 0.1)` }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: meta?.color || 'var(--muted-foreground)' }} />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-sm font-bold truncate">{meta?.label || row.key}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-medium">
                    {meta?.sub || 'Otro'}
                  </span>
                </div>
              </div>

              {row.hasData ? (
                <div
                  className={cn(
                    'flex flex-col items-end shrink-0',
                    row.isUp
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  <span className="flex items-center gap-1 text-sm font-bold">
                    {row.isUp ? (
                      <TrendingUpIcon className="w-4 h-4" />
                    ) : (
                      <TrendingDownIcon className="w-4 h-4" />
                    )}
                    {row.isUp ? '+' : ''}
                    {row.diffPct.toFixed(2)}%
                  </span>
                  <span className="text-[11px] font-medium">{formatBs(row.diffAbs)}</span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">Sin datos</span>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
