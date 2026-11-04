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
import { ADVICE_MAX_LENGTH, ADVICE_PERIODS } from './advice'
import {
  computeAccountFunds,
  computeStats,
  monthKey,
  parseAmount,
} from './compute'
import { computeAllListsTotals, resolveRates } from './shoppingTotals'
import { inPeriod, sumGoalContributions } from './goalSums'

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
}

export interface AdvicePayload {
  /** Moneda en la que están expresadas todas las cifras agregadas. */
  currency: CurrencyId
  /** Patrimonio neto actual. */
  netWorth: number
  /** Una entrada por cuenta con sus tres cifras. */
  accounts: {
    name: string
    currency: CurrencyId
    balance: number
    available: number
    inGoals: number
  }[]
  /** Avance de cada presupuesto del mes en curso. */
  budgets: { category: string; limit: number; spent: number; currency: CurrencyId }[]
  /**
   * Avance de cada Plan de ahorro. `target` es su Meta y `missing` lo que le falta para
   * alcanzarla (nunca negativo); ambos `null` sin Meta.
   */
  goals: {
    name: string
    saved: number
    target: number | null
    missing: number | null
    currency: CurrencyId
  }[]
  /** Listas de compras: el Restante por pagar de cada una y el **Restante total por pagar**. */
  shopping: { lists: { name: string; remaining: number | null }[]; remaining: number | null }
  /** Lo que mira hacia atrás, en cada período de Estadísticas. */
  periods: Record<TimeRange, AdvicePeriod>
}

/** Un período de Estadísticas: sus totales, sus categorías y lo aportado a cada plan. */
export interface AdvicePeriod {
  income: number
  expense: number
  /** Totales por categoría, con el nombre que el usuario le puso. */
  categories: { name: string; kind: 'income' | 'expense'; total: number }[]
  /** Lo aportado a cada plan en el período, neto de retiros; solo los que se movieron. */
  goals: { name: string; contributed: number; currency: CurrencyId }[]
}

const round2 = (n: number) => Math.round(n * 100) / 100
const round2OrNull = (n: number | null) => (n === null ? null : round2(n))

/** Arma los agregados que viajan al modelo. Nunca incluye transacciones individuales. */
export function buildAdvicePayload(input: AdviceInput, rates: Rates): AdvicePayload {
  const { displayCurrency, statsRateSource } = input

  const funds = computeAccountFunds({
    accounts: input.accounts,
    transactions: input.transactions,
    transfers: input.transfers,
    goalContributions: input.goalContributions,
    goals: input.goals,
  })
  const accountById = new Map(input.accounts.map((a) => [a.id, a]))

  const statsFor = (timeRange: TimeRange) =>
    computeStats(
      {
        accounts: input.accounts,
        transactions: input.transactions,
        transfers: input.transfers,
        categories: input.categories,
        budgets: input.budgets,
        budgetTransfers: input.budgetTransfers,
      },
      rates,
      { displayCurrency, statsRateSource, timeRange }
    )
  const statsByPeriod = new Map(ADVICE_PERIODS.map((period) => [period, statsFor(period)]))
  // El patrimonio y los presupuestos del mes no dependen del período.
  const stats = statsByPeriod.get('all')!

  const savedByGoal = sumGoalContributions(input.goalContributions, inPeriod('all')).saved

  const period = (range: TimeRange): AdvicePeriod => {
    const periodStats = statsByPeriod.get(range)!
    const { contributed } = sumGoalContributions(input.goalContributions, inPeriod(range))
    return {
      income: round2(periodStats.incomeVsExpense.income),
      expense: round2(periodStats.incomeVsExpense.expense),
      categories: periodStats.categorySummary.map((row) => ({
        name: row.name,
        kind: row.kind,
        total: round2(row.total),
      })),
      goals: input.goals.flatMap((goal) => {
        const amount = round2(contributed.get(goal.id) ?? 0)
        return amount === 0 ? [] : [{ name: goal.name, contributed: amount, currency: goal.currency }]
      }),
    }
  }

  const resolvedRates = resolveRates(rates, statsRateSource)
  const shopping = computeAllListsTotals(
    input.shoppingLists,
    input.shoppingItems,
    resolvedRates,
    displayCurrency
  )

  return {
    currency: displayCurrency,
    netWorth: round2(stats.netWorth),
    accounts: funds.map((f) => ({
      name: accountById.get(f.accountId)?.name ?? 'Cuenta',
      currency: f.currency,
      balance: round2(f.balance),
      available: round2(f.available),
      inGoals: round2(f.inGoals),
    })),
    budgets: stats.budgetStatus.map((row) => ({
      category: row.categoryName,
      limit: round2(row.effectiveLimit),
      spent: round2(row.actual),
      currency: row.budget.currency,
    })),
    goals: input.goals.map((goal) => {
      const saved = savedByGoal.get(goal.id) ?? 0
      const target = goal.target ? parseAmount(goal.target) : null
      return {
        name: goal.name,
        saved: round2(saved),
        target: target === null ? null : round2(target),
        missing: target === null ? null : round2(Math.max(target - saved, 0)),
        currency: goal.currency,
      }
    }),
    shopping: {
      lists: shopping.rows.map((row) => ({ name: row.name, remaining: round2OrNull(row.remaining) })),
      remaining: round2OrNull(shopping.remaining),
    },
    periods: Object.fromEntries(ADVICE_PERIODS.map((range) => [range, period(range)])) as Record<
      TimeRange,
      AdvicePeriod
    >,
  }
}

/** El prompt de una sola petición que devuelve los consejos de Estadísticas por período y el de Presupuestos. */
export function buildAdvicePrompt(payload: AdvicePayload, now: Date = new Date()): string {
  return [
    'Eres un asesor financiero personal venezolano, cercano y claro. Hablas en español de Venezuela, tuteando, concreto y sin formalidades.',
    'Usa a lo sumo un modismo venezolano por consejo (por ejemplo "chamo", "pana" o "real"), y solo si sale natural; el resto, español claro y sin jerga recargada.',
    `Hoy es ${monthKey(now)}. Las cifras agregadas están en ${payload.currency} salvo donde se indique otra moneda.`,
    '',
    'Datos del usuario (agregados, sin detalle de movimientos):',
    JSON.stringify(payload),
    '',
    'Devuelve EXACTAMENTE un objeto JSON con dos claves:',
    '- "stats": un objeto con cuatro textos que miran hacia atrás, uno por período, con las claves "1m" (el último mes), "6m" (los últimos 6 meses), "1y" (el último año) y "all" (desde siempre). Cada uno usa solo los datos de su período en "periods": sus ingresos y gastos totales ("income", "expense"), sus categorías más grandes y lo que aportó a sus planes de ahorro en ese período, neto de retiros ("goals" del período). Además comenta su patrimonio ("netWorth"), cuánto le falta a cada plan con Meta para alcanzarla (en "goals", "missing") y cuánto compromete lo que le falta por pagar en sus listas de compras (en "shopping"), y recomienda a dónde asignar el dinero. Los cuatro textos deben ser distintos entre sí: cada uno habla de lo que pasó en su período. Puedes destacar los planes o listas que más pesen, sin enumerar todo uno por uno. No enumeres los gastos menores uno por uno.',
    '- "budget": mira hacia adelante. Qué conviene ajustar este mes, considerando sus presupuestos, sus planes de ahorro (en "goals"; "target" es la Meta del plan, opcional) y lo que le falta por pagar en sus listas de compras.',
    '',
    `Cada texto debe ser un solo párrafo de máximo ${ADVICE_MAX_LENGTH} caracteres.`,
    'No uses markdown, ni listas, ni encabezados. No inventes cifras que no estén en los datos.',
    '',
    'Reglas para los números:',
    `- Siempre que menciones una cifra de dinero, di a qué moneda se refiere, con su nombre: bolívares, dólares o euros (por ejemplo "150 dólares" o "2.000 bolívares"). Usa la moneda de los datos: ${payload.currency} salvo donde el dato traiga su propia "currency". Nunca dejes una cifra de dinero suelta, sin moneda.`,
    '- Siempre que menciones un porcentaje, escríbelo con su símbolo "%" pegado al número (por ejemplo "25%"). Nunca "25 por ciento" ni un porcentaje sin el símbolo.',
  ].join('\n')
}
