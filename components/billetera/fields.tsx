import { ReactNode } from 'react'
import { CURRENCIES, CurrencyId } from '@/constants/currencies'
import { TransactionType, CommissionType } from '@/hooks/useWallet'
import { WALLET_COLORS, DEFAULT_ACCOUNT_COLOR } from '@/constants/walletColors'
import { CheckIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { useMathInput, formatPreview } from '@/hooks/useMathInput'

/** Campo con etiqueta superior, usado en los formularios de la billetera. */
export function Field({
  label,
  children,
  hint,
  preview,
}: {
  label: string
  children: ReactNode
  hint?: string
  /** Nodo alineado a la derecha, en la misma fila que el label (p. ej. resultado). */
  preview?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-4 items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        {preview}
      </div>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

/** Vista previa "= N" del resultado de una expresión, para la fila del label. */
export function AmountPreview({
  value,
  maxDecimals = 2,
}: {
  value: number
  maxDecimals?: number
}) {
  return (
    <span className="mr-2 text-xs font-bold tabular-nums text-primary">
      = {formatPreview(value, maxDecimals)}
    </span>
  )
}

/**
 * Campo de monto/tasa con soporte de operaciones matemáticas simples. El resultado
 * evaluado se muestra alineado a la derecha en la fila del label. El padre recibe
 * siempre un string numérico plano vía `onValueChange`.
 */
export function AmountField({
  label,
  hint,
  value,
  onValueChange,
  maxDecimals = 2,
  placeholder = '0,00',
  autoFocus,
  disabled,
  id,
  className,
}: {
  label: string
  hint?: string
  value: string
  onValueChange: (numeric: string) => void
  maxDecimals?: number
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  id?: string
  className?: string
}) {
  const { inputProps, showPreview, evaluated } = useMathInput(value, onValueChange, { maxDecimals })
  return (
    <Field
      label={label}
      hint={hint}
      preview={showPreview ? <AmountPreview value={evaluated!} maxDecimals={maxDecimals} /> : undefined}
    >
      <Input
        {...inputProps}
        id={id}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className={className}
      />
    </Field>
  )
}

/** Campo de comisión (costo) opcional con toggle porcentual/fijo y soporte de operaciones matemáticas. */
export function CommissionField({
  label = 'Comisión',
  hint,
  type,
  onTypeChange,
  value,
  onValueChange,
  currencySymbol,
  disabled,
}: {
  label?: string
  hint?: string
  type: CommissionType
  onTypeChange: (type: CommissionType) => void
  value: string
  onValueChange: (numeric: string) => void
  /** Símbolo de la moneda a cobrar en modo fijo (p. ej. 'Bs.'). */
  currencySymbol?: string
  disabled?: boolean
}) {
  const { inputProps, showPreview, evaluated } = useMathInput(value, onValueChange, { maxDecimals: 2 })
  const options: { id: CommissionType; label: string }[] = [
    { id: 'percent', label: '%' },
    { id: 'fixed', label: currencySymbol ?? 'Monto' },
  ]
  return (
    <Field
      label={label}
      hint={hint}
      preview={showPreview ? <AmountPreview value={evaluated!} /> : undefined}
    >
      <div className="flex gap-2">
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg bg-muted/50 p-1">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onTypeChange(o.id)}
              disabled={disabled}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-bold transition-all',
                type === o.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <Input
          {...inputProps}
          placeholder={type === 'percent' ? '0' : '0,00'}
          disabled={disabled}
          className="flex-1"
        />
      </div>
    </Field>
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
