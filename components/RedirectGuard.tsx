'use client'

import { useEffect, useState, ReactNode, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader } from '@/components/ui/Loader'

interface RedirectGuardProps {
  children: ReactNode
}

export function RedirectGuard({ children }: RedirectGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const hasCheckedRedirect = useRef(false)

  // Solo decidir si redirigir en el primer montaje o cuando cambie la ruta ANTES de estar listos
  useEffect(() => {
    if (hasCheckedRedirect.current) {
      setIsReady(true)
      return
    }

    const savedPath = localStorage.getItem('lastVisitedPath')
    
    // Si hay una ruta guardada y es diferente a la actual, forzamos la restauración de sesión
    if (savedPath && savedPath !== pathname) {
      hasCheckedRedirect.current = true
      router.replace(savedPath)
    } else {
      hasCheckedRedirect.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true)
    }
  }, [pathname, router])

  // Guardar la ruta actual cada vez que cambie, siempre que estemos listos
  useEffect(() => {
    if (isReady) {
      localStorage.setItem('lastVisitedPath', pathname)
    }
  }, [pathname, isReady])

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <Loader size="lg" />
      </div>
    )
  }

  return <>{children}</>
}
