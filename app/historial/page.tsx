'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { RATES_METADATA } from '@/constants/rates'
import { ChartSkeleton } from '@/components/historial/ChartSkeleton'
import { VisibilitySkeleton } from '@/components/historial/VisibilitySkeleton'
import {
  HistoryHeader,
 
  HistoryChart,
  HistoryVisibility,
  HistoryComparativa,
  HistoryRangeSelector,
  HistoryEntry,
  TimeRange,
  RateMetadata
} from '@/components/historial'

const PREFS_KEY = 'bolivar_history_prefs'
/** Solo estas claves se grafican (evita líneas fantasma por campos extra). */
const RATE_IDS = Object.keys(RATES_METADATA)

// Convert global metadata to the format expected by History components
const HISTORY_RATE_METADATA: Record<string, RateMetadata> = Object.values(RATES_METADATA).reduce((acc, rate) => {
  acc[rate.id] = {
    label: rate.shortLabel,
    color: rate.historyColor,
    icon: rate.iconComponent,
    sub: rate.subLabel
  }
  return acc
}, {} as Record<string, RateMetadata>)

function getSavedPrefs() {
  if (typeof window === 'undefined') return { range: '7d', activeLines: ['bcvUsd'] }
  const saved = localStorage.getItem(PREFS_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      return {
        range: parsed.range || '7d',
        activeLines: Array.isArray(parsed.activeLines) ? parsed.activeLines : ['bcvUsd']
      }
    } catch {
      return { range: '7d', activeLines: ['bcvUsd'] }
    }
  }
  return { range: '7d', activeLines: ['bcvUsd'] }
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  
  const [range, setRange] = useState<TimeRange>('7d')
  const [activeLines, setActiveLines] = useState<string[]>(['bcvUsd'])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Handle hydration and load initial prefs
  useEffect(() => {
    const prefs = getSavedPrefs()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRange(prefs.range as TimeRange)
    setActiveLines(prefs.activeLines)
    setMounted(true)
  }, [])

  // Save preferences when they change
  useEffect(() => {
    if (mounted && !loading) {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ range, activeLines }))
    }
  }, [range, activeLines, loading, mounted])

  const availableRateKeys = useMemo(
    () => RATE_IDS.filter((id) => data.some((entry) => entry[id] != null)),
    [data]
  )

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    availableRateKeys.forEach(key => {
      const meta = HISTORY_RATE_METADATA[key]
      config[key] = {
        label: meta?.label || key,
        color: meta?.color || "var(--chart-5)",
      }
    })
    return config
  }, [availableRateKeys])

  // Trae solo el rango seleccionado desde nuestro endpoint interno (filtra server-side).
  // Sin caché en localStorage: siempre en vivo.
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/history?range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json()
      })
      .then((json: HistoryEntry[]) => {
        if (cancelled) return
        const sortedData = json
          .map((item) => {
            const parsedItem: HistoryEntry = { date: item.date }
            Object.keys(item).forEach((key) => {
              if (key !== 'date') {
                const val = item[key]
                parsedItem[key] = val != null ? parseFloat(val.toString()) : null
              }
            })
            return parsedItem
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        setData(sortedData)
      })
      .catch(() => {
        /* error silencioso */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range, mounted])

  // El servidor ya devuelve el rango pedido; no se vuelve a filtrar en cliente.
  const filteredData = data

  const toggleLine = (id: string) => {
    setActiveLines(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(l => l !== id)
      }
      return [...prev, id]
    })
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(prev => (prev === date ? null : date))
  }

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange)
    setSelectedDate(null)
  }

  return (
    <div className="flex flex-col gap-8 pb-4 -mt-3 md:-mt-5 animate-in fade-in duration-500">
      <HistoryHeader />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card className="flex flex-col border-border/50">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 space-y-0 pb-7">
            <div className="space-y-1">
              <CardTitle>Gráfica de Evolución</CardTitle>
              <CardDescription>
                Bs. por divisa según fecha de valor.
              </CardDescription>
            </div>
            <HistoryRangeSelector range={range} onRangeChange={handleRangeChange} />
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            {loading ? (
              <ChartSkeleton />
            ) : (
              <HistoryChart
                data={filteredData}
                chartConfig={chartConfig}
                activeLines={activeLines}
                availableRateKeys={availableRateKeys}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {loading ? (
            <VisibilitySkeleton />
          ) : (
            <HistoryVisibility
              availableRateKeys={availableRateKeys}
              activeLines={activeLines}
              rateMetadata={HISTORY_RATE_METADATA}
              onToggleLine={toggleLine}
            />
          )}

          {!loading && filteredData.length > 0 && (
            <HistoryComparativa
              data={filteredData}
              activeLines={activeLines}
              availableRateKeys={availableRateKeys}
              rateMetadata={HISTORY_RATE_METADATA}
              range={range}
              selectedDate={selectedDate}
              onClearSelection={() => setSelectedDate(null)}
            />
          )}

          <div className="p-4 rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground bg-muted/5">
            <p>
              El historial se genera automáticamente cada vez que el BCV actualiza su tasa oficial.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
