'use client'

import { useMemo, useState, useEffect } from 'react'
import { Account, WalletApi } from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'
import { getCurrency, CURRENCIES, type CurrencyId } from '@/constants/currencies'
import { getAccountIcon } from '@/constants/walletCategories'
import { DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { PlusIcon, TransferIcon, PencilIcon, TrashIcon, WalletIcon, DotsIcon } from '@/components/icons'

/** Moneda destacada del patrimonio neto (preferencia local del dispositivo). */
const NETWORTH_CURRENCY_KEY = 'bolivar_networth_currency_v1'
import { cn } from '@/lib/utils'
import { WalletDialogs } from './dialogs'
import { buildFeed } from './feed'
import { MovementRow } from './MovementRow'
import { formatMoney } from './format'

interface ResumenTabProps {
  wallet: WalletApi
  rates: Rates
  dialogs: WalletDialogs
}

export function ResumenTab({ wallet, rates, dialogs }: ResumenTabProps) {
  const { state, accountBalances, totalsByCurrency, removeAccount, netWorthIn } = wallet
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null)

  // Moneda destacada del patrimonio neto: por defecto USD, recordada en localStorage.
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

  // Patrimonio neto = suma de TODAS las cuentas convertida a la moneda elegida.
  const netWorthCalc = netWorthIn(netWorthCurrency, rates)

  return (
    <div className="flex flex-col gap-6">
      {/* Patrimonio neto */}
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
                {formatMoney(totalsByCurrency[c.id] ?? 0, c.id)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Suma de todas tus cuentas convertida a {getCurrency(netWorthCurrency).label.toLowerCase()} con la tasa actual.
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
