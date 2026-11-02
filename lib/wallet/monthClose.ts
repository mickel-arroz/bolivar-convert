/**
 * Reparto del cierre: qué se hace con el sobrante o déficit de cada presupuesto al
 * concluir un mes. Cada Tramo lleva una parte a un destino; las partes suman exacto
 * el sobrante o déficit, porque aquí se mueve dinero (a diferencia del ADR 0001).
 */

/** Cómo se escriben las cantidades de los tramos de una fila: todas en % o todas en monto. */
export type CloseMode = 'percent' | 'amount'

export type CloseDestination =
  | { kind: 'category'; categoryId: string }
  | { kind: 'goal'; goalId: string }
  | { kind: 'discard' }

/** Un Tramo ya resuelto a monto, con el signo del sobrante (+) o déficit (−). */
export interface MonthCloseAllocation {
  fromCategoryId: string
  destination: CloseDestination
  amount: number
}

const PERCENT_TOLERANCE = 1e-6
/** Medio céntimo: lo que el usuario no puede escribir de un sobrante con más decimales. */
const AMOUNT_TOLERANCE = 0.005

export const round2 = (n: number) => Math.round(n * 100) / 100

/** Un sobrante o déficit de menos de medio céntimo no tiene nada que repartir. */
export const isSettled = (remaining: number) => Math.abs(remaining) < AMOUNT_TOLERANCE

/** Lo que falta (positivo) o sobra (negativo) por asignar, en las unidades del modo. */
export function remainderGap(remaining: number, mode: CloseMode, values: readonly number[]): number {
  const total = mode === 'percent' ? 100 : Math.abs(remaining)
  return total - values.reduce((a, b) => a + b, 0)
}

/**
 * Convierte los tramos de una fila en montos con signo. El último absorbe el redondeo,
 * así que la suma es exactamente `remaining`. `null` si el reparto no cuadra.
 */
export function splitMonthRemainder(
  remaining: number,
  mode: CloseMode,
  values: readonly number[]
): number[] | null {
  if (values.length === 0 || values.some((v) => !Number.isFinite(v) || v <= 0)) return null
  if (isSettled(remaining)) return values.map(() => 0)
  const tolerance = mode === 'percent' ? PERCENT_TOLERANCE : AMOUNT_TOLERANCE
  if (Math.abs(remainderGap(remaining, mode, values)) > tolerance) return null

  const sign = Math.sign(remaining)
  const parts = values
    .slice(0, -1)
    .map((v) => sign * (mode === 'percent' ? round2((Math.abs(remaining) * v) / 100) : v))
  const last = remaining - parts.reduce((a, b) => a + b, 0)
  if (Math.sign(last) !== sign) return null
  return [...parts, last]
}

export interface CarryoverFlow {
  fromCategoryId: string
  amount: number
}

export interface CarryoverProjection {
  /** Arrastre que la categoría ya tenía en el mes nuevo. */
  base: number
  /** Lo que le llega del Reparto del cierre, de sí misma o de otras categorías. */
  flows: CarryoverFlow[]
  total: number
}

/**
 * Arrastre con que arrancaría cada categoría que recibe algo del Reparto del cierre:
 * lo que ya tenía en el mes nuevo más todos los tramos que apuntan a ella.
 */
export function projectCarryovers(
  base: ReadonlyMap<string, number>,
  allocations: readonly MonthCloseAllocation[]
): Map<string, CarryoverProjection> {
  const out = new Map<string, CarryoverProjection>()
  for (const a of allocations) {
    if (a.destination.kind !== 'category' || a.amount === 0) continue
    const id = a.destination.categoryId
    const p = out.get(id) ?? { base: base.get(id) ?? 0, flows: [], total: base.get(id) ?? 0 }
    p.flows.push({ fromCategoryId: a.fromCategoryId, amount: a.amount })
    p.total = round2(p.total + a.amount)
    out.set(id, p)
  }
  return out
}

/**
 * Cómo arranca un presupuesto del mes nuevo con el neto que le dejó el cierre: si es
 * positivo va al extra; si es negativo, el extra queda en 0 y el neto entero pasa a ser
 * Déficit arrastrado, que cuenta como ya utilizado del estimado (sin tope).
 */
export function settleCarryover(net: number): { carryover: string; carriedDeficit: string | undefined } {
  const n = round2(net)
  return n < 0 ? { carryover: '0', carriedDeficit: String(-n) } : { carryover: String(n), carriedDeficit: undefined }
}
