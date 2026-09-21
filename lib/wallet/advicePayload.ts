/**
 * Lo que se le manda al modelo para generar los consejos: **agregados** y los nombres
 * que el usuario escribió, nunca el detalle de sus transacciones.
 *
 * Módulo neutro (sin React ni acceso a red). Los saldos salen de `computeAccountFunds`,
 * los mismos que ve el usuario en sus tarjetas de cuenta: duplicar ese cálculo es cómo
 * las cifras se desincronizan (ADR 0002).
 */
import type { CurrencyId } from '@/constants/currencies'
import type { Rates, RateId } from '@/constants/rates'
import type {
  Account,
  Budget,
  BudgetTransfer,
  Category,
  Goal,
  GoalContribution,
  ShoppingList,
  ShoppingListItem,
  TimeRange,
  Transaction,
  Transfer,
} from '@/hooks/useWallet'
import { ADVICE_MAX_LENGTH } from './advice'
import {
  bsPerUnit,
  computeAccountFunds,
  computeStats,
  monthKey,
  parseAmount,
  parseSigned,
} from './compute'
import { computeAllListsTotals, type ResolvedRates } from './shoppingTotals'

/** Todo lo que hace falta leer para armar el payload. */
export interface AdviceInput {
  accounts: Account[]
  transactions: Transaction[]
  transfers: Transfer[]
  categories: Category[]
  budgets: Budget[]
  budgetTransfers: BudgetTransfer[]
  goals: Goal[]
  goalContributions: GoalContribution[]
  shoppingLists: ShoppingList[]
  shoppingItems: ShoppingListItem[]
  displayCurrency: CurrencyId
  statsRateSource: RateId
  timeRange: TimeRange
}

export interface AdvicePayload {
  /** Moneda en la que están expresadas todas las cifras agregadas. */
  currency: CurrencyId
  /** Una entrada por cuenta con sus tres cifras. */
  accounts: {
    name: string
    currency: CurrencyId
    balance: number
    available: number
    inGoals: number
  }[]
  /** Totales por categoría del período, con el nombre que el usuario le puso. */
  categories: { name: string; kind: 'income' | 'expense'; total: number }[]
  /** Avance de cada presupuesto del mes en curso. */
  budgets: { category: string; limit: number; spent: number; currency: CurrencyId }[]
  /** Avance de cada meta de ahorro. */
  goals: { name: string; saved: number; target: number | null; currency: CurrencyId }[]
  /** Listas de compras: sus nombres y el **Restante total por pagar**. */
  shopping: { lists: string[]; remaining: number | null }
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Arma los agregados que viajan al modelo. Nunca incluye transacciones individuales. */
export function buildAdvicePayload(input: AdviceInput, rates: Rates): AdvicePayload {
  const { displayCurrency, statsRateSource } = input

  const funds = computeAccountFunds({
    accounts: input.accounts,
    transactions: input.transactions,
    transfers: input.transfers,
    goalContributions: input.goalContributions,
  })
  const accountById = new Map(input.accounts.map((a) => [a.id, a]))

  const stats = computeStats(
    {
      accounts: input.accounts,
      transactions: input.transactions,
      transfers: input.transfers,
      categories: input.categories,
      budgets: input.budgets,
      budgetTransfers: input.budgetTransfers,
    },
    rates,
    { displayCurrency, statsRateSource, timeRange: input.timeRange }
  )

  const goalSaved = new Map<string, number>()
  for (const gc of input.goalContributions) {
    goalSaved.set(gc.goalId, (goalSaved.get(gc.goalId) ?? 0) + parseSigned(gc.amount))
  }

  const resolvedRates: ResolvedRates = {
    VES: 1,
    USD: bsPerUnit('USD', rates, statsRateSource),
    EUR: bsPerUnit('EUR', rates, statsRateSource),
  }
  const shopping = computeAllListsTotals(
    input.shoppingLists,
    input.shoppingItems,
    resolvedRates,
    displayCurrency
  )

  return {
    currency: displayCurrency,
    accounts: funds.map((f) => ({
      name: accountById.get(f.accountId)?.name ?? 'Cuenta',
      currency: f.currency,
      balance: round2(f.balance),
      available: round2(f.available),
      inGoals: round2(f.inGoals),
    })),
    categories: stats.categorySummary.map((row) => ({
      name: row.name,
      kind: row.kind,
      total: round2(row.total),
    })),
    budgets: stats.budgetStatus.map((row) => ({
      category: row.categoryName,
      limit: round2(row.effectiveLimit),
      spent: round2(row.actual),
      currency: row.budget.currency,
    })),
    goals: input.goals.map((goal) => ({
      name: goal.name,
      saved: round2(goalSaved.get(goal.id) ?? 0),
      target: goal.target ? round2(parseAmount(goal.target)) : null,
      currency: goal.currency,
    })),
    shopping: {
      lists: shopping.rows.map((row) => row.name),
      remaining: shopping.remaining === null ? null : round2(shopping.remaining),
    },
  }
}

/** El prompt de una sola petición que devuelve los dos párrafos. */
export function buildAdvicePrompt(payload: AdvicePayload, now: Date = new Date()): string {
  return [
    'Eres un asesor financiero personal venezolano. Hablas en español de Venezuela, tuteando, claro y concreto.',
    `Hoy es ${monthKey(now)}. Las cifras agregadas están en ${payload.currency} salvo donde se indique otra moneda.`,
    '',
    'Datos del usuario (agregados, sin detalle de movimientos):',
    JSON.stringify(payload),
    '',
    'Devuelve EXACTAMENTE un objeto JSON con dos claves de texto:',
    '- "stats": mira hacia atrás. En qué se le fue el dinero, usando los nombres de sus categorías.',
    '- "budget": mira hacia adelante. Qué conviene ajustar este mes, considerando sus presupuestos, sus metas y lo que le falta por pagar en sus listas de compras.',
    '',
    `Cada texto debe ser un solo párrafo de máximo ${ADVICE_MAX_LENGTH} caracteres.`,
    'No uses markdown, ni listas, ni encabezados. No inventes cifras que no estén en los datos.',
  ].join('\n')
}
