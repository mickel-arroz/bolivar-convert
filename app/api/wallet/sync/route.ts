import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyWalletDelta } from '@/lib/wallet/server'
import type { WalletDelta } from '@/lib/wallet/delta'

export const dynamic = 'force-dynamic'

/** Aplica el delta (upserts/deletes/prefs) del usuario autenticado en Supabase. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const delta = (await request.json()) as WalletDelta
    await applyWalletDelta(supabase, user.id, delta)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/wallet/sync]', error)
    return NextResponse.json({ error: 'No se pudo sincronizar la billetera' }, { status: 500 })
  }
}
