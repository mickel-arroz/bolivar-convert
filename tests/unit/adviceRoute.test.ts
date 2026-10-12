import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { generateContent, saveAdvice } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  saveAdvice: vi.fn(),
}))

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>()
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent }
    },
  }
})

vi.mock('@/lib/api/route-helpers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/route-helpers')>()
  return {
    ...actual,
    authenticate: async () => ({ supabase: {}, user: { id: 'usuario-1' } }),
  }
})

const inputConMovimientos = { transactions: [{}], budgets: [], goals: [] }

vi.mock('@/lib/wallet/adviceServer', () => ({
  loadAdvice: async () => null,
  loadAdviceInput: async () => inputConMovimientos,
  saveAdvice,
}))

vi.mock('@/lib/rates.server', () => ({
  getCurrentRates: async () => ({
    bcvUsd: 1,
    bcvEur: 1,
    binanceUsdAvg: 1,
    lastUpdate: '2026-10-12T00:00:00.000Z',
  }),
}))

vi.mock('@/lib/wallet/advicePayload', () => ({
  buildAdvicePayload: () => ({}),
  buildAdvicePrompt: () => 'prompt',
}))

import { POST } from '@/app/api/wallet/advice/route'
import { ADVICE_MODEL_CHAIN } from '@/lib/ai/gemini'

describe('POST /api/wallet/advice', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'clave-de-prueba')
    generateContent.mockReset()
    saveAdvice.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('si fallan todos los modelos de la cadena no guarda nada y no devuelve consejo', async () => {
    generateContent.mockRejectedValue(new Error('sin cuota'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ advice: null, refreshed: false })
    expect(saveAdvice).not.toHaveBeenCalled()
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual([...ADVICE_MODEL_CHAIN])
  })
})
