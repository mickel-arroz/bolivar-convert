/**
 * Consejos diarios: cuándo toca generar, umbral de datos, parseo tolerante y cadena de modelos.
 *
 * Módulo neutro (sin React ni acceso a red). La llamada al modelo entra **inyectada**
 * como parámetro, así que toda la lógica se prueba sin red y sin clave de API.
 * Gobierna ADR 0005.
 */

import type { TimeRange } from '@/hooks/useWallet'

/** Los períodos de Estadísticas, cada uno con su propio consejo, en el orden del selector. */
export const ADVICE_PERIODS: readonly TimeRange[] = ['1m', '6m', '1y', 'all']

/**
 * Los consejos: el de Estadísticas mira hacia atrás, uno por período, y se muestra el del
 * período seleccionado; el de Presupuestos mira hacia adelante.
 */
export interface Advice {
  /** En qué se fue el dinero, en cada período. */
  stats: Record<TimeRange, string>
  /** Qué ajustar este mes. */
  budget: string
}

/** Lo que se guarda por usuario: los dos textos y cuándo se generaron. */
export interface StoredAdvice extends Advice {
  /** ISO de la generación. Es lo que hace posible preguntar cuánto lleva ahí. */
  generatedAt: string
}

/**
 * Intentos de generación que concede `claim_advice_day` por día del usuario. Mantener en
 * sintonía con `v_max` de la migración 0015.
 */
export const ADVICE_ATTEMPTS_PER_DAY = 3

/** El estado guardado del día, en fechas yyyy-MM-dd del calendario del usuario. */
export interface AdviceDayState {
  /** Día del consejo guardado; `null` si nunca se generó uno con fecha. */
  adviceDate: string | null
  /** Día del último intento reclamado. */
  attemptDate: string | null
  /** Intentos reclamados ese día. */
  attemptCount: number
}

/**
 * ¿Toca intentar generar hoy? No con el consejo de hoy ya guardado; sí en cuanto cambia
 * el día del usuario, y tras un fallo mientras queden intentos. La base decide lo mismo
 * de forma atómica al reclamar: esto evita gastar ese viaje cuando no hace falta.
 */
export function canAttemptAdviceToday(state: AdviceDayState, today: string): boolean {
  if (state.adviceDate === today) return false
  if (state.attemptDate !== today) return true
  return state.attemptCount < ADVICE_ATTEMPTS_PER_DAY
}

/** Largo máximo que el prompt le pide a cada párrafo. */
export const ADVICE_MAX_LENGTH = 300

/**
 * Un párrafo que pasa de 3 veces el límite del prompt es un modelo que no siguió la
 * instrucción: la respuesta se descarta y la cadena prueba el siguiente modelo.
 */
export const ADVICE_REJECT_LENGTH = ADVICE_MAX_LENGTH * 3

/**
 * Los textos que se muestran cuando no hay nada guardado, cuando no se alcanza el
 * umbral de datos y cuando la cadena de modelos se agota.
 */
const GENERIC_STATS =
  'Todavía no hay movimientos suficientes para leer tus hábitos. Registra tus ingresos y gastos durante unas semanas y aquí vas a ver en qué se te está yendo el dinero.'

export const GENERIC_ADVICE: Advice = {
  stats: { '1m': GENERIC_STATS, '6m': GENERIC_STATS, '1y': GENERIC_STATS, all: GENERIC_STATS },
  budget:
    'Ponle un presupuesto a las categorías donde más gastas y crea un plan de ahorro con nombre. Con eso a la mano, aquí te vamos a decir qué conviene ajustar cada día.',
}

/** Lo mínimo que hace falta mirar para decidir si vale la pena pedir un consejo. */
export interface AdviceDataset {
  transactions: unknown[]
  budgets: unknown[]
  goals: unknown[]
}

/**
 * Una cuenta recién creada, sin movimientos ni presupuestos ni metas, no da para un
 * consejo: por debajo de este umbral no se llama al modelo y se muestra el genérico.
 */
export function meetsAdviceThreshold(dataset: AdviceDataset): boolean {
  return (
    dataset.transactions.length > 0 || dataset.budgets.length > 0 || dataset.goals.length > 0
  )
}

/** Quita las vallas de código (```json … ```) con las que algunos modelos envuelven el JSON. */
function stripCodeFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
}

function usable(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Parseo tolerante de la respuesta del modelo.
 *
 * La salida estructurada solo está documentada en los modelos flash; para Gemma no
 * está confirmada, así que si no llega JSON válido se intenta partir el texto en cinco
 * párrafos: los de Estadísticas en el orden de {@link ADVICE_PERIODS} y luego el de
 * Presupuestos. **Todos** tienen que ser usables: una respuesta a la que le falta uno,
 * o con uno que pasa de {@link ADVICE_REJECT_LENGTH}, no se acepta a medias, se descarta
 * para que la cadena siga con el modelo siguiente.
 */
export function parseAdviceResponse(raw: string): Advice | null {
  if (!usable(raw)) return null

  try {
    const parsed: unknown = JSON.parse(stripCodeFences(raw))
    if (parsed && typeof parsed === 'object') {
      const { stats, budget } = parsed as Record<string, unknown>
      if (!stats || typeof stats !== 'object') return null
      const byPeriod = stats as Record<string, unknown>
      return withinRejectLength(ADVICE_PERIODS.map((p) => byPeriod[p]), budget)
    }
  } catch {
    /* no era JSON: se intenta partir en párrafos */
  }

  const paragraphs = stripCodeFences(raw)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (paragraphs.length < ADVICE_PERIODS.length + 1) return null
  return withinRejectLength(paragraphs.slice(0, ADVICE_PERIODS.length), paragraphs[ADVICE_PERIODS.length])
}

function withinRejectLength(stats: unknown[], budget: unknown): Advice | null {
  const texts = [...stats, budget]
  if (!texts.every(usable)) return null
  const trimmed = (texts as string[]).map((t) => t.trim())
  if (trimmed.some((t) => t.length > ADVICE_REJECT_LENGTH)) return null
  return {
    stats: Object.fromEntries(ADVICE_PERIODS.map((p, i) => [p, trimmed[i]])) as Record<TimeRange, string>,
    budget: trimmed[ADVICE_PERIODS.length],
  }
}

/**
 * El consejo de Estadísticas tal como está guardado. Uno guardado antes de que hubiera uno
 * por período solo tiene `legacy`: se muestra ese mismo texto en los cuatro.
 */
export function statsFromStorage(
  byPeriod: unknown,
  legacy: string | null | undefined
): Record<TimeRange, string> | null {
  if (byPeriod && typeof byPeriod === 'object') {
    const texts = ADVICE_PERIODS.map((p) => (byPeriod as Record<string, unknown>)[p])
    if (texts.every(usable)) {
      return Object.fromEntries(ADVICE_PERIODS.map((p, i) => [p, texts[i]])) as Record<TimeRange, string>
    }
  }
  if (!usable(legacy)) return null
  return Object.fromEntries(ADVICE_PERIODS.map((p) => [p, legacy])) as Record<TimeRange, string>
}

/** Una llamada al modelo: devuelve el texto crudo de la respuesta. */
export type AdviceModelCall = (model: string, prompt: string) => Promise<string>

/**
 * Recorre la cadena de modelos en orden y se detiene en el primero que devuelve todos
 * los párrafos. Cada modelo tiene su propia cuota, así que un fallo (error de red,
 * cuota agotada o respuesta a medias) solo significa pasar al siguiente.
 *
 * Devuelve `null` con la cadena agotada: ahí el llamador usa {@link GENERIC_ADVICE}.
 */
export async function runAdviceChain(
  prompt: string,
  models: readonly string[],
  call: AdviceModelCall
): Promise<Advice | null> {
  for (const model of models) {
    let raw: string
    try {
      raw = await call(model, prompt)
    } catch {
      continue
    }
    const advice = parseAdviceResponse(raw)
    if (advice) return advice
  }
  return null
}
