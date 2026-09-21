/**
 * Consejos semanales: frescura, umbral de datos, parseo tolerante y cadena de modelos.
 *
 * Módulo neutro (sin React ni acceso a red). La llamada al modelo entra **inyectada**
 * como parámetro, así que toda la lógica se prueba sin red y sin clave de API.
 * Gobierna ADR 0003.
 */

/** Los dos consejos: el de Estadísticas mira hacia atrás; el de Presupuesto, hacia adelante. */
export interface Advice {
  /** En qué se fue el dinero. */
  stats: string
  /** Qué ajustar este mes. */
  budget: string
}

/** Lo que se guarda por usuario: los dos textos y cuándo se generaron. */
export interface StoredAdvice extends Advice {
  /** ISO de la generación. Es lo que hace posible preguntar cuánto lleva ahí. */
  generatedAt: string
}

/** Un consejo se refresca cuando pasaron más de 7 días desde que se generó. */
export const ADVICE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** Límite duro de cada párrafo, en el prompt y al renderizar. */
export const ADVICE_MAX_LENGTH = 300

/**
 * Los textos que se muestran cuando no hay nada guardado, cuando no se alcanza el
 * umbral de datos y cuando la cadena de modelos se agota.
 */
export const GENERIC_ADVICE: Advice = {
  stats:
    'Todavía no hay movimientos suficientes para leer tus hábitos. Registra tus ingresos y gastos durante unas semanas y aquí vas a ver en qué se te está yendo el dinero.',
  budget:
    'Ponle un presupuesto a las categorías donde más gastas y crea una meta de ahorro con nombre. Con eso a la mano, aquí te vamos a decir qué conviene ajustar cada semana.',
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

/** `true` si hay que refrescar: no hay nada guardado, o lo guardado pasó de 7 días. */
export function isAdviceStale(generatedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!generatedAt) return true
  const then = new Date(generatedAt).getTime()
  if (isNaN(then)) return true
  return now.getTime() - then > ADVICE_MAX_AGE_MS
}

/** Recorta un párrafo al límite duro, para que un modelo hablador no desmaquete la vista. */
export function truncateAdvice(text: string, max: number = ADVICE_MAX_LENGTH): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
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
 * está confirmada, así que si no llega JSON válido se intenta partir el texto en dos
 * párrafos. **Los dos** tienen que ser usables: una respuesta con uno solo no se
 * acepta a medias, se descarta para que la cadena siga con el modelo siguiente.
 */
export function parseAdviceResponse(raw: string): Advice | null {
  if (!usable(raw)) return null

  try {
    const parsed: unknown = JSON.parse(stripCodeFences(raw))
    if (parsed && typeof parsed === 'object') {
      const { stats, budget } = parsed as Record<string, unknown>
      if (usable(stats) && usable(budget)) {
        return { stats: truncateAdvice(stats), budget: truncateAdvice(budget) }
      }
      return null
    }
  } catch {
    /* no era JSON: se intenta partir en párrafos */
  }

  const paragraphs = stripCodeFences(raw)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (paragraphs.length < 2) return null
  return { stats: truncateAdvice(paragraphs[0]), budget: truncateAdvice(paragraphs[1]) }
}

/** Una llamada al modelo: devuelve el texto crudo de la respuesta. */
export type AdviceModelCall = (model: string, prompt: string) => Promise<string>

/**
 * Recorre la cadena de modelos en orden y se detiene en el primero que devuelve los
 * dos párrafos. Cada modelo tiene su propia cuota, así que un fallo (error de red,
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
