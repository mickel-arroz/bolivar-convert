import type { CSSProperties, ComponentProps, ComponentType, ReactNode } from 'react'
import { WALLET_COLORS, isDefaultColor } from '@/constants/walletColors'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`

/** El color propio de un elemento o, si no tiene, uno de la paleta según su posición. */
export const colorOrPalette = (color: string | undefined, index: number): string =>
  color && !isDefaultColor(color) ? color : WALLET_COLORS[index % WALLET_COLORS.length]

export function ItemIcon({
  icon: Icon,
  color,
}: {
  icon: ComponentType<ComponentProps<'svg'>>
  color: string
}) {
  return (
    <div
      className="flex size-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
    >
      <Icon className="size-4" />
    </div>
  )
}

/** La lista de una card: altura acotada y scroll propio, para que la card no crezca. */
export function ScrollList({ children }: { children: ReactNode }) {
  return (
    <div
      data-testid="stats-scroll"
      className="-mr-2 flex max-h-72 flex-col divide-y overflow-y-auto pr-2"
    >
      {children}
    </div>
  )
}

/** Barra partida en un tramo por elemento, cada uno del ancho de su parte del total. */
export interface SharePart {
  id: string
  name: string
  share: number
  color: string
}

function SharesBar({ parts }: { parts: SharePart[] }) {
  return (
    <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
      {parts.map((part) => (
        <BarWithTip
          key={part.id}
          label={`${part.name} · ${percent(part.share)}`}
          className="h-full"
          style={{ width: `${part.share * 100}%`, backgroundColor: part.color }}
        />
      ))}
    </div>
  )
}

/** Cabecera de una card de reparto: el total en grande y cómo se parte entre sus elementos. */
export function ShareSummary({
  label,
  amount,
  detail,
  parts,
}: {
  label: string
  amount: string
  detail: string
  /** Sin valor (p. ej. falta una tasa), no se dibuja la barra. */
  parts?: SharePart[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-2xl font-black tabular-nums">{amount}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
      {parts && <SharesBar parts={parts} />}
    </div>
  )
}

export function ShareRow({
  testId,
  icon,
  color,
  name,
  detail,
  amount,
  share,
}: {
  testId: string
  icon: ComponentType<ComponentProps<'svg'>>
  color: string
  name: string
  detail?: string
  amount: string
  share: number | null
}) {
  return (
    <div data-testid={testId} className="flex items-center gap-3 py-2.5">
      <ItemIcon icon={icon} color={color} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold">{name}</span>
        {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-sm font-bold tabular-nums">{amount}</span>
        {share !== null && (
          <span className="text-xs text-muted-foreground tabular-nums">{percent(share)}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Una barra o tramo de barra que, al pasar sobre él, dice a qué elemento pertenece y qué
 * porcentaje es. La etiqueta también queda como `aria-label`.
 */
export function BarWithTip({
  label,
  className,
  style,
  children,
}: {
  label: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className={cn('cursor-default', className)}
        style={style}
        render={<div />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="text-xs">{label}</TooltipContent>
    </Tooltip>
  )
}
