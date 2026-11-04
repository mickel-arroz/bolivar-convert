import type { TimeRange } from '@/hooks/useWallet'

/** Cómo se agrupan las series de Estadísticas según el rango elegido. */
export type Granularity = 'week' | 'month' | 'quarter'

/** Con más historia que esto, «Todo» agrupa por trimestres para no amontonar meses. */
const MAX_MONTHS_BY_MONTH = 24

const pad = (n: number) => String(n).padStart(2, '0')

/** Fecha local a partir de 'YYYY-MM-DD' (sin corrimiento por zona horaria) o de un ISO completo. */
function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
}

const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function seriesGranularity(
  range: TimeRange,
  firstDate: string | null,
  now: Date = new Date()
): Granularity {
  if (range === '1m') return 'week'
  if (range !== 'all' || !firstDate) return 'month'
  const first = toLocalDate(firstDate)
  const months = (now.getFullYear() - first.getFullYear()) * 12 + now.getMonth() - first.getMonth()
  return months > MAX_MONTHS_BY_MONTH ? 'quarter' : 'month'
}

/**
 * Clave del periodo de una fecha: el lunes de su semana ('YYYY-MM-DD'), su mes ('YYYY-MM')
 * o su trimestre ('YYYY-Qn'). Las claves de una misma granularidad se ordenan como texto.
 */
export function periodKey(value: string | Date, granularity: Granularity): string {
  const d = toLocalDate(value)
  if (granularity === 'month') return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  if (granularity === 'quarter') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
  return dayKey(monday)
}

function nextPeriod(key: string, granularity: Granularity): string {
  if (granularity === 'week') {
    const [y, m, d] = key.split('-').map(Number)
    return dayKey(new Date(y, m - 1, d + 7))
  }
  if (granularity === 'quarter') {
    const [y, q] = key.split('-Q').map(Number)
    return q === 4 ? `${y + 1}-Q1` : `${y}-Q${q + 1}`
  }
  const [y, m] = key.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`
}

/** Todos los periodos de `startKey` a `endKey`, ambos incluidos. */
export function enumeratePeriods(
  startKey: string,
  endKey: string,
  granularity: Granularity
): string[] {
  const out: string[] = []
  for (let key = startKey; key <= endKey && out.length < 600; key = nextPeriod(key, granularity)) {
    out.push(key)
  }
  return out
}

export function periodLabel(key: string, granularity: Granularity): string {
  if (granularity === 'quarter') {
    const [y, q] = key.split('-Q')
    return `T${q} ${y}`
  }
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d || 1)
  return granularity === 'week'
    ? date.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
    : date.toLocaleDateString('es-VE', { month: 'short', year: 'numeric' })
}
