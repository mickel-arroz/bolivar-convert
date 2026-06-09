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
    const history = await redis.lrange('rates:history', 0, -1)
    
    // Parse JSON strings from Redis
    const parsedHistory = history.map(item => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item)
        } catch {
          return item
        }
      }
      return item
    })

    return NextResponse.json(parsedHistory)
  } catch (error) {
    console.error('Error fetching history from Redis:', error)
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    )
  }
}
