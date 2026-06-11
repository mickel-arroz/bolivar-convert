import { renderHook, waitFor } from '@testing-library/react'
import { useRates } from '@/hooks/useRates'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock getVEDataString
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return {
    ...actual,
    getVEDataString: () => '2026-06-11'
  }
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('useRates Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with default values and fetches rates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bcvUsd: '36.50',
        bcvEur: '39.20',
        binanceUsdAvg: '38.10',
        lastUpdate: '2026-06-11T12:00:00Z'
      })
    })

    const { result } = renderHook(() => useRates())

    // Initial state
    expect(result.current.loading).toBe(true)
    expect(result.current.rates.lastUpdate).toBe('---')

    // Wait for fetch to complete
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rates.bcvUsd).toBe('36.50')
    expect(result.current.rates.bcvEur).toBe('39.20')
    expect(result.current.rates.binanceUsdAvg).toBe('38.10')
    expect(result.current.isStale).toBe(false)
    expect(result.current.error).toBe(false)
  })

  it('loads from cache if available and fresh', async () => {
    const cachedData = {
      rates: {
        bcvUsd: '36.00',
        bcvEur: '38.00',
        binanceUsdAvg: '37.00',
        lastUpdate: '2026-06-11T10:00:00Z'
      },
      fetchDate: '2026-06-11'
    }
    localStorageMock.setItem('bolivar_rates_cache', JSON.stringify(cachedData))

    const { result } = renderHook(() => useRates())

    // Should load from cache immediately and not set loading to true
    expect(result.current.rates.bcvUsd).toBe('36.00')
    expect(result.current.loading).toBe(false)
    expect(result.current.isStale).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('handles fetch error and uses cache as stale', async () => {
    const cachedData = {
      rates: {
        bcvUsd: '35.00',
        bcvEur: '37.00',
        binanceUsdAvg: '36.00',
        lastUpdate: '2026-06-10T10:00:00Z'
      },
      fetchDate: '2026-06-10'
    }
    localStorageMock.setItem('bolivar_rates_cache', JSON.stringify(cachedData))
    
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useRates())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.isStale).toBe(true)
    expect(result.current.rates.bcvUsd).toBe('35.00')
  })
})
