import { describe, it, expect, vi } from 'vitest'
import {
  ADVICE_ATTEMPTS_PER_DAY,
  ADVICE_MAX_LENGTH,
  ADVICE_PERIODS,
  ADVICE_REJECT_LENGTH,
  GENERIC_ADVICE,
  canAttemptAdviceToday,
  meetsAdviceThreshold,
  parseAdviceResponse,
  runAdviceChain,
  statsFromStorage,
  type AdviceDayState,
  type AdviceModelCall,
} from '@/lib/wallet/advice'

const CHAIN = ['modelo-a', 'modelo-b', 'modelo-c']

type Periodos = Record<'1m' | '6m' | '1y' | 'all', string>

/** El mismo texto para los cuatro períodos. */
const todos = (text: string): Periodos => ({ '1m': text, '6m': text, '1y': text, all: text })

function json(stats: string | Periodos, budget: string): string {
  return JSON.stringify({ stats: typeof stats === 'string' ? todos(stats) : stats, budget })
}

const consejo = (stats: string, budget: string) => ({ stats: todos(stats), budget })

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
  it('acepta un texto de Estadísticas por período y el de Presupuestos', () => {
    const stats = { '1m': 'Este mes.', '6m': 'Seis meses.', '1y': 'Este año.', all: 'Desde siempre.' }
    expect(parseAdviceResponse(json(stats, 'Mira adelante.'))).toEqual({ stats, budget: 'Mira adelante.' })
  })

  it('acepta JSON envuelto en vallas de código', () => {
    const raw = '```json\n' + json('Atrás.', 'Adelante.') + '\n```'
    expect(parseAdviceResponse(raw)).toEqual(consejo('Atrás.', 'Adelante.'))
  })

  it('descarta una respuesta a la que le falta algún período o el de Presupuestos', () => {
    expect(parseAdviceResponse(json('Atrás.', '   '))).toBeNull()
    expect(
      parseAdviceResponse(json({ '1m': 'a', '6m': 'b', '1y': 'c', all: ' ' }, 'Adelante.'))
    ).toBeNull()
    expect(parseAdviceResponse(JSON.stringify({ stats: 'un solo texto', budget: 'b' }))).toBeNull()
    expect(parseAdviceResponse('Un único párrafo sin nada más.')).toBeNull()
  })

  it('parte en cinco párrafos una respuesta sin JSON: los cuatro períodos y luego Presupuestos', () => {
    const prosa = ['Mes.', 'Semestre.', 'Año.', 'Todo.', 'Ajusta ocio.'].join('\n\n')
    expect(parseAdviceResponse(prosa)).toEqual({
      stats: { '1m': 'Mes.', '6m': 'Semestre.', '1y': 'Año.', all: 'Todo.' },
      budget: 'Ajusta ocio.',
    })
    expect(parseAdviceResponse('Atrás.\n\nAdelante.')).toBeNull()
  })

  it('quita los espacios de los bordes de cada párrafo', () => {
    expect(parseAdviceResponse(json('  Atrás.  ', '\nAdelante.\n'))).toEqual(
      consejo('Atrás.', 'Adelante.')
    )
  })

  it('nunca recorta un consejo que se pasa un poco del límite del prompt', () => {
    const long = 'b'.repeat(ADVICE_MAX_LENGTH + 50)
    const advice = parseAdviceResponse(json(long, 'Adelante.'))
    expect(advice?.stats['1y']).toBe(long)
  })

  it('acepta un párrafo justo en 3 veces el límite', () => {
    const edge = 'c'.repeat(ADVICE_REJECT_LENGTH)
    expect(parseAdviceResponse(json(edge, edge))).toEqual(consejo(edge, edge))
  })

  it('descarta la respuesta cuando cualquier párrafo pasa de 3 veces el límite', () => {
    const tooLong = 'd'.repeat(ADVICE_REJECT_LENGTH + 1)
    expect(parseAdviceResponse(json({ ...todos('Atrás.'), '6m': tooLong }, 'Adelante.'))).toBeNull()
    expect(parseAdviceResponse(json('Atrás.', tooLong))).toBeNull()
  })

  it('descarta una respuesta vacía', () => {
    expect(parseAdviceResponse('')).toBeNull()
    expect(parseAdviceResponse('   ')).toBeNull()
  })
})

describe('GENERIC_ADVICE', () => {
  it('tiene un texto de Estadísticas para cada período', () => {
    expect(Object.keys(GENERIC_ADVICE.stats).sort()).toEqual([...ADVICE_PERIODS].sort())
  })

  it('habla de planes de ahorro, no de metas de ahorro', () => {
    expect(GENERIC_ADVICE.budget).toContain('plan de ahorro')
    expect(`${Object.values(GENERIC_ADVICE.stats).join(' ')} ${GENERIC_ADVICE.budget}`).not.toMatch(
      /metas? de ahorro/i
    )
  })
})

describe('runAdviceChain', () => {
  it('se detiene en el primer modelo que responde bien', async () => {
    const call: AdviceModelCall = vi.fn(async () => json('Atrás.', 'Adelante.'))

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual(consejo('Atrás.', 'Adelante.'))
    expect(call).toHaveBeenCalledTimes(1)
    expect(call).toHaveBeenCalledWith('modelo-a', 'prompt')
  })

  it('pasa al siguiente modelo cuando el primero falla', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') throw new Error('cuota agotada')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual(consejo('Atrás.', 'Adelante.'))
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls.map((c) => c[0])).toEqual(['modelo-a', 'modelo-b'])
  })

  it('descarta el modelo que devuelve un solo párrafo usable y sigue la cadena', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') return json('Solo uno.', '')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual(consejo('Atrás.', 'Adelante.'))
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('descarta el modelo que se pasa de 3 veces el límite y prueba el siguiente', async () => {
    const call = vi.fn(async (model: string) => {
      if (model === 'modelo-a') return json('e'.repeat(ADVICE_REJECT_LENGTH + 1), 'Adelante.')
      return json('Atrás.', 'Adelante.')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual(consejo('Atrás.', 'Adelante.'))
    expect(call.mock.calls.map((c) => c[0])).toEqual(['modelo-a', 'modelo-b'])
  })

  it('acepta la prosa sin JSON del último recurso de la cadena', async () => {
    const call = vi.fn(async (model: string) => {
      if (model !== 'modelo-c') throw new Error('sin cuota')
      return ['Mes.', 'Semestre.', 'Año.', 'Todo.', 'Recorta ocio.'].join('\n\n')
    })

    const advice = await runAdviceChain('prompt', CHAIN, call)

    expect(advice).toEqual({
      stats: { '1m': 'Mes.', '6m': 'Semestre.', '1y': 'Año.', all: 'Todo.' },
      budget: 'Recorta ocio.',
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
    expect(GENERIC_ADVICE.stats['1m'].length).toBeGreaterThan(0)
    expect(GENERIC_ADVICE.budget.length).toBeGreaterThan(0)
  })

  it('no llama a ningún modelo cuando la cadena está vacía', async () => {
    const call = vi.fn(async () => json('a', 'b'))
    expect(await runAdviceChain('prompt', [], call)).toBeNull()
    expect(call).not.toHaveBeenCalled()
  })
})

describe('statsFromStorage', () => {
  it('lee el consejo de Estadísticas guardado por período', () => {
    const stats = { '1m': 'Mes.', '6m': 'Semestre.', '1y': 'Año.', all: 'Todo.' }
    expect(statsFromStorage(stats, 'viejo')).toEqual(stats)
  })

  it('un consejo guardado antes de los períodos usa su único texto en los cuatro', () => {
    expect(statsFromStorage(null, 'Un solo texto.')).toEqual(todos('Un solo texto.'))
  })

  it('sin nada usable devuelve null', () => {
    expect(statsFromStorage(null, null)).toBeNull()
    expect(statsFromStorage({ '1m': 'solo uno' }, '')).toBeNull()
  })
})
