'use client'

import { PageHeader } from '@/components/PageHeader'
import { LastUpdateBadge } from '@/components/LastUpdateBadge'
import { useRates } from '@/hooks/useRates'

export function DividirHeader() {
  const { rates, isStale, formatLastUpdate } = useRates()

  return (
    <PageHeader
      title="Dividir Factura"
      description="Calcula cuánto debe pagar cada uno, incluyendo IVA y propina"
      className="mb-8 max-w-2xl mx-auto"
      badge={
        <LastUpdateBadge
          lastUpdate={rates.lastUpdate}
          isStale={isStale}
          formattedDate={formatLastUpdate(rates.lastUpdate)}
        />
      }
    />
  )
}
