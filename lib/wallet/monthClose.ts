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
