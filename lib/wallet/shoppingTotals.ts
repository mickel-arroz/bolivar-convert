/**
 * Cálculos puros de los totales de una lista de compras, incluido el desglose por prioridad.
 *
 * Módulo neutro (sin React ni acceso a red). Recibe las tasas ya resueltas en bolívares
 * por unidad, así que no conoce el estado de UI que elige la fuente (BCV, Binance o
 * personalizada) ni tiene que crecer cuando aparezca una fuente nueva.
 */
import type { CurrencyId } from '@/constants/currencies'
import {
  SHOPPING_PRIORITIES,
  normalizePriority,
  type ShoppingPriority,
} from '@/constants/shoppingPriority'
import { parseAmount } from './compute'

/**
 * Tasas ya resueltas: los bolívares que vale una unidad de cada moneda. `VES` es siempre 1.
 *
 * Distinto de `bsPerUnit` de `./compute`, que resuelve la tasa de UNA moneda a partir de
 * `Rates` y un `RateId`; aquí llegan las tres ya calculadas, sea su fuente cual sea.
 */
export type ResolvedRates = Record<CurrencyId, number>

/** Lo mínimo que necesita saberse de un producto para totalizarlo. */
export interface ShoppingTotalsItem {
  price: string
  currency: CurrencyId
  priority: number
  purchased: boolean
}

export interface PriorityTotal {
  priority: ShoppingPriority
  /** Costo de todos los productos de esta prioridad, comprados incluidos. */
  total: number | null
  /** Costo de los productos no comprados de esta prioridad. */
  remaining: number | null
}

export interface ShoppingTotals {
  /** Precio total: la lista completa. `null` si falta una tasa para convertir. */
  total: number | null
  /** Restante por pagar: solo los no comprados. `null` si falta una tasa para convertir. */
  remaining: number | null
  /** Una entrada por prioridad presente, ordenada 1 → 4. Las prioridades vacías no aparecen. */
  byPriority: PriorityTotal[]
}

/**
 * Totaliza una lista en `displayCurrency`.
 *
 * Las cifras son `null` cuando falta la tasa de alguna moneda en uso: las prioridades
 * presentes se conservan igual, porque qué prioridades hay no depende de las tasas.
 *
 * El total y el restante se suman producto a producto, no sumando `byPriority`, para que
 * el redondeo de las filas no los arrastre (ver ADR 0001).
 */
export function computeShoppingTotals(
  items: ShoppingTotalsItem[],
  resolvedRates: ResolvedRates,
  displayCurrency: CurrencyId
): ShoppingTotals {
  const rateTo = resolvedRates[displayCurrency] ?? 0
  const convertible = rateTo > 0 && items.every((it) => (resolvedRates[it.currency] ?? 0) > 0)

  const buckets = new Map<ShoppingPriority, { total: number; remaining: number }>()
  let total = 0
  let remaining = 0

  for (const it of items) {
    const priority = normalizePriority(it.priority)
    let bucket = buckets.get(priority)
    if (!bucket) {
      bucket = { total: 0, remaining: 0 }
      buckets.set(priority, bucket)
    }
    if (!convertible) continue

    const amount = (parseAmount(it.price) * resolvedRates[it.currency]) / rateTo
    bucket.total += amount
    total += amount
    if (!it.purchased) {
      bucket.remaining += amount
      remaining += amount
    }
  }

  const byPriority: PriorityTotal[] = []
  for (const priority of SHOPPING_PRIORITIES) {
    const bucket = buckets.get(priority)
    if (!bucket) continue
    byPriority.push({
      priority,
      total: convertible ? bucket.total : null,
      remaining: convertible ? bucket.remaining : null,
    })
  }

  return {
    total: convertible ? total : null,
    remaining: convertible ? remaining : null,
    byPriority,
  }
}
