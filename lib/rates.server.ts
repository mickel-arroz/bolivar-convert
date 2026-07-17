import { Redis } from '@upstash/redis'

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
