'use client'

import { Toaster } from 'sileo'
import { useTheme } from 'next-themes'

export function SileoToaster() {
  const { resolvedTheme } = useTheme()
  return (
    <Toaster
      position="top-right"
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      options={{ fill: 'var(--popover)', roundness: 12 }}
    />
  )
}
