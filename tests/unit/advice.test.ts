import { describe, it, expect, vi } from 'vitest'
import {
  ADVICE_ATTEMPTS_PER_DAY,
  ADVICE_MAX_LENGTH,
  ADVICE_REJECT_LENGTH,
  GENERIC_ADVICE,
  canAttemptAdviceToday,
  meetsAdviceThreshold,
  parseAdviceResponse,
  runAdviceChain,
  type AdviceDayState,
  type AdviceModelCall,
} from '@/lib/wallet/advice'

const CHAIN = ['modelo-a', 'modelo-b', 'modelo-c']

function json(stats: string, budget: string): string {
  return JSON.stringify({ stats, budget })
}

describe('canAttemptAdviceToday', () => {
  const TODAY = '2026-09-21'
  const state = (over: Partial<AdviceDayState> = {}): AdviceDayState => ({
    adviceDate: null,
    attemptDate: null,
    attemptCount: 0,
    ...over,
  })

  it('sin nada guardado ni intentado, toca generar', () => {
    expect(canAttemptAdviceToday(state(), TODAY)).toBe(true)
  })

  it('con el consejo de hoy ya guardado, no toca', () => {
    expect(canAttemptAdviceToday(state({ adviceDate: TODAY }), TODAY)).toBe(false)
  })

  it('con el consejo de ayer, toca: cuenta el cambio de día, no 24 horas', () => {
    expect(canAttemptAdviceToday(state({ adviceDate: '2026-09-20' }), TODAY)).toBe(true)
  })

  it('tras un fallo se reintenta, hasta agotar los intentos del día', () => {
    expect(canAttemptAdviceToday(state({ attemptDate: TODAY, attemptCount: 1 }), TODAY)).toBe(true)
    expect(
      canAttemptAdviceToday(state({ attemptDate: TODAY, attemptCount: ADVICE_ATTEMPTS_PER_DAY - 1 }), TODAY)
    ).toBe(true)
    expect(
      canAttemptAdviceToday(state({ attemptDate: TODAY, attemptCount: ADVICE_ATTEMPTS_PER_DAY }), TODAY)
    ).toBe(false)
  })

  it('los intentos agotados ayer no cuentan hoy', () => {
    expect(
      canAttemptAdviceToday(state({ attemptDate: '2026-09-20', attemptCount: ADVICE_ATTEMPTS_PER_DAY }), TODAY)
    ).toBe(true)
  })

  it('concede como mucho 3 intentos por día', () => {
    expect(ADVICE_ATTEMPTS_PER_DAY).toBe(3)
  })
})

describe('meetsAdviceThreshold', () => {
  const empty = { transactions: [], budgets: [], goals: [] }

  it('una cuenta recién creada, sin nada, no alcanza el umbral', () => {
    expect(meetsAdviceThreshold(empty)).toBe(false)
  })

  it('un movimiento, un presupuesto o una meta bastan', () => {
    expect(meetsAdviceThreshold({ ...empty, transactions: [{}] })).toBe(true)
    expect(meetsAdviceThreshold({ ...empty, budgets: [{}] })).toBe(true)
    expect(meetsAdviceThreshold({ ...empty, goals: [{}] })).toBe(true)
  })
})

describe('parseAdviceResponse', () => {
  it('acepta la salida estructurada con los dos párrafos', () => {
    expect(parseAdviceResponse(json('Miraste atrás.', 'Mira adelante.'))).toEqual({
      stats: 'Miraste atrás.',
      budget: 'Mira adelante.',
    })
  })

  it('acepta JSON envuelto en vallas de código', () => {
    const raw = '```json\n' + json('Atrás.', 'Adelante.') + '\n```'
    expect(parseAdviceResponse(raw)).toEqual({ stats: 'Atrás.', budget: 'Adelante.' })
  })

  it('descarta una respuesta con un solo párrafo usable', () => {
    expect(parseAdviceResponse(json('Solo este.', '   '))).toBeNull()
    expect(parseAdviceResponse('Un único párrafo sin nada más.')).toBeNull()
  })

  it('parte en dos párrafos una respuesta sin JSON', () => {
    const prosa = 'En comida se te fue casi todo.\n\nBaja el presupuesto de ocio este mes.'
    expect(parseAdviceResponse(prosa)).toEqual({
      stats: 'En comida se te fue casi todo.',
      budget: 'Baja el presupuesto de ocio este mes.',
    })
  })

  it('quita los espacios de los bordes de cada párrafo', () => {
    expect(parseAdviceResponse(json('  Atrás.  ', '\nAdelante.\n'))).toEqual({
      stats: 'Atrás.',
      budget: 'Adelante.',
    })
  })

  it('nunca recorta un consejo que se pasa un poco del límite del prompt', () => {
    const long = 'b'.repeat(ADVICE_MAX_LENGTH + 50)
    const advice = parseAdviceResponse(json(long, 'Adelante.'))
    expect(advice?.stats).toBe(long)
  })

  it('acepta un párrafo justo en 3 veces el límite', () => {
    const edge = 'c'.repeat(ADVICE_REJECT_LENGTH)
    expect(parseAdviceResponse(json(edge, edge))).toEqual({ stats: edge, budget: edge })
  })

  it('descarta la respuesta cuando un párrafo pasa de 3 veces el límite', () => {
    const tooLong = 'd'.repeat(ADVICE_REJECT_LENGTH + 1)
    expect(parseAdviceResponse(json(tooLong, 'Adelante.'))).toBeNull()
    expect(parseAdviceResponse(json('Atrás.', tooLong))).toBeNull()
    expect(parseAdviceResponse(`${tooLong}\n\nAdelante.`)).toBeNull()
  })

  it('descarta una respuesta vacía', () => {
    expect(parseAdviceResponse('')).toBeNull()
    expect(parseAdviceResponse('   ')).toBeNull()
  })
})

describe('GENERIC_ADVICE', () => {
  it('habla de planes de ahorro, no de metas de ahorro', () => {
    expect(GENERIC_ADVICE.budget).toContain('plan de ahorro')
    expect(`${GENERIC_ADVICE.stats} ${GENERIC_ADVICE.budget}`).not.toMatch(/metas? de ahorro/i)
  })
})

describe('runAdviceChain', () => {
  it('se detiene en el primer modelo que responde bien', async () => {
    const call: AdviceModelCall = vi.fn(async () => json('Atrás.', 'Adelante.'))

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({ stats: 'Atrás.', budget: 'Adelante.' })
    expect(call).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith('modelo-a', 'prompt')
  })

  it('pasa al siguiente modelo cuando el primero falla', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') throw new Error('cuota agotada')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({ stats: 'Atrás.', budget: 'Adelante.' })
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls.map((c) => c[0])).toEqual(['modelo-a', 'modelo-b'])
  })

  it('descarta el modelo que devuelve un solo párrafo usable y sigue la cadena', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') return json('Solo uno.', '')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({ stats: 'Atrás.', budget: 'Adelante.' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('descarta el modelo que se pasa de 3 veces el límite y prueba el siguiente', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') return json('e'.repeat(ADVICE_REJECT_LENGTH + 1), 'Adelante.')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({ stats: 'Atrás.', budget: 'Adelante.' })
    expect(call.mock.calls.map((c) => c[0])).toEqual(['modelo-a', 'modelo-b'])
  })

  it('acepta la prosa sin JSON del último recurso de la cadena', async () => {
    const call = vi.fn(async (model: string) => {
      if (model !== 'modelo-c') throw new Error('sin cuota')
      return 'Gastaste de más en comida.\n\nRecorta ocio la semana que viene.'
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({
      stats: 'Gastaste de más en comida.',
      budget: 'Recorta ocio la semana que viene.',
    })
    expect(call).toHaveBeenCalledTimes(3)
  })

  it('agotada la cadena devuelve null, y ahí van los textos genéricos', async () => {
    const call = vi.fn(async () => {
      throw new Error('sin cuota')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toBeNull()
    expect(call).toHaveBeenCalledTimes(CHAIN.length)
    expect(GENERIC_ADVICE.stats.length).toBeGreaterThan(0)
    expect(GENERIC_ADVICE.budget.length).toBeGreaterThan(0)
  })

  it('no llama a ningún modelo cuando la cadena está vacía', async () => {
    const call = vi.fn(async () => json('a', 'b'))
    expect(await runAdviceChain('prompt', [], call)).toBeNull()
    expect(call).not.toHaveBeenCalled()
  })
})
