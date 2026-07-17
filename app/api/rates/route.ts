import { NextResponse } from 'next/server'
import { getVEDataString } from '@/lib/utils'
import { getRedis, readHistory } from '@/lib/rates.server'

export const dynamic = 'force-dynamic'

/**
 * Tasas para la vista actual: el registro de HOY (TZ Caracas) o, si no existe, el
 * de la fecha anterior más cercana. Incluye `previous` (registro anterior) para
 * calcular la variación % sin bajar todo el historial.
 */
export async function GET() {
  const redis = getRedis()
  if (!redis) {
    return NextResponse.json({ error: 'Redis connection not configured' }, { status: 500 })
  }

  try {
    const history = await readHistory(redis) // ascendente por fecha
    const today = getVEDataString()

    const upToToday = history.filter((e) => e.date <= today)
    const pool = upToToday.length > 0 ? upToToday : history
    const current = pool.length > 0 ? pool[pool.length - 1] : null

    if (!current) {
      return NextResponse.json({
        bcvUsd: null,
        bcvEur: null,
        binanceUsdAvg: null,
        lastUpdate: null,
        previous: null,
      })
    }

    // Entrada con la mayor fecha estrictamente anterior a la actual.
    const previous = [...history].reverse().find((e) => e.date < current.date) ?? null

    return NextResponse.json({
      bcvUsd: current.bcvUsd,
      bcvEur: current.bcvEur,
      binanceUsdAvg: current.binanceUsdAvg,
      lastUpdate: current.updatedAt ?? current.date,
      previous: previous
        ? {
            bcvUsd: previous.bcvUsd,
            bcvEur: previous.bcvEur,
            binanceUsdAvg: previous.binanceUsdAvg,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching from Redis:', error)
    return NextResponse.json({ error: 'Failed to fetch rates' }, { status: 500 })
  }
}
