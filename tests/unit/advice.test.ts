import { describe, it, expect, vi } from 'vitest'
import {
  ADVICE_MAX_AGE_MS,
  ADVICE_MAX_LENGTH,
  GENERIC_ADVICE,
  isAdviceStale,
  meetsAdviceThreshold,
  parseAdviceResponse,
  runAdviceChain,
  truncateAdvice,
  type AdviceModelCall,
} from '@/lib/wallet/advice'

const NOW = new Date('2026-09-21T12:00:00.000Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()

const CHAIN = ['modelo-a', 'modelo-b', 'modelo-c']

function json(stats: string, budget: string): string {
  return JSON.stringify({ stats, budget })
}

describe('isAdviceStale', () => {
  it('un consejo de menos de 7 días no se refresca', () => {
    expect(isAdviceStale(daysAgo(6), NOW)).toBe(false)
  })

  it('un consejo de más de 7 días se refresca', () => {
    expect(isAdviceStale(daysAgo(8), NOW)).toBe(true)
  })

  it('sin nada guardado, se refresca', () => {
    expect(isAdviceStale(null, NOW)).toBe(true)
    expect(isAdviceStale(undefined, NOW)).toBe(true)
  })

  it('una fecha ilegible se trata como vencida', () => {
    expect(isAdviceStale('ayer por la tarde', NOW)).toBe(true)
  })

  it('mide antigüedad, no días de calendario', () => {
    const justUnder = new Date(NOW.getTime() - ADVICE_MAX_AGE_MS + 1000).toISOString()
    const justOver = new Date(NOW.getTime() - ADVICE_MAX_AGE_MS - 1000).toISOString()
    expect(isAdviceStale(justUnder, NOW)).toBe(false)
    expect(isAdviceStale(justOver, NOW)).toBe(true)
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

describe('truncateAdvice', () => {
  it('deja intacto un párrafo dentro del límite', () => {
    expect(truncateAdvice('  Gastaste mucho en comida.  ')).toBe('Gastaste mucho en comida.')
  })

  it('recorta un párrafo hablador al límite duro', () => {
    const long = 'a'.repeat(ADVICE_MAX_LENGTH + 50)
    const out = truncateAdvice(long)
    expect(out).toHaveLength(ADVICE_MAX_LENGTH)
    expect(out.endsWith('…')).toBe(true)
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

  it('recorta cada párrafo al límite duro', () => {
    const long = 'b'.repeat(ADVICE_MAX_LENGTH + 100)
    const advice = parseAdviceResponse(json(long, long))
    expect(advice?.stats).toHaveLength(ADVICE_MAX_LENGTH)
    expect(advice?.budget).toHaveLength(ADVICE_MAX_LENGTH)
  })

  it('descarta una respuesta vacía', () => {
    expect(parseAdviceResponse('')).toBeNull()
    expect(parseAdviceResponse('   ')).toBeNull()
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
