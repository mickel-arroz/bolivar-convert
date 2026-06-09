import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!redis) {
    return NextResponse.json(
      { error: 'Redis connection not configured' },
      { status: 500 }
    )
  }

  try {
    const [bcvUsd, bcvEur, binanceUsdAvg, lastUpdate] = await Promise.all([
      redis.get<string>('rates:bcv:usd'),
      redis.get<string>('rates:bcv:eur'),
      redis.get<string>('rates:binance:usd:avg'),
      redis.get<string>('rates:last_update')
    ])

    return NextResponse.json({
      bcvUsd,
      bcvEur,
      binanceUsdAvg,
      lastUpdate
    })
  } catch (error) {
    console.error('Error fetching from Redis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    )
  }
}
