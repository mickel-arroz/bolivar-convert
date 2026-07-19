import { NextRequest, NextResponse } from 'next/server'
import { authenticate, jsonError } from '@/lib/api/route-helpers'
import { loadMovements } from '@/lib/wallet/server'

export const dynamic = 'force-dynamic'

// Tamaño de página fijo del lado del servidor: el usuario no puede cambiarlo.
const PAGE_SIZE = 30

export async function GET(request: NextRequest) {
  const auth = await authenticate()
  if (auth.response) return auth.response
  try {
    const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1')
    const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
    const result = await loadMovements(auth.supabase, auth.user.id, { page, pageSize: PAGE_SIZE })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[api/wallet/movements]', error)
    return jsonError('No se pudieron cargar los movimientos', 500)
  }
}
