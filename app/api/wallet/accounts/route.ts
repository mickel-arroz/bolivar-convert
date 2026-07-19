import { NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadAccountsSummary } from '@/lib/wallet/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const summary = await loadAccountsSummary(auth.supabase, auth.user.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[api/wallet/accounts]', error)
    return jsonError('No se pudieron cargar las cuentas', 500)
  }
}
