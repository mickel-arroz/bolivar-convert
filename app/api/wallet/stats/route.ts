import { NextRequest, NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadStats } from '@/lib/wallet/server'
import { getCurrentRates } from '@/lib/rates.server'
import type { Rates } from '@/constants/rates'
import type { TimeRange } from '@/hooks/useWallet'

export const dynamic = 'force-dynamic'

const VALID_RANGES: TimeRange[] = ['1m', '6m', '1y', 'all']

export async function GET(request: NextRequest) {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const rangeParam = request.nextUrl.searchParams.get('range') ?? '1m'
    const range: TimeRange = (VALID_RANGES as string[]).includes(rangeParam)
      ? (rangeParam as TimeRange)
      : '1m'

    const current = await getCurrentRates()
    const rates: Rates = {
      bcvUsd: current.bcvUsd,
      bcvEur: current.bcvEur,
      binanceUsdAvg: current.binanceUsdAvg,
      lastUpdate: current.lastUpdate,
    }

    const stats = await loadStats(auth.supabase, auth.user.id, range, rates)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('[api/wallet/stats]', error)
    return jsonError('No se pudieron cargar las estadísticas', 500)
  }
}
