'use client'

import { useRates } from '@/hooks/useRates'
import { PageHeader } from '@/components/PageHeader'
import { LastUpdateBadge } from '@/components/LastUpdateBadge'

interface SectionHeaderProps {
  title: string
  description?: string
}

/**
 * Header base compartido por las secciones (Convertir, Historial, Dividir, Billetera).
 * Incluye la insignia de última actualización + título + descripción, con el mismo
 * diseño y espaciado en todas. La página de Tasas (Dashboard) queda fuera a propósito.
 */
export function SectionHeader({ title, description }: SectionHeaderProps) {
  const { rates, isStale, isOffline, formatLastUpdate } = useRates()

  // Con datos al día se muestra la insignia; si no se está actualizando (offline o
  // datos viejos), el OfflineBanner global se encarga del aviso para no duplicar.
  const showBadge = rates.lastUpdate !== '---' && !isStale && !isOffline

  return (
    <PageHeader
      title={title}
      description={description}
      badge={
        showBadge ? (
          <LastUpdateBadge
            lastUpdate={rates.lastUpdate}
            isStale={false}
            formattedDate={formatLastUpdate(rates.lastUpdate)}
          />
        ) : undefined
      }
    />
  )
}
