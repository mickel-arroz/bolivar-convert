import { Redis } from '@upstash/redis'
import { unstable_cache } from 'next/cache'

/**
 * Duración del cache de lecturas de Redis. Las tasas del BCV se actualizan como
 * mucho una vez al día, así que 30 min es holgado y evita pegarle a Redis en cada
 * carga de página.
 */
export const RATES_CACHE_SECONDS = 1800 // 30 minutos
/** Tag para invalidar el cache manualmente (p. ej. tras un scrape). */
export const RATES_CACHE_TAG = 'rates-history'

/** Entrada del historial unificado en Redis (`rates:history`). */
export interface RateHistoryEntry {
  date: string
  bcvUsd: number | null
  bcvEur: number | null
  binanceUsdAvg: number | null
  updatedAt?: string
}

/** Cliente Redis o null si no está configurado (permite degradar sin romper). */
export function getRedis(): Redis | null {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null
}

/**
 * Lee `rates:history`, parsea cada entrada (Upstash puede devolver string u objeto)
 * y las ordena ascendentemente por fecha.
 */
export async function readHistory(redis: Redis): Promise<RateHistoryEntry[]> {
  const raw = (await redis.lrange('rates:history', 0, -1)) as unknown[]
  const parsed = raw
    .map((item) => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item) as RateHistoryEntry
        } catch {
          return null
        }
      }
      return item as RateHistoryEntry
    })
    .filter((e): e is RateHistoryEntry => !!e && typeof e.date === 'string')

  return parsed.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Lectura del historial con cache de {@link RATES_CACHE_SECONDS}. Guarda el
 * resultado en el Data Cache de Next, de modo que múltiples cargas (y ambos
 * endpoints `/api/rates` e `/api/history`) reutilizan la misma lectura de Redis
 * durante la ventana de cache en vez de consultar Redis cada vez.
 */
export const readHistoryCached = unstable_cache(
  async (): Promise<RateHistoryEntry[]> => {
    const redis = getRedis()
    if (!redis) return []
    return readHistory(redis)
  },
  ['rates:history'],
  { revalidate: RATES_CACHE_SECONDS, tags: [RATES_CACHE_TAG] }
)

/** Tasas actuales (última entrada del historial ≤ hoy) como strings, o vacías. */
export async function getCurrentRates(): Promise<{
  bcvUsd?: string
  bcvEur?: string
  binanceUsdAvg?: string
  lastUpdate: string
}> {
  const history = await readHistoryCached()
  const current = history.length > 0 ? history[history.length - 1] : null
  if (!current) return { lastUpdate: '' }
  const s = (v: number | null | undefined) => (v === null || v === undefined ? undefined : String(v))
  return {
    bcvUsd: s(current.bcvUsd),
    bcvEur: s(current.bcvEur),
    binanceUsdAvg: s(current.binanceUsdAvg),
    lastUpdate: current.updatedAt ?? current.date,
  }
}
