import type { StatsBundle } from '@/hooks/useWallet'
import type { PlansAndListsStats } from './statsPlansLists'
import type { StatsParams } from './statsQuery'

/**
 * Lo que devuelve /api/wallet/stats: el bundle del Periodo, los planes y las listas, y con
 * qué se calculó todo (para que el cliente reconozca datos viejos).
 */
export type StatsView = StatsBundle & PlansAndListsStats & { params: StatsParams }

/** Unas estadísticas sin ningún dato: el punto de partida en los tests. */
export const EMPTY_STATS_VIEW: StatsView = {
  incomeVsExpense: { income: 0, expense: 0 },
  categorySummary: [],
  periodSeries: [],
  netWorth: 0,
  netWorthSeries: [],
  budgetStatus: [],
  budgetRange: [],
  budgetUsage: { currency: 'VES', spent: 0, total: 0, ratio: 0, onTrack: 0, over: 0 },
  ratesAvailable: true,
  grouping: 'month',
  savingsPlans: { rows: [], progress: null, contributed: 0 },
  shoppingLists: { rows: [], remaining: 0, purchased: 0 },
  params: { timeRange: '1m', displayCurrency: 'USD', statsRateSource: 'bcvUsd' },
}
