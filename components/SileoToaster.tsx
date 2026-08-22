'use client'

import { useEffect, useState } from 'react'
import { Toaster } from 'sileo'
import { useTheme } from 'next-themes'

export function SileoToaster() {
  const { resolvedTheme } = useTheme()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return (
    <Toaster
      position={isDesktop ? 'bottom-right' : 'top-right'}
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      options={{ fill: 'var(--toast-bg)', roundness: 12 }}
    />
  )
}
