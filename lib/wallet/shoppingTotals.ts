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

/* ─── Resumen de todas las listas ─── */

/** Un producto con la lista a la que pertenece, para totalizar varias listas juntas. */
export interface AllListsItem extends ShoppingTotalsItem {
  listId: string
}

/** Una fila del resumen: qué lleva una lista y cuánto cuesta. */
export interface ShoppingListSummaryRow {
  listId: string
  name: string
  /** **Comprados**: productos ya pagados. */
  purchased: number
  /** **Por comprar**: productos que faltan por pagar. */
  pending: number
  /** **Precio total** de la lista. `null` si falta una tasa. */
  total: number | null
}

export interface AllListsTotals {
  /** Una fila por lista con productos, en el orden en que llegaron las listas. */
  rows: ShoppingListSummaryRow[]
  /** **Precio total de todas las listas**. `null` si falta una tasa. */
  total: number | null
  /** **Restante total por pagar**. `null` si falta una tasa. */
  remaining: number | null
  /** Desglose por prioridad del total global. Omite las prioridades vacías. */
  byPriority: PriorityTotal[]
  /** Falta alguna tasa: el resumen no puede dar cifras, solo conteos. */
  incomplete: boolean
}

/**
 * Totaliza todas las listas juntas en `displayCurrency`.
 *
 * El total global se calcula sobre todos los productos de una vez, no sumando las filas
 * por lista ni las del desglose, para que el redondeo de las filas no lo arrastre
 * (ADR 0001). Una lista sin productos no aporta fila. Si falta la tasa de alguna moneda
 * en uso, todas las cifras quedan en `null` y `incomplete` lo anuncia: los conteos de
 * cada lista siguen siendo ciertos porque no dependen de las tasas.
 */
export function computeAllListsTotals(
  lists: { id: string; name: string }[],
  items: AllListsItem[],
  resolvedRates: ResolvedRates,
  displayCurrency: CurrencyId
): AllListsTotals {
  // Un solo recorrido: los productos de listas que ya no existen no cuentan ni en
  // su fila ni en el total.
  const known = new Set(lists.map((l) => l.id))
  const itemsByList = new Map<string, AllListsItem[]>()
  const globalItems: AllListsItem[] = []
  for (const it of items) {
    if (!known.has(it.listId)) continue
    globalItems.push(it)
    const bucket = itemsByList.get(it.listId)
    if (bucket) bucket.push(it)
    else itemsByList.set(it.listId, [it])
  }

  const global = computeShoppingTotals(globalItems, resolvedRates, displayCurrency)

  const rows: ShoppingListSummaryRow[] = []
  for (const list of lists) {
    const listItems = itemsByList.get(list.id)
    if (!listItems || listItems.length === 0) continue
    rows.push({
      listId: list.id,
      name: list.name,
      purchased: listItems.filter((it) => it.purchased).length,
      pending: listItems.filter((it) => !it.purchased).length,
      total: computeShoppingTotals(listItems, resolvedRates, displayCurrency).total,
    })
  }

  return {
    rows,
    total: global.total,
    remaining: global.remaining,
    byPriority: global.byPriority,
    incomplete: global.total === null,
  }
}
