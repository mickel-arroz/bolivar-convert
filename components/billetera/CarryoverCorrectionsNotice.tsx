import type { TransactionChangePlan } from '@/hooks/useWallet'
import { formatMonthLabel } from '@/hooks/useWallet'
import { AlertIcon } from '@/components/icons'
import { formatMoney } from './format'

/**
 * Explica y lista las correcciones al extra arrastrado que implicaría cambiar o eliminar
 * un gasto de un mes ya concluido, para que quien confirma sepa qué decide. No pinta nada
 * si no hay nada que decidir.
 */
export function CarryoverCorrectionsNotice({ plan }: { plan: TransactionChangePlan }) {
  if (plan.corrections.length === 0 && !plan.ratesMissing) return null
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <p className="flex items-start gap-2">
        <AlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
        <span>
          Este gasto es de un mes que ya concluiste: su sobrante se calculó con el monto original.
          {plan.corrections.length > 0 &&
            ' Puedes añadir la diferencia como extra al presupuesto de este mes, o descartarla.'}
        </span>
      </p>
      {plan.corrections.length > 0 && (
        <ul className="flex flex-col gap-1 pl-6 text-xs text-muted-foreground">
          {plan.corrections.map((c) => (
            <li key={`${c.budgetId}-${c.month}`}>
              <strong className="text-foreground">{c.categoryName}</strong> ({formatMonthLabel(c.month)}
              ):{' '}
              <strong className="tabular-nums text-foreground">
                {c.amount > 0 ? '+' : '−'}
                {formatMoney(Math.abs(c.amount), c.currency)}
              </strong>{' '}
              de extra
            </li>
          ))}
        </ul>
      )}
      {plan.ratesMissing && (
        <p className="pl-6 text-xs text-destructive">
          Falta una tasa de cambio para calcular parte de la diferencia: esa parte no se puede
          devolver como extra, ajústala a mano si hace falta.
        </p>
      )}
    </div>
  )
}
