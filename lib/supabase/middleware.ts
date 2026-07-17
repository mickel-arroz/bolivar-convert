import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Rutas que requieren sesión iniciada. */
const PROTECTED_PREFIXES = ['/billetera']
/** Rutas de auth desde las que se redirige si YA hay sesión. */
const AUTH_ROUTES = ['/login', '/register']

/**
 * Refresca la sesión de Supabase en cada request y aplica la protección de rutas:
 * - Sin sesión + ruta protegida → redirige a /login (guardando el destino).
 * - Con sesión + ruta de auth → redirige a /billetera.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  // Sin Supabase configurado, no hay auth: dejar pasar (las páginas públicas siguen
  // funcionando; la billetera mostrará su propio error de carga).
  if (!url || !anonKey) return supabaseResponse

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no ejecutar código entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user && AUTH_ROUTES.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/billetera'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
