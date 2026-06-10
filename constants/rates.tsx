import { LandmarkIcon, DollarIcon, EuroIcon, BinanceIcon, InfoIcon } from '@/components/icons'
import { RateBadge } from '@/components/RateBadge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

export const RATES_METADATA = {
  bcvUsd: {
    id: 'bcvUsd' as const,
    label: 'Dólar Oficial (BCV)',
    shortLabel: 'Dólar BCV',
    subLabel: 'Oficial',
    icon: <DollarIcon className="size-6 text-green-700" strokeWidth={2} />,
    iconComponent: DollarIcon,
    colorClass: 'bg-green-500/80',
    historyColor: "var(--rate-usd)",
  },
  bcvEur: {
    id: 'bcvEur' as const,
    label: 'Euro Oficial (BCV)',
    shortLabel: 'Euro BCV',
    subLabel: 'Oficial',
    icon: <EuroIcon className="size-6 text-blue-500" strokeWidth={2} />,
    iconComponent: EuroIcon,
    colorClass: 'bg-blue-500/80',
    historyColor: "var(--rate-eur)",
  },
  binanceUsdAvg: {
    id: 'binanceUsdAvg' as const,
    label: 'Binance',
    shortLabel: 'Binance',
    subLabel: 'Mercado P2P',
    icon: <BinanceIcon className="size-6 text-yellow-500" />,
    iconComponent: BinanceIcon,
    colorClass: 'bg-yellow-500/80',
    historyColor: "var(--rate-binance)",
  },
} as const

export type RateId = keyof typeof RATES_METADATA

export type Rates = Partial<Record<RateId, string>> & {
  lastUpdate: string
}

export interface RateInfo {
  id: RateId
  label: string
  shortLabel: string
  subLabel: string
  icon: React.ReactNode
  iconComponent: React.ComponentType<React.ComponentProps<'svg'>>
  colorClass: string
  historyColor: string
  className?: string
}

export const RATE_CARDS_CONFIG: (RateInfo & { badge: React.ReactNode })[] = [
  {
    ...RATES_METADATA.bcvUsd,
    badge: (
      <RateBadge className="text-green-700/80 bg-green-500/10">
        <LandmarkIcon className="w-3.5 h-3.5" /> Tasa del Banco Central de Venezuela
      </RateBadge>
    )
  },
  {
    ...RATES_METADATA.bcvEur,
    badge: (
      <RateBadge className="text-blue-500/80 bg-blue-500/10">
        <LandmarkIcon className="w-3.5 h-3.5" /> Tasa del Banco Central de Venezuela
      </RateBadge>
    )
  },
  {
    ...RATES_METADATA.binanceUsdAvg,
    className: 'md:col-span-2 lg:col-span-1',
    badge: (
      <Tooltip>
        <TooltipTrigger className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md appearance-none bg-transparent border-none p-0 cursor-help">
          <RateBadge className="text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors">
            <BinanceIcon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />{' '}
            Mediana de Binance P2P <InfoIcon className="w-3 h-3 ml-0.5 opacity-70" />
          </RateBadge>
        </TooltipTrigger>
        <TooltipContent className="max-w-62.5 text-center">
          <p>
            Mercado P2P de Binance calculado por la media con las 20 mejores ofertas de compra y las 20 mejores
            ofertas de venta
          </p>
        </TooltipContent>
      </Tooltip>
    )
  }
]
