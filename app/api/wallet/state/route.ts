import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadWallet } from '@/lib/wallet/server'

export const dynamic = 'force-dynamic'

/** Devuelve el estado completo de la billetera del usuario autenticado. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const state = await loadWallet(supabase, user.id)
    return NextResponse.json(state)
  } catch (error) {
    console.error('[api/wallet/state]', error)
    return NextResponse.json({ error: 'No se pudo cargar la billetera' }, { status: 500 })
  }
}
