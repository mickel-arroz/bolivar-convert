/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWallet, convertTransferAmount } from '@/hooks/useWallet'
import { Rates } from '@/constants/rates'

// "Nube" simulada: el hook llama a /api/wallet/state (GET) y /api/wallet/sync (POST).
// Mockeamos fetch para probar la persistencia sin red ni Supabase real.
const cloud = vi.hoisted(() => ({ store: {} as Record<string, any> }))

const ENTITY_KEYS = [
  'accounts',
  'categories',
  'goals',
  'transactions',
  'transfers',
  'budgets',
  'goalContributions',
] as const

// Réplica mínima de applyWalletDelta (servidor) sobre el store en memoria.
function applyDeltaToStore(store: Record<string, any>, delta: any) {
  for (const key of ENTITY_KEYS) {
    const byId = new Map<string, any>((store[key] ?? []).map((x: any) => [x.id, x]))
    for (const up of delta.upserts[key]) byId.set(up.id, up)
    for (const id of delta.deletes[key]) byId.delete(id)
    store[key] = Array.from(byId.values())
  }
  if (delta.prefs) {
    store.displayCurrency = delta.prefs.displayCurrency
    store.statsRateSource = delta.prefs.statsRateSource
    store.timeRange = delta.prefs.timeRange
    store.concludedMonths = delta.prefs.concludedMonths
  }
}

vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string, opts?: { body?: string }) => {
    if (url.startsWith('/api/wallet/state')) {
      return { ok: true, status: 200, json: async () => cloud.store } as Response
    }
    if (url.startsWith('/api/wallet/sync')) {
      applyDeltaToStore(cloud.store, JSON.parse(opts?.body ?? '{}'))
      return { ok: true, status: 200, json: async () => ({ ok: true }) } as Response
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response
  })
)

const RATES: Rates = {
  bcvUsd: '40',
  bcvEur: '45',
  binanceUsdAvg: '42',
  lastUpdate: '2026-06-25',
}

// Fecha dentro del mes actual (para presupuestos y rango por defecto)
const today = new Date().toISOString().slice(0, 10)

describe('useWallet Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.store = {}
    vi.clearAllMocks()
  })

  it('siembra categorías por defecto y arranca sin cuentas', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    expect(result.current.state.accounts).toHaveLength(0)
    expect(result.current.state.categories.length).toBeGreaterThan(0)
    expect(result.current.hasData).toBe(false)
  })

  it('calcula el balance de una cuenta: saldo inicial + ingresos - gastos', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id

    act(() =>
      result.current.addTransaction({
        type: 'income',
        accountId: accId,
        categoryId: 'cat_salary',
        amount: '50',
        date: today,
      })
    )
    act(() =>
      result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '30',
        date: today,
      })
    )

    const balance = result.current.accountBalances.find((b) => b.accountId === accId)
    expect(balance?.balance).toBe(120) // 100 + 50 - 30
  })

  it('el traspaso afecta ambas cuentas y se excluye de las estadísticas', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('A', 'VES', '100'))
    act(() => result.current.addAccount('B', 'VES', '0'))
    const [a, b] = result.current.state.accounts.map((acc) => acc.id)

    act(() =>
      result.current.addTransfer({
        fromAccountId: a,
        toAccountId: b,
        fromAmount: '40',
        toAmount: '40',
        rateSource: 'custom',
        rateValue: 0,
        date: today,
      })
    )

    const balA = result.current.accountBalances.find((x) => x.accountId === a)?.balance
    const balB = result.current.accountBalances.find((x) => x.accountId === b)?.balance
    expect(balA).toBe(60)
    expect(balB).toBe(40)

    // Los traspasos no cuentan como ingreso ni gasto
    const stats = result.current.computeStats(RATES)
    expect(stats.incomeVsExpense.income).toBe(0)
    expect(stats.incomeVsExpense.expense).toBe(0)
  })

  it('convierte el monto en traspasos entre monedas distintas', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Bs', 'VES', '0'))
    act(() => result.current.addAccount('USD', 'USD', '0'))
    const [ves, usd] = result.current.state.accounts.map((acc) => acc.id)

    // 40 Bs a USD con tasa 40 Bs/USD → 1 USD
    act(() =>
      result.current.addTransfer({
        fromAccountId: ves,
        toAccountId: usd,
        fromAmount: '40',
        toAmount: '1',
        rateSource: 'bcvUsd',
        rateValue: 40,
        date: today,
      })
    )

    const transfer = result.current.state.transfers[0]
    expect(parseFloat(transfer.toAmount)).toBe(1)
    expect(transfer.rate?.value).toBe('40')
  })

  it('detecta cuando el gasto supera el presupuesto del mes', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '0'))
    const accId = result.current.state.accounts[0].id

    act(() => result.current.setBudget('cat_food', new Date().toISOString().slice(0, 7), '100', 'VES'))
    act(() =>
      result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '150',
        date: today,
      })
    )

    const stats = result.current.computeStats(RATES)
    const row = stats.budgetStatus.find((r) => r.budget.categoryId === 'cat_food')
    expect(row?.actual).toBe(150)
    expect(row?.isOver).toBe(true)
  })

  it('concluir mes: arrastra el sobrante (con signo) y marca el mes como concluido', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '0'))
    const accId = result.current.state.accounts[0].id

    const prevMonth = '2026-05'
    const curMonth = new Date().toISOString().slice(0, 7)

    // Presupuesto del mes anterior: estimado 100, gastado 10 → sobrante +90
    act(() => result.current.setBudget('cat_food', prevMonth, '100', 'VES'))
    act(() =>
      result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '10',
        date: `${prevMonth}-15`,
      })
    )

    // El sobrante se calcula como en la UI y se concluye
    const rows = result.current.budgetStatusForMonth(RATES, prevMonth)
    const carryovers: Record<string, number> = {}
    rows.forEach((r) => (carryovers[r.budget.categoryId] = r.effectiveLimit - r.actual))
    expect(carryovers['cat_food']).toBe(90)

    act(() => result.current.concludeBudgetMonth(prevMonth, curMonth, carryovers))

    expect(result.current.state.concludedMonths).toContain(prevMonth)
    const newBudget = result.current.state.budgets.find(
      (b) => b.categoryId === 'cat_food' && b.month === curMonth
    )
    expect(newBudget?.limit).toBe('100') // estimado se mantiene
    expect(parseFloat(newBudget?.carryover ?? '0')).toBe(90) // extra arrastrado

    // Disponible efectivo del mes nuevo = 100 + 90 = 190
    const curRows = result.current.budgetStatusForMonth(RATES, curMonth)
    const curRow = curRows.find((r) => r.budget.categoryId === 'cat_food')
    expect(curRow?.effectiveLimit).toBe(190)
  })

  it('editar el estimado preserva el extra arrastrado', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    const month = new Date().toISOString().slice(0, 7)

    // Inyectar un carryover en el mes actual concluyendo un mes previo
    act(() => result.current.setBudget('cat_food', '2026-04', '50', 'VES'))
    act(() => result.current.concludeBudgetMonth('2026-04', month, { cat_food: 30 }))

    const before = result.current.state.budgets.find((b) => b.categoryId === 'cat_food' && b.month === month)
    expect(parseFloat(before?.carryover ?? '0')).toBe(30)

    // Editar el estimado a 200 no debe borrar el extra
    act(() => result.current.setBudget('cat_food', month, '200', 'VES'))
    const after = result.current.state.budgets.find((b) => b.categoryId === 'cat_food' && b.month === month)
    expect(after?.limit).toBe('200')
    expect(parseFloat(after?.carryover ?? '0')).toBe(30)
  })

  it('persiste el estado en la nube y lo rehidrata', async () => {
    const { result, unmount } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    act(() => result.current.addAccount('Banco', 'USD', '500'))

    // Esperar a que la sincronización por diff escriba en la "nube" simulada.
    await waitFor(() => {
      const accounts = (cloud.store.accounts as { name: string }[] | undefined) ?? []
      expect(accounts.some((a) => a.name === 'Banco')).toBe(true)
    })
    unmount()

    const { result: result2 } = renderHook(() => useWallet())
    await waitFor(() => expect(result2.current.isMounted).toBe(true))
    expect(result2.current.state.accounts[0]?.name).toBe('Banco')
  })
})

describe('convertTransferAmount', () => {
  it('misma moneda: idéntico', () => {
    expect(convertTransferAmount(100, 'VES', 'VES', 0)).toBe(100)
  })
  it('VES → divisa: divide por la tasa', () => {
    expect(convertTransferAmount(40, 'VES', 'USD', 40)).toBe(1)
  })
  it('divisa → VES: multiplica por la tasa', () => {
    expect(convertTransferAmount(1, 'USD', 'VES', 40)).toBe(40)
  })
  it('divisa → divisa: multiplica (destino por unidad origen)', () => {
    expect(convertTransferAmount(10, 'USD', 'EUR', 0.9)).toBe(9)
  })
})
