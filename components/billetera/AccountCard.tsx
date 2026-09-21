'use client'

import { createElement } from 'react'
import type { Account } from '@/hooks/useWallet'
import { getCurrency } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PencilIcon, TrashIcon, TargetIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatMoney } from './format'

interface AccountCardProps {
  account: Account
  /** **Disponible**: la cifra grande, lo que se puede gastar hoy. */
  available: number
  /** **En metas**: lo apartado en metas de ahorro desde esta cuenta. */
  inGoals: number
  onEdit: () => void
  onDelete: () => void
}

/**
 * Tarjeta de una cuenta en el tab Resumen.
 *
 * Muestra el **Disponible** en grande y el **En metas** debajo. La línea de En metas
 * solo se renderiza cuando hay algo apartado, igual que el desglose por prioridad
 * omite las prioridades vacías: una cuenta sin metas se ve como siempre (ADR 0002).
 */
export function AccountCard({ account, available, inGoals, onEdit, onDelete }: AccountCardProps) {
  const accent = account.color ?? DEFAULT_ACCOUNT_COLOR

  return (
    <Card style={{ boxShadow: `0 0 0 2px color-mix(in oklch, ${accent} 40%, transparent)` }}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`,
                color: accent,
              }}
            >
              {createElement(getAccountIcon(account.icon), { className: 'size-4' })}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold">{account.name}</p>
              <p className="text-xs text-muted-foreground">{getCurrency(account.currency).label}</p>
            </div>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Editar cuenta">
              <PencilIcon className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Eliminar cuenta">
              <TrashIcon className="size-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <p
            data-testid="account-available"
            className={cn(
              'text-2xl font-black tabular-nums',
              available < 0 ? 'text-destructive' : 'text-foreground'
            )}
          >
            {formatMoney(available, account.currency)}
          </p>
          {inGoals !== 0 && (
            <p
              data-testid="account-in-goals"
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
            >
              <TargetIcon className="size-3.5 shrink-0" />
              <span className="tabular-nums">
                {formatMoney(inGoals, account.currency)} en metas
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
