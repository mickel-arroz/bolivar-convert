import { renderHook, waitFor } from '@testing-library/react'
import { useRates } from '@/hooks/useRates'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock fetch (el hook consume /api/rates; ya no hay caché en localStorage)
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

describe('useRates Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('carga las tasas actuales y el registro previo desde /api/rates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bcvUsd: 36.5,
        bcvEur: 39.2,
        binanceUsdAvg: 38.1,
        lastUpdate: '2026-06-11T12:00:00-04:00',
        previous: { bcvUsd: 36.0, bcvEur: 39.0, binanceUsdAvg: 37.5 },
      }),
    })

    const { result } = renderHook(() => useRates())

    expect(result.current.loading).toBe(true)
    expect(result.current.rates.lastUpdate).toBe('---')

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rates.bcvUsd).toBe('36.50')
    expect(result.current.rates.bcvEur).toBe('39.20')
    expect(result.current.rates.binanceUsdAvg).toBe('38.10')
    expect(result.current.previousRates.bcvUsd).toBe('36.00')
    expect(result.current.isStale).toBe(false)
    expect(result.current.error).toBe(false)
    expect(mockFetch).toHaveBeenCalledWith('/api/rates')
  })

  it('marca error/stale si el fetch falla (no hay caché que mostrar)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRates())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.isStale).toBe(true)
    expect(result.current.rates.bcvUsd).toBeUndefined()
  })
})
