'use client'

import { createElement } from 'react'
import { Account, Category, Goal } from '@/hooks/useWallet'
import { CATEGORY_ICON_MAP, ACCOUNT_ICON_MAP, getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import {
  TransferIcon,
  TemplateIcon,
  PencilIcon,
  TrashIcon,
  DotsIcon,
  WalletIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveCommission, parseSigned, parseAmount } from '@/lib/wallet/compute'
import { FeedItem } from './feed'
import { formatMoney, formatDate } from './format'

interface MovementRowProps {
  item: FeedItem
  accountById: Map<string, Account>
  categoryById: Map<string, Category>
  goalById?: Map<string, Goal>
  onEditTx?: (id: string) => void
  onDeleteTx?: (id: string) => void
  onDeleteTransfer?: (id: string) => void
  onEditGoalMovement?: (id: string) => void
  onDeleteGoalMovement?: (id: string) => void
}

export function MovementRow({
  item,
  accountById,
  categoryById,
  goalById,
  onEditTx,
  onDeleteTx,
  onDeleteTransfer,
  onEditGoalMovement,
  onDeleteGoalMovement,
}: MovementRowProps) {
  if (item.kind === 'budgetTransfer') {
    const bt = item.budgetTransfer
    const from = categoryById.get(bt.fromCategoryId)
    const to = categoryById.get(bt.toCategoryId)
    const FromIcon = CATEGORY_ICON_MAP[from?.icon ?? 'other'] ?? DotsIcon
    const ToIcon = CATEGORY_ICON_MAP[to?.icon ?? 'other'] ?? DotsIcon
    const extra = parseSigned(bt.extra)
    const spent = parseAmount(bt.spent)
    const net = extra - spent
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TemplateIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            Traspaso a{' '}
            <span style={to?.color ? { color: to.color } : undefined}>{to?.name ?? 'presupuesto'}</span>
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <FromIcon className="size-3 shrink-0" />
            {from?.name ?? '—'}
            <span className="px-0.5">→</span>
            <ToIcon className="size-3 shrink-0" />
            {to?.name ?? '—'}
            <span className="shrink-0">· {formatDate(bt.date)}</span>
          </p>
        </div>
        <div className="text-right">
          <p
            className={cn(
              'text-sm font-black tabular-nums',
              net < 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'
            )}
          >
            {net > 0 ? '+' : ''}
            {formatMoney(net, bt.currency)}
          </p>
          {extra !== 0 && spent > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Extra {extra > 0 ? '+' : ''}
              {formatMoney(extra, bt.currency)}
            </p>
          )}
          {spent > 0 && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Gasto −{formatMoney(spent, bt.currency)}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (item.kind === 'transfer') {
    const tr = item.transfer
    const from = accountById.get(tr.fromAccountId)
    const to = accountById.get(tr.toAccountId)
    const FromIcon = ACCOUNT_ICON_MAP[from?.icon ?? 'wallet'] ?? WalletIcon
    const ToIcon = ACCOUNT_ICON_MAP[to?.icon ?? 'wallet'] ?? WalletIcon
    const trCommission = resolveCommission(parseFloat(tr.fromAmount), tr.commission, tr.commissionType)
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <TransferIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">Traspaso</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <FromIcon className="size-3 shrink-0" />
            {from?.name ?? '—'}
            <span className="px-0.5">→</span>
            <ToIcon className="size-3 shrink-0" />
            {to?.name ?? '—'}
            <span className="shrink-0">· {formatDate(tr.date)}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black tabular-nums">
            {to ? formatMoney(parseFloat(tr.toAmount), to.currency) : '—'}
          </p>
          {from && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              −{formatMoney(parseFloat(tr.fromAmount), from.currency)}
            </p>
          )}
          {from && trCommission > 0 && (
            <p className="text-[11px] text-destructive tabular-nums">
              Comis. −{formatMoney(trCommission, from.currency)}
            </p>
          )}
        </div>
        {onDeleteTransfer && (
          <div className="flex items-center">
            {/* Reserva el espacio del botón de editar (los traspasos no se editan). */}
            <span className="size-7 shrink-0" aria-hidden="true" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDeleteTransfer(tr.id)}
              aria-label="Eliminar traspaso"
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (item.kind === 'goalMovement') {
    const m = item.movement
    const goal = goalById?.get(m.goalId)
    const account = accountById.get(m.accountId)
    const accent = goal?.color ?? DEFAULT_ACCOUNT_COLOR
    const AccIcon = ACCOUNT_ICON_MAP[account?.icon ?? 'wallet'] ?? WalletIcon
    const isIn = m.direction === 'in'
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `color-mix(in oklch, ${accent} 18%, transparent)`, color: accent }}
        >
          {createElement(getAccountIcon(goal?.icon), { className: 'size-4' })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">
            {isIn ? 'Aporte a' : 'Retiro de'}{' '}
            <span style={{ color: accent }}>{goal?.name ?? 'Plan de ahorro'}</span>
          </p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <AccIcon className="size-3 shrink-0" />
            {account?.name ?? '—'}
            <span className="truncate">
              {m.note ? ` · ${m.note}` : ''} · {formatDate(m.date)}
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black tabular-nums">
            {account ? formatMoney(m.amount, account.currency) : m.amount}
          </p>
          <p className="text-[11px] text-muted-foreground">{isIn ? 'Apartado' : 'Disponible'}</p>
        </div>
        {(onEditGoalMovement || onDeleteGoalMovement) && (
          <div className="flex items-center">
            {onEditGoalMovement && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEditGoalMovement(m.id)}
                aria-label="Editar movimiento del plan"
              >
                <PencilIcon className="size-4" />
              </Button>
            )}
            {onDeleteGoalMovement && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDeleteGoalMovement(m.id)}
                aria-label="Eliminar movimiento del plan"
              >
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  const tx = item.tx
  const account = accountById.get(tx.accountId)
  const category = categoryById.get(tx.categoryId)
  const Icon = CATEGORY_ICON_MAP[category?.icon ?? 'other'] ?? DotsIcon
  const AccIcon = ACCOUNT_ICON_MAP[account?.icon ?? 'wallet'] ?? WalletIcon
  const isIncome = tx.type === 'income'
  const txCommission = resolveCommission(parseFloat(tx.amount), tx.commission, tx.commissionType)

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
      <div
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isIncome ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
        )}
        style={!isIncome && category?.color ? { color: category.color } : undefined}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{category?.name ?? 'Sin categoría'}</p>
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <AccIcon className="size-3 shrink-0" />
          {account?.name ?? '—'}
          <span className="truncate">
            {tx.note ? ` · ${tx.note}` : ''} · {formatDate(tx.date)}
          </span>
        </p>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-black tabular-nums',
            isIncome ? 'text-green-600 dark:text-green-400' : 'text-destructive'
          )}
        >
          {isIncome ? '+' : '−'}
          {account ? formatMoney(parseFloat(tx.amount), account.currency) : tx.amount}
        </p>
        {account && txCommission > 0 && (
          <p className="text-[11px] text-destructive tabular-nums">
            Comis. −{formatMoney(txCommission, account.currency)}
          </p>
        )}
      </div>
      {(onEditTx || onDeleteTx) && (
        <div className="flex items-center">
          {onEditTx && (
            <Button variant="ghost" size="icon-sm" onClick={() => onEditTx(tx.id)} aria-label="Editar movimiento">
              <PencilIcon className="size-4" />
            </Button>
          )}
          {onDeleteTx && (
            <Button variant="ghost" size="icon-sm" onClick={() => onDeleteTx(tx.id)} aria-label="Eliminar movimiento">
              <TrashIcon className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
