'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LightbulbIcon } from '@/components/icons'
import { truncateAdvice } from '@/lib/wallet/advice'

interface AdviceCardProps {
  /** Encabezado corto: de qué va el consejo en esta pestaña. */
  title: string
  /** El texto del consejo: el guardado, o el genérico si no hay nada. */
  text: string
}

/**
 * Contenedor del consejo semanal, arriba del contenido de la pestaña.
 *
 * Trunca de forma defensiva por si un modelo hablador se pasa del límite, y preserva
 * los saltos de línea del texto igual que las descripciones.
 */
export function AdviceCard({ title, text }: AdviceCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LightbulbIcon className="size-4" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
          <p
            data-testid="advice-text"
            className="whitespace-pre-line text-sm leading-relaxed text-foreground"
          >
            {truncateAdvice(text)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
