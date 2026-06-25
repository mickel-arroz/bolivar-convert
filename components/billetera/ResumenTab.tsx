'use client'

import { useMemo, useState } from 'react'
import { Account, StatsBundle, WalletApi } from '@/hooks/useWallet'
import { getCurrency, CURRENCIES, CurrencyId } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { PlusIcon, TransferIcon, PencilIcon, TrashIcon, WalletIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { WalletDialogs } from './dialogs'
import { buildFeed } from './feed'
import { MovementRow } from './MovementRow'
import { formatMoney } from './format'

/** Anillo de color según la moneda de la cuenta (USD verde, EUR azul, VES naranja). */
function accountAccent(currency: CurrencyId): string {
  switch (currency) {
    case 'USD':
      return 'ring-2 ring-green-500/40'
    case 'EUR':
      return 'ring-2 ring-blue-500/40'
    case 'VES':
    default:
      return 'ring-2 ring-orange-500/40'
  }
}

interface ResumenTabProps {
  wallet: WalletApi
  stats: StatsBundle
  dialogs: WalletDialogs
}

export function ResumenTab({ wallet, stats, dialogs }: ResumenTabProps) {
  const { state, accountBalances, totalsByCurrency, removeAccount } = wallet
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null)

  const balanceById = useMemo(
    () => new Map(accountBalances.map((b) => [b.accountId, b.balance])),
    [accountBalances]
  )
  const accountById = useMemo(() => new Map(state.accounts.map((a) => [a.id, a])), [state.accounts])
  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )

  const recentFeed = useMemo(
    () => buildFeed(state.transactions, state.transfers).slice(0, 6),
    [state.transactions, state.transfers]
  )

  const displaySymbol = getCurrency(state.displayCurrency).symbol

  return (
    <div className="flex flex-col gap-6">
      {/* Patrimonio neto */}
      <Card>
        <CardContent className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Patrimonio neto
          </span>
          {stats.ratesAvailable ? (
            <p className="text-3xl font-black tracking-tight tabular-nums">
              {formatMoney(stats.netWorth, state.displayCurrency)}
            </p>
          ) : (
            <p className="text-2xl font-black text-muted-foreground">
              {displaySymbol} — <span className="text-sm font-medium">tasa no disponible</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-muted/60 px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground"
              >
                {formatMoney(totalsByCurrency[c.id] ?? 0, c.id)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Valor estimado en {getCurrency(state.displayCurrency).label.toLowerCase()} usando la tasa actual.
          </p>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={dialogs.openNewAccount}>
          <PlusIcon /> Nueva cuenta
        </Button>
        <Button
          variant="outline"
          onClick={() => dialogs.openNewTransaction()}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Nuevo movimiento
        </Button>
        <Button
          variant="outline"
          onClick={dialogs.openTransfer}
          disabled={state.accounts.length < 2}
        >
          <TransferIcon /> Traspaso
        </Button>
      </div>

      {/* Cuentas */}
      {state.accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <WalletIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes cuentas. Crea tu primera cuenta para empezar.
            </p>
            <Button onClick={dialogs.openNewAccount}>
              <PlusIcon /> Crear cuenta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {state.accounts.map((account) => {
            const balance = balanceById.get(account.id) ?? 0
            const AccIcon = getAccountIcon(account.icon)
            return (
              <Card key={account.id} className={accountAccent(account.currency)}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <AccIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{getCurrency(account.currency).label}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => dialogs.openEditAccount(account)}
                        aria-label="Editar cuenta"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setPendingDelete(account)}
                        aria-label="Eliminar cuenta"
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p
                    className={cn(
                      'text-2xl font-black tabular-nums',
                      balance < 0 ? 'text-destructive' : 'text-foreground'
                    )}
                  >
                    {formatMoney(balance, account.currency)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Movimientos recientes */}
      {recentFeed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Movimientos recientes
          </h2>
          <div className="flex flex-col gap-2">
            {recentFeed.map((item) => (
              <MovementRow
                key={item.id}
                item={item}
                accountById={accountById}
                categoryById={categoryById}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmación de borrado de cuenta */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDelete?.name}» junto con todos sus movimientos y traspasos asociados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) removeAccount(pendingDelete.id)
                setPendingDelete(null)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
