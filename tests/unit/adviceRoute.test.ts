import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AdviceDayState, StoredAdvice } from '@/lib/wallet/advice'

const TODAY = '2026-09-21'

const { generateContent, saveAdvice, loadAdvice, claimAdviceDay, releaseAdviceDay } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  saveAdvice: vi.fn(),
  loadAdvice: vi.fn(),
  claimAdviceDay: vi.fn(),
  releaseAdviceDay: vi.fn(),
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
  loadAdvice,
  loadAdviceInput: async () => inputConMovimientos,
  saveAdvice,
  claimAdviceDay,
  releaseAdviceDay,
}))

vi.mock('@/lib/userToday.server', () => ({ getUserToday: async () => TODAY }))

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

import { GET, POST } from '@/app/api/wallet/advice/route'
import { ADVICE_MODEL_CHAIN } from '@/lib/ai/gemini'

const NEW_DAY: AdviceDayState = { adviceDate: null, attemptDate: null, attemptCount: 0 }
const todos = (text: string) => ({ '1m': text, '6m': text, '1y': text, all: text })
const SAVED: StoredAdvice = {
  stats: todos('viejo stats'),
  budget: 'viejo budget',
  generatedAt: '2026-09-20T10:00:00.000Z',
}

function stored(advice: StoredAdvice | null, day: Partial<AdviceDayState> = {}) {
  loadAdvice.mockResolvedValue({ advice, day: { ...NEW_DAY, ...day } })
}

const modelAnswers = () =>
  generateContent.mockResolvedValue({
    text: JSON.stringify({ stats: todos('nuevo stats'), budget: 'nuevo budget' }),
  })

describe('/api/wallet/advice', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'clave-de-prueba')
    generateContent.mockReset()
    saveAdvice.mockReset()
    loadAdvice.mockReset()
    claimAdviceDay.mockReset()
    releaseAdviceDay.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('GET devuelve lo guardado y si toca intentar generar hoy', async () => {
    stored(SAVED, { adviceDate: '2026-09-20' })
    expect(await (await GET()).json()).toEqual({ advice: SAVED, canAttempt: true })

    stored(SAVED, { adviceDate: TODAY })
    expect(await (await GET()).json()).toEqual({ advice: SAVED, canAttempt: false })
  })

  it('con el consejo de hoy ya guardado no reclama ni llama a la IA', async () => {
    stored(SAVED, { adviceDate: TODAY })

    const body = await (await POST()).json()

    expect(body).toEqual({ advice: SAVED, refreshed: false })
    expect(claimAdviceDay).not.toHaveBeenCalled()
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('si otra pestaña ya reclamó el intento, no llama a la IA', async () => {
    stored(SAVED, { adviceDate: '2026-09-20' })
    claimAdviceDay.mockResolvedValue(false)

    const body = await (await POST()).json()

    expect(claimAdviceDay).toHaveBeenCalledWith({}, TODAY)
    expect(body).toEqual({ advice: SAVED, refreshed: false })
    expect(generateContent).not.toHaveBeenCalled()
  })

  it('con el día reclamado genera, guarda con el día del usuario y devuelve lo nuevo', async () => {
    stored(SAVED, { adviceDate: '2026-09-20' })
    claimAdviceDay.mockResolvedValue(true)
    modelAnswers()

    const body = await (await POST()).json()

    expect(body.refreshed).toBe(true)
    expect(body.advice).toMatchObject({ stats: todos('nuevo stats'), budget: 'nuevo budget' })
    expect(saveAdvice).toHaveBeenCalledWith({}, 'usuario-1', body.advice, TODAY)
    expect(releaseAdviceDay).not.toHaveBeenCalled()
  })

  it('si la IA falla, suelta la reserva del intento para que la próxima entrada pueda reintentar', async () => {
    stored(SAVED, { adviceDate: '2026-09-20' })
    claimAdviceDay.mockResolvedValue(true)
    generateContent.mockRejectedValue(new Error('sin cuota'))

    await POST()

    expect(releaseAdviceDay).toHaveBeenCalledWith({}, 'usuario-1')
  })

  it('reclama el día antes de llamar a la IA', async () => {
    stored(null)
    const order: string[] = []
    claimAdviceDay.mockImplementation(async () => {
      order.push('claim')
      return true
    })
    generateContent.mockImplementation(async () => {
      order.push('model')
      return { text: JSON.stringify({ stats: todos('a'), budget: 'b' }) }
    })

    await POST()

    expect(order[0]).toBe('claim')
  })

  it('si fallan todos los modelos de la cadena no guarda nada y no devuelve consejo', async () => {
    stored(null)
    claimAdviceDay.mockResolvedValue(true)
    generateContent.mockRejectedValue(new Error('sin cuota'))

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ advice: null, refreshed: false })
    expect(saveAdvice).not.toHaveBeenCalled()
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual([...ADVICE_MODEL_CHAIN])
  })
})
