'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { TrashIcon } from '@/components/icons'
import { parseAmount } from '@/hooks/useBillSplitter'

/* ─── Formatting helpers ─── */
function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function PersonCard({
  person,
  symbol,
  onRemovePerson,
  onAddItem,
  onRemoveItem,
}: {
  person: { id: string; name: string; items: { id: string; title: string; amount: string }[] }
  symbol: string
  onRemovePerson: (id: string) => void
  onAddItem: (personId: string, title: string, amount: string) => void
  onRemoveItem: (personId: string, itemId: string) => void
}) {
  const [newTitle, setNewTitle] = useState('')
  const [newAmount, setNewAmount] = useState('')

  const subtotal = person.items.reduce((sum, it) => sum + parseAmount(it.amount), 0)

  const handleAdd = (keepFocus = false) => {
    if (!newAmount || parseAmount(newAmount) <= 0) return
    onAddItem(person.id, newTitle, newAmount)
    setNewTitle('')
    setNewAmount('')
    if (keepFocus) {
      setTimeout(() => {
        document.getElementById(`amount-input-${person.id}`)?.focus()
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(true) }
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden py-0 shadow-md">
      {/* Person header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-sm font-black text-primary uppercase">
              {person.name.charAt(0) || '?'}
            </span>
          </div>
          <span className="font-bold text-sm text-foreground">{person.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded-md">
            {symbol}{fmt(subtotal)}
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  className="p-2 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                />
              }
            >
              <TrashIcon className="w-4 h-4" />
              <span className="sr-only">Eliminar a {person.name}</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {person.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminarán todos los ítems de esta persona. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemovePerson(person.id)}>
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Items list */}
      <div className="px-4 pt-3 pb-1 flex flex-col gap-1.5">
        {person.items.length === 0 && (
          <p className="text-xs text-muted-foreground/50 italic py-2 text-center">
            Sin ítems — agrega uno abajo
          </p>
        )}
        {person.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-muted/20"
          >
            <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
              {item.title || <em className="opacity-40">Sin nombre</em>}
            </span>
            <span className="text-sm font-mono font-semibold text-foreground shrink-0">
              {symbol}{fmt(parseAmount(item.amount))}
            </span>
            <button
              onClick={() => onRemoveItem(person.id, item.id)}
              aria-label="Eliminar ítem"
              className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add item row */}
      <div className="px-4 pb-4 pt-2 flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Descripción (opcional)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full sm:flex-1 h-12 text-sm bg-background border-2 border-border/50 rounded-xl transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
        />
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Input
            id={`amount-input-${person.id}`}
            placeholder="Monto"
            type="number"
            min="0"
            step="0.01"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            className="flex-1 sm:flex-none sm:w-28 h-12 text-sm font-bold bg-background border-2 border-border/50 rounded-xl transition-all focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
          <Button
            size="sm"
            onClick={() => handleAdd()}
            disabled={!newAmount || parseAmount(newAmount) <= 0}
            className="h-12 px-4 shrink-0 text-xl font-bold rounded-xl"
            aria-label="Agregar ítem"
          >
            +
          </Button>
        </div>
      </div>
    </Card>
  )
}
