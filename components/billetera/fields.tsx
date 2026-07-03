import { ReactNode } from 'react'
import { CURRENCIES, CurrencyId } from '@/constants/currencies'
import { TransactionType } from '@/hooks/useWallet'
import { WALLET_COLORS, DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { CheckIcon } from '@/components/icons'
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

/**
 * Selector de color en cuadrícula (mismo patrón que la grilla de iconos). Incluye una
 * opción "sin color" (gris por defecto). `value` undefined equivale a gris.
 */
export function ColorPicker({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (color: string | undefined) => void
}) {
  const isDefault = !value || value === DEFAULT_ACCOUNT_COLOR
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {/* Sin color (gris) */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        aria-label="Sin color"
        className={cn(
          'flex aspect-square items-center justify-center rounded-lg border transition-all',
          isDefault ? 'border-foreground/60' : 'border-border/50 hover:border-foreground/40'
        )}
        style={{ backgroundColor: `color-mix(in oklch, ${DEFAULT_ACCOUNT_COLOR} 25%, transparent)` }}
      >
        {isDefault && <CheckIcon className="size-4" style={{ color: DEFAULT_ACCOUNT_COLOR }} />}
      </button>
      {WALLET_COLORS.map((color) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Color ${color}`}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg border transition-all',
              selected ? 'border-foreground/60' : 'border-transparent hover:border-foreground/40'
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <CheckIcon className="size-4 text-white" />}
          </button>
        )
      })}
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
