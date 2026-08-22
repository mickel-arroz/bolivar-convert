/**
 * Prioridad de un producto de la lista de compras: 1 (alta) a 4 (baja).
 * Cada nivel tiene un color propio, usado únicamente en el badge del producto.
 * Los colores son variables CSS (globals.css) para adaptarse a claro/oscuro.
 */
export const SHOPPING_PRIORITIES = [1, 2, 3, 4] as const

export type ShoppingPriority = (typeof SHOPPING_PRIORITIES)[number]

export const DEFAULT_SHOPPING_PRIORITY: ShoppingPriority = 4

export const PRIORITY_COLORS: Record<ShoppingPriority, string> = {
  1: 'var(--wallet-red)',
  2: 'var(--wallet-orange)',
  3: 'var(--wallet-amber)',
  4: 'var(--wallet-green)',
}

export const PRIORITY_LABELS: Record<ShoppingPriority, string> = {
  1: 'Alta',
  2: 'Media',
  3: 'Baja',
  4: 'Mínima',
}

/** Normaliza cualquier valor a una prioridad válida (por defecto 4). */
export function normalizePriority(value: number | undefined | null): ShoppingPriority {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : DEFAULT_SHOPPING_PRIORITY
}
