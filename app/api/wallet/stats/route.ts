import { NextRequest, NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadStats } from '@/lib/wallet/server'
import { getCurrentRates } from '@/lib/rates.server'
import { parseStatsQuery } from '@/lib/wallet/statsQuery'
import type { Rates } from '@/constants/rates'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const current = await getCurrentRates()
    const rates: Rates = {
      bcvUsd: current.bcvUsd,
      bcvEur: current.bcvEur,
      binanceUsdAvg: current.binanceUsdAvg,
      lastUpdate: current.lastUpdate,
    }

    const stats = await loadStats(
      auth.supabase,
      auth.user.id,
      rates,
      parseStatsQuery(request.nextUrl.searchParams)
    )
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[api/wallet/stats]', error)
    return jsonError('No se pudieron cargar las estadísticas', 500)
  }
}
