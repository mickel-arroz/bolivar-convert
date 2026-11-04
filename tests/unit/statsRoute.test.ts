import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { loadStats } = vi.hoisted(() => ({ loadStats: vi.fn() }))

vi.mock('@/lib/api/route-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/route-helpers')>()
  return {
    ...actual,
    authenticate: async () => ({ supabase: {}, user: { id: 'usuario-1' } }),
  }
})
vi.mock('@/lib/wallet/server', () => ({ loadStats }))
vi.mock('@/lib/rates.server', () => ({
  getCurrentRates: async () => ({
    bcvUsd: '40',
    bcvEur: '45',
    binanceUsdAvg: '42',
    lastUpdate: '2026-11-04',
  }),
}))

import { GET } from '@/app/api/wallet/stats/route'

describe('GET /api/wallet/stats', () => {
  beforeEach(() => {
    loadStats.mockReset()
    loadStats.mockResolvedValue({})
  })

  it('calcula con la moneda y la fuente de la URL, sin esperar al perfil', async () => {
    await GET(
      new NextRequest('http://x/api/wallet/stats?range=6m&currency=EUR&source=binanceUsdAvg')
    )

    expect(loadStats).toHaveBeenCalledWith({}, 'usuario-1', expect.anything(), {
      timeRange: '6m',
      displayCurrency: 'EUR',
      statsRateSource: 'binanceUsdAvg',
    })
  })

  it('sin moneda ni fuente en la URL deja que las dé el perfil', async () => {
    await GET(new NextRequest('http://x/api/wallet/stats?range=all'))

    expect(loadStats).toHaveBeenCalledWith({}, 'usuario-1', expect.anything(), {
      timeRange: 'all',
      displayCurrency: undefined,
      statsRateSource: undefined,
    })
  })
})
