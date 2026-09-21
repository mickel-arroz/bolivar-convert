'use client'

import { useMemo, useState } from 'react'
import { Account, WalletApi } from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCurrency, CURRENCIES, type CurrencyId } from '@/constants/currencies'
import { useWalletResource } from '@/hooks/useWalletResource'
import {
  bsPerUnit,
  normalize,
  type AccountsSummary,
  type FeedItem,
} from '@/lib/wallet/compute'
import type { AccountFunds } from '@/hooks/useWallet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResumenSkeleton, MovementListSkeleton } from './skeletons'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { PlusIcon, TransferIcon, WalletIcon, DotsIcon, TargetIcon } from '@/components/icons'
import { notify } from '@/lib/notify'
import { WalletDialogs } from './dialogs'
import { AccountCard } from './AccountCard'
import { MovementRow } from './MovementRow'
import { ResetWallet } from './ResetWallet'
import { formatMoney } from './format'
import { nextOverride, resolveDisplayCurrency } from '@/lib/wallet/displayCurrency'

const ALL_CURRENCIES: CurrencyId[] = ['VES', 'USD', 'EUR']

interface ResumenTabProps {
  wallet: WalletApi
  rates: Rates
  dialogs: WalletDialogs
}

export function ResumenTab({ wallet, rates, dialogs }: ResumenTabProps) {
  const { state, removeAccount, setNetWorthCurrency } = wallet
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null)

  const pendingDeleteHasGoalMoney = useMemo(
    () =>
      !!pendingDelete &&
      state.goalContributions.some((gc) => gc.accountId === pendingDelete.id),
    [pendingDelete, state.goalContributions]
  )

  const netWorthCurrency = resolveDisplayCurrency(
    state.netWorthCurrencyOverride,
    state.displayCurrency
  )
  const handleNetWorthCurrency = (c: CurrencyId) => {
    setNetWorthCurrency(nextOverride(c, state.displayCurrency))
  }

  const { data: accountsData } = useWalletResource<AccountsSummary>(
    '/api/wallet/accounts',
    wallet.syncedVersion
  )
  const { data: recentData } = useWalletResource<{ items: FeedItem[] }>(
    '/api/wallet/movements/recent',
    wallet.syncedVersion
  )

  const accounts = accountsData?.accounts ?? []
  const totals = accountsData?.totalsByCurrency ?? { VES: 0, USD: 0, EUR: 0 }
  const recentFeed = recentData?.items ?? []

  const fundsById = useMemo(
    () => new Map<string, AccountFunds>((accountsData?.funds ?? []).map((f) => [f.accountId, f])),
    [accountsData]
  )
  const accountById = useMemo(
    () => new Map((accountsData?.accounts ?? []).map((a) => [a.id, a])),
    [accountsData]
  )
  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )

  // El Patrimonio neto incluye el dinero apartado en metas: ahorrar no empobrece
  // (ADR 0002). `inGoals` es la parte de esa cifra que no está Disponible.
  const netWorthCalc = useMemo(() => {
    const t = accountsData?.totalsByCurrency ?? { VES: 0, USD: 0, EUR: 0 }
    const g = accountsData?.inGoalsByCurrency ?? { VES: 0, USD: 0, EUR: 0 }
    const ratesAvailable = ALL_CURRENCIES.filter((c) => (t[c] ?? 0) !== 0)
      .concat(netWorthCurrency)
      .every((c) => bsPerUnit(c, rates, state.statsRateSource) > 0)
    let value = 0
    let inGoals = 0
    ALL_CURRENCIES.forEach((c) => {
      value += normalize(t[c] ?? 0, c, netWorthCurrency, rates, state.statsRateSource)
      inGoals += normalize(g[c] ?? 0, c, netWorthCurrency, rates, state.statsRateSource)
    })
    return { value, inGoals, ratesAvailable }
  }, [accountsData, netWorthCurrency, rates, state.statsRateSource])

  if (!accountsData) {
    return <ResumenSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Patrimonio neto
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Cambiar moneda del patrimonio">
                    <DotsIcon className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuRadioGroup
                  value={netWorthCurrency}
                  onValueChange={(v) => handleNetWorthCurrency(v as CurrencyId)}
                >
                  {CURRENCIES.map((c) => (
                    <DropdownMenuRadioItem key={c.id} value={c.id}>
                      {c.label} ({c.symbol})
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {netWorthCalc.ratesAvailable ? (
            <div className="flex flex-col gap-0.5">
              <p className="text-3xl font-black tracking-tight tabular-nums">
                {formatMoney(netWorthCalc.value, netWorthCurrency)}
              </p>
              {netWorthCalc.inGoals !== 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <TargetIcon className="size-3.5 shrink-0" />
                  <span className="tabular-nums">
                    De lo cual {formatMoney(netWorthCalc.inGoals, netWorthCurrency)} en metas
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-2xl font-black text-muted-foreground">
              {getCurrency(netWorthCurrency).symbol}{' '}
              — <span className="text-sm font-medium">tasa no disponible</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-muted/60 px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground"
              >
                {formatMoney(totals[c.id] ?? 0, c.id)}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-[11px] text-muted-foreground sm:flex-1">
              Suma de todas tus cuentas convertida a {getCurrency(netWorthCurrency).label.toLowerCase()} con la tasa actual.
            </p>
            <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
              <Button size="sm" onClick={dialogs.openNewAccount}>
                <PlusIcon /> Nueva cuenta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dialogs.openNewTransaction()}
                disabled={accounts.length === 0}
              >
                <PlusIcon /> Nuevo movimiento
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={dialogs.openTransfer}
                disabled={accounts.length < 2}
              >
                <TransferIcon /> Traspaso
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
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
          {accounts.map((account) => {
            const funds = fundsById.get(account.id)
            return (
              <AccountCard
                key={account.id}
                account={account}
                available={funds?.available ?? 0}
                inGoals={funds?.inGoals ?? 0}
                onEdit={() => dialogs.openEditAccount(account)}
                onDelete={() => setPendingDelete(account)}
              />
            )
          })}
        </div>
      )}

      {(!recentData || recentFeed.length > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Movimientos recientes
          </h2>
          {!recentData ? (
            <MovementListSkeleton rows={4} />
          ) : (
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
          )}
        </div>
      )}

      <ResetWallet wallet={wallet} />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{pendingDelete?.name}» junto con todos sus movimientos y traspasos asociados.
              {pendingDeleteHasGoalMoney &&
                ' Lo que apartaste en metas de ahorro se queda en sus metas y deja de contar como En metas de ninguna cuenta.'}{' '}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) {
                  removeAccount(pendingDelete.id)
                  notify.success('Cuenta eliminada')
                }
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
