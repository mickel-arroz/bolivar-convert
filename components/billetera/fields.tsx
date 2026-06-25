import { ReactNode } from 'react'
import { CURRENCIES, CurrencyId } from '@/constants/currencies'
import { TransactionType } from '@/hooks/useWallet'
import { cn } from '@/lib/utils'

/** Campo con etiqueta superior, usado en los formularios de la billetera. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Selector de moneda (Bs. / $ / €) en formato de grupo de botones. */
export function CurrencyToggle({
  value,
  onChange,
}: {
  value: CurrencyId
  onChange: (currency: CurrencyId) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
      {CURRENCIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={cn(
            'rounded-md py-1.5 text-sm font-bold transition-all',
            value === c.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {c.symbol}
        </button>
      ))}
    </div>
  )
}

/** Selector de tipo de movimiento (Gasto / Ingreso). */
export function TypeToggle({
  value,
  onChange,
}: {
  value: TransactionType
  onChange: (type: TransactionType) => void
}) {
  const options = [
    { id: 'expense' as const, label: 'Gasto' },
    { id: 'income' as const, label: 'Ingreso' },
  ]
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-md py-1.5 text-sm font-bold transition-all',
            value === o.id
              ? o.id === 'income'
                ? 'bg-green-500/15 text-green-600 shadow-sm dark:text-green-400'
                : 'bg-destructive/15 text-destructive shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
