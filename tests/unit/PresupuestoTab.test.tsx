import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PresupuestoTab } from '@/components/billetera/PresupuestoTab'
import { formatMoney } from '@/components/billetera/format'
import type { Budget, BudgetStatusRow, StatsBundle, WalletApi } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

// Los diálogos hijos no son lo que se prueba aquí: se reemplazan por nada.
vi.mock('@/hooks/useAdvice', () => ({ useAdvice: () => ({ advice: { budget: '' }, loaded: true }) }))
vi.mock('@/components/billetera/AdviceCard', () => ({ AdviceCard: () => null }))
vi.mock('@/components/billetera/ConcludeMonthDialog', () => ({ ConcludeMonthDialog: () => null }))
vi.mock('@/components/billetera/BudgetTemplatesDialog', () => ({ BudgetTemplatesDialog: () => null }))
vi.mock('@/components/billetera/GoalFormDialog', () => ({ GoalFormDialog: () => null }))
vi.mock('@/components/billetera/GoalContributionDialog', () => ({ GoalContributionDialog: () => null }))
vi.mock('@/components/billetera/ShoppingSummaryButton', () => ({ ShoppingSummaryButton: () => null }))
vi.mock('@/components/billetera/ShoppingListFormDialog', () => ({ ShoppingListFormDialog: () => null }))
vi.mock('@/components/billetera/ShoppingListDetailDialog', () => ({ ShoppingListDetailDialog: () => null }))
vi.mock('@/components/billetera/ShoppingItemFormDialog', () => ({ ShoppingItemFormDialog: () => null }))
vi.mock('@/components/billetera/ShoppingItemDetailDialog', () => ({ ShoppingItemDetailDialog: () => null }))
vi.mock('@/components/billetera/ConfirmPurchaseDialog', () => ({ ConfirmPurchaseDialog: () => null }))

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }

const row = (id: string, name: string, limit: number, actual: number): BudgetStatusRow => ({
  budget: {
    id,
    templateId: 'tpl_default',
    categoryId: id,
    month: '2026-09',
    limit: String(limit),
    currency: 'VES',
  } as Budget,
  categoryName: name,
  categoryIcon: 'food',
  actual,
  limit,
  carryover: 0,
  effectiveLimit: limit,
  ratio: limit > 0 ? actual / limit : 0,
  isOver: false,
})

function renderTab(rows: BudgetStatusRow[], budgets: Partial<Budget>[] = []) {
  const wallet = {
    state: {
      shoppingLists: [],
      shoppingItems: [],
      activeBudgetTemplateId: 'tpl_default',
      budgetTemplates: [],
      displayCurrency: 'VES',
      statsRateSource: 'bcvUsd',
      categories: [{ id: 'c', name: 'Otra', kind: 'expense', icon: 'other' }],
      goals: [],
      concludedMonths: [],
      budgets,
    },
    removeBudget: vi.fn(),
    goalBalances: [],
    removeGoal: vi.fn(),
    removeShoppingList: vi.fn(),
  } as unknown as WalletApi
  const stats = { budgetStatus: rows, ratesAvailable: true } as unknown as StatsBundle
  const dialogs = { openBudget: vi.fn() } as never
  render(<PresupuestoTab wallet={wallet} stats={stats} dialogs={dialogs} rates={RATES} />)
}

describe('PresupuestoTab — resumen de todos los presupuestos', () => {
  it('con un solo presupuesto no aparece', () => {
    renderTab([row('a', 'Comida', 100, 20)])

    expect(screen.queryByText('Todos los presupuestos')).not.toBeInTheDocument()
    expect(screen.getByText('Comida')).toBeInTheDocument()
  })

  const follows = (a: Element, b: Element) =>
    !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('con dos o más aparece justo debajo de los botones y antes de las tarjetas', () => {
    renderTab([row('a', 'Comida', 100, 20), row('b', 'Transporte', 50, 10)])

    const summaryCard = screen
      .getByText('Todos los presupuestos')
      .closest('[data-slot="card"]') as HTMLElement
    expect(screen.getByText('2 presupuestos')).toBeInTheDocument()

    // Debajo de los botones «Plantillas» y «Asignar presupuesto»…
    expect(follows(screen.getByRole('button', { name: /Plantillas/ }), summaryCard)).toBe(true)
    expect(follows(screen.getByRole('button', { name: /Asignar presupuesto/ }), summaryCard)).toBe(true)
    // …y antes que la tarjeta de cualquier presupuesto.
    const comida = screen.getByText('Comida').closest('[data-slot="card"]') as HTMLElement
    expect(follows(summaryCard, comida)).toBe(true)
    // A todo el ancho (el de dos tarjetas): no dentro de la cuadrícula de una columna por tarjeta.
    expect(summaryCard.closest('.grid')).toBeNull()
  })

  it('va antes del aviso de mes por concluir', () => {
    renderTab(
      [row('a', 'Comida', 100, 20), row('b', 'Transporte', 50, 10)],
      [{ templateId: 'tpl_default', month: '2026-05' }]
    )

    const summaryCard = screen
      .getByText('Todos los presupuestos')
      .closest('[data-slot="card"]') as HTMLElement
    const banner = screen.getByText(/sin concluir/)
    expect(follows(summaryCard, banner)).toBe(true)
  })
})

describe('PresupuestoTab — presupuesto con límite 0', () => {
  const card = (name: string) => screen.getByText(name).closest('[data-slot="card"]') as HTMLElement

  it('con gasto muestra la barra roja completa y cuánto se superó, sin «Cerca del límite»', () => {
    renderTab([{ ...row('a', 'Ocio', 0, 25), ratio: Infinity, isOver: true }])

    const ocio = card('Ocio')
    const bar = ocio.querySelector('.bg-destructive') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.width).toBe('100%')
    expect(ocio).toHaveTextContent(`Superaste el presupuesto en ${formatMoney(25, 'VES')}`)
    expect(ocio).not.toHaveTextContent(/Cerca del límite/)
    expect(ocio).not.toHaveTextContent(/Infinity/)
  })

  it('sin gasto no muestra ningún mensaje', () => {
    renderTab([row('a', 'Ocio', 0, 0)])

    const ocio = card('Ocio')
    expect(ocio).not.toHaveTextContent(/Superaste/)
    expect(ocio).not.toHaveTextContent(/Cerca del límite/)
    expect(ocio.querySelector('.bg-destructive')).toBeNull()
  })
})
