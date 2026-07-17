import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     * - archivos estáticos de Next (_next/static, _next/image)
     * - service worker / PWA (sw.js, workbox)
     * - assets estáticos por extensión
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
