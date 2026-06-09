import { LandmarkIcon, DollarIcon, EuroIcon, BinanceIcon, InfoIcon } from '@/components/icons'
import { RateBadge } from '@/components/RateBadge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'

export const RATE_CARDS_CONFIG = [
  {
    id: 'bcvUsd' as const,
    title: 'Dólar Oficial (BCV)',
    icon: (<DollarIcon className="w-6 h-6 text-green-700" strokeWidth={2} />),
    colorClass: 'bg-green-500/80',
    badge: (
      <RateBadge className="text-green-700/80 bg-green-500/10">
        <LandmarkIcon className="w-3.5 h-3.5" /> Tasa del Banco Central de Venezuela
      </RateBadge>
    )
  },
  {
    id: 'bcvEur' as const,
    title: 'Euro Oficial (BCV)',
    icon: (<EuroIcon className="w-6 h-6 text-blue-500" strokeWidth={2} />),
    colorClass: 'bg-blue-500/80',
    badge: (
      <RateBadge className="text-blue-500/80 bg-blue-500/10">
        <LandmarkIcon className="w-3.5 h-3.5" /> Tasa del Banco Central de Venezuela
      </RateBadge>
    )
  },
  {
    id: 'binanceUsdAvg' as const,
    title: 'Binance',
    icon: (<BinanceIcon className="w-6 h-6 text-yellow-500" />),
    colorClass: 'bg-yellow-500/80',
    className: 'md:col-span-2 lg:col-span-1',
    badge: (
      <Tooltip>
        <TooltipTrigger
          render={
            <button className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md" />
          }
        >
          <RateBadge className="text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 cursor-help hover:bg-yellow-500/20 transition-colors">
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
