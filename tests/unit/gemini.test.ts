import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }))

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>()
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent }
    },
  }
})

import { ADVICE_MODEL_CHAIN, callGemini } from '@/lib/ai/gemini'

describe('ADVICE_MODEL_CHAIN', () => {
  it('sigue el orden de mayor a menor capacidad, sin deprecados, y termina en Gemma', () => {
    expect(ADVICE_MODEL_CHAIN).toEqual([
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemma-4-31b-it',
      'gemma-4-26b-a4b-it',
    ])
  })
})

describe('callGemini', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_AI_API_KEY', 'clave-de-prueba')
    generateContent.mockReset()
    generateContent.mockResolvedValue({ text: '' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it.each(ADVICE_MODEL_CHAIN.filter((m) => m.startsWith('gemini-')))(
    'pide salida estructurada a %s',
    async (model) => {
      await callGemini(model, 'prompt')
      expect(generateContent.mock.calls[0][0].config).toMatchObject({
        responseMimeType: 'application/json',
      })
    }
  )

  it.each(ADVICE_MODEL_CHAIN.filter((m) => m.startsWith('gemma-')))(
    'no pide salida estructurada a %s',
    async (model) => {
      await callGemini(model, 'prompt')
      expect(generateContent.mock.calls[0][0].config).toBeUndefined()
    }
  )
})
