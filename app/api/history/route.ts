import { NextRequest, NextResponse } from 'next/server'
import { getRedis, readHistory } from '@/lib/rates.server'

export const dynamic = 'force-dynamic'

/** Días por rango; `all` (o desconocido) = sin recorte. */
const RANGE_DAYS: Record<string, number> = { '7d': 7, '30d': 30, '1y': 365 }

/**
 * Historial parametrizado por rango: `?range=7d|30d|1y|all`. Filtra server-side y
 * proyecta solo `{ date, bcvUsd, bcvEur, binanceUsdAvg }` (sin `updatedAt`), para
 * no sobre-enviar ni ensuciar la gráfica.
 */
export async function GET(request: NextRequest) {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis connection not configured' }, { status: 500 })
  }

  try {
    const range = request.nextUrl.searchParams.get('range') ?? 'all'
    const days = RANGE_DAYS[range] // undefined para 'all' o rangos desconocidos

    const history = await readHistory(redis) // ascendente por fecha

    let entries = history
    if (days) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      const cutoffStr = cutoff.toISOString().split('T')[0]
      entries = history.filter((e) => e.date >= cutoffStr)
    }

    const projected = entries.map((e) => ({
      date: e.date,
      bcvUsd: e.bcvUsd ?? null,
      bcvEur: e.bcvEur ?? null,
      binanceUsdAvg: e.binanceUsdAvg ?? null,
    }))

    return NextResponse.json(projected)
  } catch (error) {
    console.error('Error fetching history from Redis:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
