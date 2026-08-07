/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWallet, convertTransferAmount, DEFAULT_BUDGET_TEMPLATE_ID } from '@/hooks/useWallet'
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
  'budgetTemplates',
  'budgetTransfers',
  'goalContributions',
  'shoppingLists',
  'shoppingItems',
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
    store.activeBudgetTemplateId = delta.prefs.activeBudgetTemplateId
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

    act(() => result.current.addAccount('Bs', 'VES', '1000'))
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

    act(() => result.current.addAccount('Efectivo', 'VES', '1000'))
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

    act(() => result.current.addAccount('Efectivo', 'VES', '1000'))
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

describe('useWallet — listas de compras', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.store = {}
    vi.clearAllMocks()
  })

  it('CRUD de listas y productos', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addShoppingList('Mercado', 'shopping', 'var(--wallet-green)'))
    expect(result.current.state.shoppingLists).toHaveLength(1)
    const listId = result.current.state.shoppingLists[0].id

    act(() => result.current.updateShoppingList(listId, { name: 'Mercado del mes' }))
    expect(result.current.state.shoppingLists[0].name).toBe('Mercado del mes')

    act(() =>
      result.current.addShoppingItem({ listId, title: 'Arroz', price: '3', currency: 'USD' })
    )
    expect(result.current.state.shoppingItems).toHaveLength(1)
    const item = result.current.state.shoppingItems[0]
    expect(item.currency).toBe('USD')
    expect(item.purchased).toBe(false)

    act(() => result.current.updateShoppingItem(item.id, { price: '4' }))
    expect(result.current.state.shoppingItems[0].price).toBe('4')

    act(() => result.current.removeShoppingItem(item.id))
    expect(result.current.state.shoppingItems).toHaveLength(0)
  })

  it('confirmar compra (misma moneda) crea un gasto en Compras y debita la cuenta', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id
    act(() => result.current.addShoppingList('Bodega'))
    const listId = result.current.state.shoppingLists[0].id
    act(() =>
      result.current.addShoppingItem({ listId, title: 'Pan', price: '30', currency: 'VES' })
    )
    const itemId = result.current.state.shoppingItems[0].id

    // Costo editado a 25 (distinto del precio inicial 30)
    act(() =>
      result.current.confirmPurchase({
        itemId,
        accountId: accId,
        cost: '25',
        rateSource: 'custom',
        rateValue: 0,
        date: today,
      })
    )

    const item = result.current.state.shoppingItems[0]
    expect(item.purchased).toBe(true)
    expect(item.purchase?.accountId).toBe(accId)
    expect(item.purchase?.transactionId).toBeTruthy()

    const tx = result.current.state.transactions.find((t) => t.id === item.purchase?.transactionId)
    expect(tx?.type).toBe('expense')
    expect(tx?.categoryId).toBe('cat_shopping')
    expect(parseFloat(tx?.amount ?? '0')).toBe(25)

    const balance = result.current.accountBalances.find((b) => b.accountId === accId)
    expect(balance?.balance).toBe(75) // 100 - 25
  })

  it('confirmar compra con conversión debita el monto convertido a la moneda de la cuenta', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Bs', 'VES', '1000'))
    const accId = result.current.state.accounts[0].id
    act(() => result.current.addShoppingList('Compras'))
    const listId = result.current.state.shoppingLists[0].id
    act(() =>
      result.current.addShoppingItem({ listId, title: 'Cable', price: '2', currency: 'USD' })
    )
    const itemId = result.current.state.shoppingItems[0].id

    // Producto en USD, cuenta en VES, tasa personalizada 40 Bs/USD → 80 Bs
    act(() =>
      result.current.confirmPurchase({
        itemId,
        accountId: accId,
        cost: '2',
        rateSource: 'custom',
        rateValue: 40,
        date: today,
      })
    )

    const item = result.current.state.shoppingItems[0]
    const tx = result.current.state.transactions.find((t) => t.id === item.purchase?.transactionId)
    expect(parseFloat(tx?.amount ?? '0')).toBe(80)
    expect(item.purchase?.rate?.value).toBe('40')

    const balance = result.current.accountBalances.find((b) => b.accountId === accId)
    expect(balance?.balance).toBe(920) // 1000 - 80
  })

  it('deshacer compra elimina la transacción y desmarca el producto', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id
    act(() => result.current.addShoppingList('L'))
    const listId = result.current.state.shoppingLists[0].id
    act(() =>
      result.current.addShoppingItem({ listId, title: 'X', price: '30', currency: 'VES' })
    )
    const itemId = result.current.state.shoppingItems[0].id

    act(() =>
      result.current.confirmPurchase({
        itemId,
        accountId: accId,
        cost: '30',
        rateSource: 'custom',
        rateValue: 0,
        date: today,
      })
    )
    expect(result.current.state.transactions).toHaveLength(1)

    act(() => result.current.undoPurchase(itemId))
    expect(result.current.state.transactions).toHaveLength(0)
    expect(result.current.state.shoppingItems[0].purchased).toBe(false)
    expect(result.current.state.shoppingItems[0].purchase).toBeUndefined()
    expect(result.current.accountBalances.find((b) => b.accountId === accId)?.balance).toBe(100)
  })

  it('eliminar una lista borra sus productos y las transacciones de sus compras', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id
    act(() => result.current.addShoppingList('L'))
    const listId = result.current.state.shoppingLists[0].id
    act(() =>
      result.current.addShoppingItem({ listId, title: 'X', price: '20', currency: 'VES' })
    )
    const itemId = result.current.state.shoppingItems[0].id
    act(() =>
      result.current.confirmPurchase({
        itemId,
        accountId: accId,
        cost: '20',
        rateSource: 'custom',
        rateValue: 0,
        date: today,
      })
    )
    expect(result.current.state.transactions).toHaveLength(1)

    act(() => result.current.removeShoppingList(listId))
    expect(result.current.state.shoppingLists).toHaveLength(0)
    expect(result.current.state.shoppingItems).toHaveLength(0)
    expect(result.current.state.transactions).toHaveLength(0)
    expect(result.current.accountBalances.find((b) => b.accountId === accId)?.balance).toBe(100)
  })

  it('persiste listas y productos en la nube y los rehidrata', async () => {
    const { result, unmount } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addShoppingList('Ferretería', 'home'))
    await waitFor(() => {
      const lists = (cloud.store.shoppingLists as { name: string }[] | undefined) ?? []
      expect(lists.some((l) => l.name === 'Ferretería')).toBe(true)
    })
    const listId = result.current.state.shoppingLists[0].id
    act(() =>
      result.current.addShoppingItem({ listId, title: 'Tornillos', price: '5', currency: 'USD' })
    )
    await waitFor(() => {
      const items = (cloud.store.shoppingItems as { title: string }[] | undefined) ?? []
      expect(items.some((it) => it.title === 'Tornillos')).toBe(true)
    })
    unmount()

    const { result: result2 } = renderHook(() => useWallet())
    await waitFor(() => expect(result2.current.isMounted).toBe(true))
    expect(result2.current.state.shoppingLists[0]?.name).toBe('Ferretería')
    expect(result2.current.state.shoppingItems[0]?.title).toBe('Tornillos')
  })
})

describe('useWallet — saldo nunca negativo', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.store = {}
    vi.clearAllMocks()
  })

  it('rechaza un gasto que supera el saldo de la cuenta', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id

    let ok = true
    act(() => {
      ok = result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '150',
        date: today,
      })
    })
    expect(ok).toBe(false)
    expect(result.current.state.transactions).toHaveLength(0)
    expect(result.current.accountBalances.find((b) => b.accountId === accId)?.balance).toBe(100)
  })

  it('permite el gasto exacto y bloquea el que deja saldo negativo por comisión', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('Efectivo', 'VES', '100'))
    const accId = result.current.state.accounts[0].id

    let ok = false
    act(() => {
      ok = result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '100',
        date: today,
      })
    })
    expect(ok).toBe(true)
    expect(result.current.accountBalances.find((b) => b.accountId === accId)?.balance).toBe(0)

    // Con saldo 0, cualquier gasto adicional se rechaza.
    let ok2 = true
    act(() => {
      ok2 = result.current.addTransaction({
        type: 'expense',
        accountId: accId,
        categoryId: 'cat_food',
        amount: '1',
        date: today,
      })
    })
    expect(ok2).toBe(false)
  })

  it('rechaza un traspaso que deja la cuenta origen en negativo', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.addAccount('A', 'VES', '50'))
    act(() => result.current.addAccount('B', 'VES', '0'))
    const [a, b] = result.current.state.accounts.map((acc) => acc.id)

    let ok = true
    act(() => {
      ok = result.current.addTransfer({
        fromAccountId: a,
        toAccountId: b,
        fromAmount: '80',
        toAmount: '80',
        rateSource: 'custom',
        rateValue: 0,
        date: today,
      })
    })
    expect(ok).toBe(false)
    expect(result.current.state.transfers).toHaveLength(0)
    expect(result.current.accountBalances.find((x) => x.accountId === a)?.balance).toBe(50)
  })
})

describe('useWallet — plantillas de presupuesto', () => {
  beforeEach(() => {
    localStorage.clear()
    cloud.store = {}
    vi.clearAllMocks()
  })

  it('siembra la plantilla por defecto y la deja activa', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    expect(result.current.state.activeBudgetTemplateId).toBe(DEFAULT_BUDGET_TEMPLATE_ID)
    expect(
      result.current.state.budgetTemplates.some((t) => t.id === DEFAULT_BUDGET_TEMPLATE_ID)
    ).toBe(true)
  })

  it('la misma categoría puede tener presupuesto en varias plantillas (uno por plantilla)', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    const month = new Date().toISOString().slice(0, 7)

    let tplId = ''
    act(() => {
      tplId = result.current.addBudgetTemplate({ name: 'Viaje' })
    })
    act(() => result.current.setBudget('cat_food', month, '100', 'VES'))
    act(() => result.current.setBudget('cat_food', month, '250', 'VES', '0', tplId))

    const foodBudgets = result.current.state.budgets.filter(
      (b) => b.categoryId === 'cat_food' && b.month === month
    )
    expect(foodBudgets).toHaveLength(2)

    act(() => result.current.setBudget('cat_food', month, '120', 'VES'))
    const again = result.current.state.budgets.filter(
      (b) => b.categoryId === 'cat_food' && b.month === month
    )
    expect(again).toHaveLength(2)
    expect(again.find((b) => b.templateId === DEFAULT_BUDGET_TEMPLATE_ID)?.limit).toBe('120')
    expect(again.find((b) => b.templateId === tplId)?.limit).toBe('250')
  })

  it('applyBudgetTemplate cambia la activa, suma el extra migrado y registra el traspaso', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    const month = new Date().toISOString().slice(0, 7)

    let tplId = ''
    act(() => {
      tplId = result.current.addBudgetTemplate({ name: 'Plan B' })
    })
    act(() => result.current.setBudget('cat_food', month, '100', 'VES', '0', tplId))

    act(() =>
      result.current.applyBudgetTemplate(tplId, month, [
        {
          fromCategoryId: 'cat_transport',
          toCategoryId: 'cat_food',
          extra: 30,
          spent: 10,
          currency: 'VES',
        },
      ])
    )
    expect(result.current.state.activeBudgetTemplateId).toBe(tplId)
    const b = result.current.state.budgets.find(
      (x) => x.templateId === tplId && x.categoryId === 'cat_food' && x.month === month
    )
    expect(parseFloat(b?.carryover ?? '0')).toBe(30)

    const bt = result.current.state.budgetTransfers.find(
      (t) => t.toTemplateId === tplId && t.toCategoryId === 'cat_food'
    )
    expect(bt).toBeDefined()
    expect(bt?.fromTemplateId).toBe(DEFAULT_BUDGET_TEMPLATE_ID)
    expect(bt?.fromCategoryId).toBe('cat_transport')
    expect(bt?.extra).toBe('30')
    expect(bt?.spent).toBe('10')
    expect(bt?.month).toBe(month)

    const rows = result.current.budgetStatusForMonth(RATES, month)
    const food = rows.find((r) => r.budget.categoryId === 'cat_food')
    expect(food?.actual).toBe(10)
    expect(food?.effectiveLimit).toBe(130)
  })

  it('eliminar una plantilla borra sus presupuestos y vuelve a la predeterminada', async () => {
    const { result } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    const month = new Date().toISOString().slice(0, 7)

    let tplId = ''
    act(() => {
      tplId = result.current.addBudgetTemplate({ name: 'Temporal' })
    })
    act(() => result.current.setBudget('cat_food', month, '80', 'VES', '0', tplId))
    act(() => result.current.applyBudgetTemplate(tplId, month, []))
    expect(result.current.state.activeBudgetTemplateId).toBe(tplId)

    act(() => result.current.removeBudgetTemplate(tplId))
    expect(result.current.state.budgetTemplates.some((t) => t.id === tplId)).toBe(false)
    expect(result.current.state.budgets.some((b) => b.templateId === tplId)).toBe(false)
    expect(result.current.state.activeBudgetTemplateId).toBe(DEFAULT_BUDGET_TEMPLATE_ID)
  })

  it('persiste plantillas en la nube y las rehidrata', async () => {
    const { result, unmount } = renderHook(() => useWallet())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    let tplId = ''
    act(() => {
      tplId = result.current.addBudgetTemplate({
        name: 'Ahorro',
        description: 'sobrio',
        icon: 'savings',
      })
    })
    await waitFor(() => {
      const tpls = (cloud.store.budgetTemplates as { name: string }[] | undefined) ?? []
      expect(tpls.some((t) => t.name === 'Ahorro')).toBe(true)
    })
    unmount()

    const { result: result2 } = renderHook(() => useWallet())
    await waitFor(() => expect(result2.current.isMounted).toBe(true))
    expect(result2.current.state.budgetTemplates.some((t) => t.id === tplId)).toBe(true)
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
