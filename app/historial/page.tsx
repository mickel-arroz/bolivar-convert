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
import { TrendingUpIcon, EuroIcon, DollarIcon } from '@/components/icons'
import { getVEDataString } from '@/lib/utils'
import { 
  HistoryHeader, 
  HistoryChart, 
  HistoryVisibility, 
  HistoryRangeSelector,
  HistoryEntry,
  TimeRange,
  RateMetadata
} from '@/components/historial'

const CACHE_KEY = 'bolivar_history_cache'

const RATE_METADATA: Record<string, RateMetadata> = {
  bcvUsd: {
    label: "Dólar BCV",
    color: "var(--rate-usd)",
    icon: DollarIcon,
    sub: "Oficial"
  },
  bcvEur: {
    label: "Euro BCV",
    color: "var(--rate-eur)",
    icon: EuroIcon,
    sub: "Oficial"
  },
  binanceUsdAvg: {
    label: "Binance P2P",
    color: "var(--rate-binance)",
    icon: TrendingUpIcon,
    sub: "Mercado"
  }
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<TimeRange>('30d')
  const [activeLines, setActiveLines] = useState<string[]>(['bcvUsd', 'bcvEur', 'binanceUsdAvg'])

  const availableRateKeys = useMemo(() => {
    const keys = new Set<string>()
    data.forEach(entry => {
      Object.keys(entry).forEach(key => {
        if (key !== 'date') keys.add(key)
      })
    })
    return Array.from(keys)
  }, [data])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    availableRateKeys.forEach(key => {
      const meta = RATE_METADATA[key]
      config[key] = {
        label: meta?.label || key,
        color: meta?.color || "var(--chart-5)",
      }
    })
    return config
  }, [availableRateKeys])

  useEffect(() => {
    async function fetchHistory() {
      const cached = localStorage.getItem(CACHE_KEY)
      const today = getVEDataString()
      
      if (cached) {
        try {
          const { data: cachedData, fetchDate } = JSON.parse(cached)
          if (fetchDate === today) {
            setData(cachedData)
            setLoading(false)
            return
          }
        } catch {
          console.warn('Failed to parse history cache')
        }
      }

      try {
        const res = await fetch('/api/history')
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        
        const sortedData = (json as HistoryEntry[])
          .map((item: HistoryEntry) => {
            const parsedItem: HistoryEntry = { date: item.date }
            Object.keys(item).forEach(key => {
              if (key !== 'date') {
                const val = item[key]
                parsedItem[key] = val ? parseFloat(val.toString()) : null
              }
            })
            return parsedItem
          })
          .sort((a: HistoryEntry, b: HistoryEntry) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setData(sortedData)
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: sortedData,
          fetchDate: today
        }))
      } catch {
        // Silently handle error
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [])

  const filteredData = useMemo(() => {
    if (range === 'all' || data.length === 0) return data
    const now = new Date()
    const cutoff = new Date()
    if (range === '7d') cutoff.setDate(now.getDate() - 7)
    else if (range === '30d') cutoff.setDate(now.getDate() - 30)
    else if (range === '1y') cutoff.setFullYear(now.getFullYear() - 1)
    return data.filter(item => new Date(item.date) >= cutoff)
  }, [data, range])

  const toggleLine = (id: string) => {
    setActiveLines(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter(l => l !== id)
      }
      return [...prev, id]
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 py-4 animate-in fade-in duration-500">
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
            <HistoryRangeSelector range={range} onRangeChange={setRange} />
          </CardHeader>
          <CardContent className="flex-1 pb-4">
            <HistoryChart 
              data={filteredData}
              chartConfig={chartConfig}
              activeLines={activeLines}
              availableRateKeys={availableRateKeys}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <HistoryVisibility 
            availableRateKeys={availableRateKeys}
            activeLines={activeLines}
            rateMetadata={RATE_METADATA}
            onToggleLine={toggleLine}
          />
          
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
