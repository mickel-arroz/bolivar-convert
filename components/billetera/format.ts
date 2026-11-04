import { CurrencyId, getCurrency } from '@/constants/currencies'

/** Una proporción (0.25) como porcentaje con su «%» pegado: «25%», o «12,5%» con decimales. */
export function formatPercent(ratio: number, maxDecimals = 0): string {
  return `${(ratio * 100).toLocaleString('es-VE', { maximumFractionDigits: maxDecimals })}%`
}

/**
 * Formatea un monto con el símbolo de su moneda (es-VE para Bs., en-US para divisas).
 * Símbolo y monto van unidos por un espacio de no separación: nunca se parten en dos líneas.
 */
export function formatMoney(value: number, currency: CurrencyId): string {
  const { symbol } = getCurrency(currency)
  const locale = currency === 'VES' ? 'es-VE' : 'en-US'
  const safe = Number.isFinite(value) ? value : 0
  const formatted = safe.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${symbol} ${formatted}`
}

/** Formatea una fecha 'YYYY-MM-DD' o ISO a 'dd mmm yyyy' (en UTC para evitar desfases). */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** Fecha de hoy como 'YYYY-MM-DD' para inicializar inputs de tipo date. */
export function todayInputValue(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' })
}
