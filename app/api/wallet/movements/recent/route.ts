import { NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadMovements } from '@/lib/wallet/server'

export const dynamic = 'force-dynamic'

const RECENT_LIMIT = 10

export async function GET() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const { items } = await loadMovements(auth.supabase, auth.user.id, { limit: RECENT_LIMIT })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[api/wallet/movements/recent]', error)
    return jsonError('No se pudieron cargar los movimientos', 500)
  }
}
