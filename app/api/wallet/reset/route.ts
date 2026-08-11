import { NextRequest, NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { resetWalletMoney, resetWalletAll } from '@/lib/wallet/server'

export const dynamic = 'force-dynamic'

type ResetMode = 'money' | 'all'

export async function POST(request: NextRequest) {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const { mode } = (await request.json().catch(() => ({}))) as { mode?: ResetMode }
    if (mode === 'money') {
      await resetWalletMoney(auth.supabase, auth.user.id)
    } else if (mode === 'all') {
      await resetWalletAll(auth.supabase, auth.user.id)
    } else {
      return jsonError('Modo inválido', 400)
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/wallet/reset]', error)
    return jsonError('No se pudo restablecer la billetera', 500)
  }
}
