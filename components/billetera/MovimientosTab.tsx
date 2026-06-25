'use client'

import { useMemo } from 'react'
import { WalletApi } from '@/hooks/useWallet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PlusIcon, TransferIcon, ListIcon, LayoutIcon } from '@/components/icons'
import { WalletDialogs } from './dialogs'
import { buildFeed } from './feed'
import { MovementRow } from './MovementRow'

interface MovimientosTabProps {
  wallet: WalletApi
  dialogs: WalletDialogs
}

export function MovimientosTab({ wallet, dialogs }: MovimientosTabProps) {
  const { state, removeTransaction, removeTransfer } = wallet

  const accountById = useMemo(() => new Map(state.accounts.map((a) => [a.id, a])), [state.accounts])
  const categoryById = useMemo(
    () => new Map(state.categories.map((c) => [c.id, c])),
    [state.categories]
  )
  const feed = useMemo(
    () => buildFeed(state.transactions, state.transfers),
    [state.transactions, state.transfers]
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => dialogs.openNewTransaction('expense')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Gasto
        </Button>
        <Button
          variant="outline"
          onClick={() => dialogs.openNewTransaction('income')}
          disabled={state.accounts.length === 0}
        >
          <PlusIcon /> Ingreso
        </Button>
        <Button variant="outline" onClick={dialogs.openTransfer} disabled={state.accounts.length < 2}>
          <TransferIcon /> Traspaso
        </Button>
        <Button variant="ghost" onClick={dialogs.openCategories}>
          <LayoutIcon /> Categorías
        </Button>
      </div>

      {feed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ListIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No hay movimientos todavía. Registra un ingreso, gasto o traspaso.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {feed.map((item) => (
            <MovementRow
              key={item.id}
              item={item}
              accountById={accountById}
              categoryById={categoryById}
              onEditTx={(id) => {
                const tx = state.transactions.find((t) => t.id === id)
                if (tx) dialogs.openEditTransaction(tx)
              }}
              onDeleteTx={removeTransaction}
              onDeleteTransfer={removeTransfer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
