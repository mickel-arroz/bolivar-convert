'use client'

import { useMemo, useState, useEffect } from 'react'
import { Account, WalletApi } from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCurrency, CURRENCIES, type CurrencyId } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { useWalletResource } from '@/hooks/useWalletResource'
import {
  bsPerUnit,
  normalize,
  type AccountsSummary,
  type FeedItem,
} from '@/lib/wallet/compute'
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
import { PlusIcon, TransferIcon, PencilIcon, TrashIcon, WalletIcon, DotsIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { notify } from '@/lib/notify'
import { WalletDialogs } from './dialogs'
import { MovementRow } from './MovementRow'
import { formatMoney } from './format'

const NETWORTH_CURRENCY_KEY = 'bolivar_networth_currency_v1'

const ALL_CURRENCIES: CurrencyId[] = ['VES', 'USD', 'EUR']

interface ResumenTabProps {
  wallet: WalletApi
  rates: Rates
  dialogs: WalletDialogs
}

export function ResumenTab({ wallet, rates, dialogs }: ResumenTabProps) {
  const { state, removeAccount } = wallet
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null)

  const [netWorthCurrency, setNetWorthCurrency] = useState<CurrencyId>('USD')
  useEffect(() => {
    const saved = localStorage.getItem(NETWORTH_CURRENCY_KEY)
    if (saved === 'VES' || saved === 'USD' || saved === 'EUR') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNetWorthCurrency(saved)
    }
  }, [])
  const handleNetWorthCurrency = (c: CurrencyId) => {
    setNetWorthCurrency(c)
    try {
      localStorage.setItem(NETWORTH_CURRENCY_KEY, c)
    } catch {
      /* ignore */
    }
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

  const balanceById = useMemo(
    () => new Map((accountsData?.balances ?? []).map((b) => [b.accountId, b.balance])),
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

  const netWorthCalc = useMemo(() => {
    const t = accountsData?.totalsByCurrency ?? { VES: 0, USD: 0, EUR: 0 }
    const ratesAvailable = ALL_CURRENCIES.filter((c) => (t[c] ?? 0) !== 0)
      .concat(netWorthCurrency)
      .every((c) => bsPerUnit(c, rates, state.statsRateSource) > 0)
    let value = 0
    ALL_CURRENCIES.forEach((c) => {
      value += normalize(t[c] ?? 0, c, netWorthCurrency, rates, state.statsRateSource)
    })
    return { value, ratesAvailable }
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
            <p className="text-3xl font-black tracking-tight tabular-nums">
              {formatMoney(netWorthCalc.value, netWorthCurrency)}
            </p>
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
            const balance = balanceById.get(account.id) ?? 0
            const AccIcon = getAccountIcon(account.icon)
            const accent = account.color ?? DEFAULT_ACCOUNT_COLOR
            return (
              <Card
                key={account.id}
                style={{
                  boxShadow: `0 0 0 2px color-mix(in oklch, ${accent} 40%, transparent)`,
                }}
              >
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
