import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConcludeMonthDialog } from '@/components/billetera/ConcludeMonthDialog'
import { DEFAULT_CATEGORIES } from '@/constants/walletCategories'
import type { Budget, BudgetStatusRow, WalletApi } from '@/hooks/useWallet'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }

const row = (categoryId: string, name: string, effectiveLimit: number, actual: number): BudgetStatusRow =>
  ({
    budget: { id: categoryId, templateId: 'tpl_default', categoryId, month: '2026-09', limit: '0', currency: 'VES' } as Budget,
    categoryName: name,
    categoryIcon: 'food',
    actual,
    limit: effectiveLimit,
    carryover: 0,
    effectiveLimit,
    ratio: 0,
    isOver: false,
  }) as BudgetStatusRow

function renderDialog(rows: BudgetStatusRow[]) {
  const concludeBudgetMonth = vi.fn()
  const wallet = {
    state: {
      categories: DEFAULT_CATEGORIES,
      goals: [],
      budgets: rows.map((r) => r.budget),
      activeBudgetTemplateId: 'tpl_default',
    },
    budgetStatusForMonth: () => rows,
    concludeBudgetMonth,
  } as unknown as WalletApi
  render(
    <ConcludeMonthDialog
      open
      onOpenChange={vi.fn()}
      wallet={wallet}
      rates={RATES}
      fromMonth="2026-09"
      toMonth="2026-10"
    />
  )
  return concludeBudgetMonth
}

const tramo = (name: string, n: number) => screen.getByLabelText(`Destino ${n} de ${name}`)
const editar = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Cambiar reparto de ${name}` }))
const concluir = () => screen.getByRole('button', { name: 'Concluir mes' })

/** Elige un destino del selector n-ésimo; el Select de base-ui elige con eventos de puntero. */
async function elegirDestino(n: number, name: RegExp) {
  fireEvent.click(screen.getAllByRole('combobox')[n])
  const option = await screen.findByRole('option', { name })
  fireEvent.pointerDown(option, { pointerType: 'mouse' })
  fireEvent.pointerUp(option, { pointerType: 'mouse' })
  fireEvent.mouseUp(option)
  fireEvent.click(option)
}

describe('ConcludeMonthDialog — reparto del cierre', () => {
  it('por defecto muestra el arrastre sin editor y agrupa las categorías en cero', () => {
    renderDialog([row('cat_food', 'Comida', 100, 10), row('cat_transport', 'Transporte', 50, 50)])

    expect(screen.getByText(/Arrastrar a/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Destino 1 de Comida')).not.toBeInTheDocument()
    expect(screen.getByText('Sin sobrante ni déficit:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cambiar reparto de Transporte' })).not.toBeInTheDocument()
    expect(concluir()).toBeEnabled()
  })

  it('el déficit arrastrado se descuenta del estimado del mes nuevo', () => {
    renderDialog([row('cat_transport', 'Transporte', 50, 80)])

    expect(screen.getByText('Disponible').nextElementSibling).toHaveTextContent('Bs. 20,00')
    expect(screen.getByText('Arranca con Bs. 30,00 ya utilizado por el déficit.')).toBeInTheDocument()
  })

  it('sin tocar nada arrastra todo el sobrante a la misma categoría', () => {
    const conclude = renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    expect(tramo('Comida', 1)).toHaveValue('100')
    fireEvent.click(concluir())

    expect(conclude).toHaveBeenCalledWith('2026-09', '2026-10', [
      { fromCategoryId: 'cat_food', destination: { kind: 'category', categoryId: 'cat_food' }, amount: 90 },
    ])
  })

  it('un reparto incompleto avisa cuánto falta y no deja concluir', () => {
    renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    fireEvent.change(tramo('Comida', 1), { target: { value: '60' } })

    expect(screen.getByText(/Falta asignar 40 %/)).toBeInTheDocument()
    expect(concluir()).toBeDisabled()
  })

  it('un tramo nuevo arranca con lo que falta asignar y se reparte por porcentaje', () => {
    const conclude = renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    fireEvent.change(tramo('Comida', 1), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))

    expect(tramo('Comida', 2)).toHaveValue('40')
    expect(concluir()).toBeEnabled()
    fireEvent.click(concluir())

    const allocations = conclude.mock.calls[0][2]
    expect(allocations.map((a: { amount: number }) => a.amount)).toEqual([54, 36])
  })

  it('en modo monto los tramos se escriben en la moneda del presupuesto', () => {
    const conclude = renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    fireEvent.click(screen.getByRole('button', { name: 'Monto' }))
    expect(tramo('Comida', 1)).toHaveValue('90')

    fireEvent.change(tramo('Comida', 1), { target: { value: '50' } })
    expect(screen.getByText(/Falta asignar/)).toHaveTextContent('40,00')

    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))
    fireEvent.click(concluir())
    expect(conclude.mock.calls[0][2].map((a: { amount: number }) => a.amount)).toEqual([50, 40])
  })

  it('un déficit se reparte con signo negativo', () => {
    const conclude = renderDialog([row('cat_food', 'Comida', 50, 80)])

    fireEvent.click(concluir())

    expect(conclude.mock.calls[0][2][0].amount).toBe(-30)
  })

  it('cambiar de % a monto mantiene el reparto cuadrado', () => {
    renderDialog([row('cat_food', 'Comida', 10, 0)])
    editar('Comida')

    fireEvent.change(tramo('Comida', 1), { target: { value: '33.33' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))
    fireEvent.change(tramo('Comida', 2), { target: { value: '33.33' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))
    expect(concluir()).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Monto' }))

    expect(tramo('Comida', 3)).toHaveValue('3.34')
    expect(concluir()).toBeEnabled()
  })

  it('un tramo agregado con todo repartido nace vacío y pide una cantidad', () => {
    renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))

    expect(tramo('Comida', 2)).toHaveValue('')
    expect(screen.getByText('Cada destino necesita una cantidad')).toBeInTheDocument()
    expect(concluir()).toBeDisabled()
  })

  it('lo editado no se pierde si las filas se recalculan con el diálogo abierto', () => {
    const rows = [row('cat_food', 'Comida', 100, 10)]
    const wallet = {
      state: { categories: DEFAULT_CATEGORIES, goals: [], budgets: [], activeBudgetTemplateId: 'tpl_default' },
      budgetStatusForMonth: () => rows.map((r) => ({ ...r })),
      concludeBudgetMonth: vi.fn(),
    } as unknown as WalletApi
    const props = { open: true, onOpenChange: vi.fn(), fromMonth: '2026-09', toMonth: '2026-10' }
    const { rerender } = render(<ConcludeMonthDialog {...props} wallet={wallet} rates={RATES} />)
    editar('Comida')

    fireEvent.change(tramo('Comida', 1), { target: { value: '60' } })
    rerender(<ConcludeMonthDialog {...props} wallet={{ ...wallet }} rates={{ ...RATES }} />)

    expect(tramo('Comida', 1)).toHaveValue('60')
  })

  it('pasar sobrante a una categoría con deuda muestra en vivo cuánto le queda', async () => {
    renderDialog([row('cat_food', 'Comida', 100, 10), row('cat_transport', 'Transporte', 50, 80)])

    editar('Comida')
    fireEvent.click(screen.getByRole('button', { name: 'Monto' }))
    fireEvent.change(tramo('Comida', 1), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))

    await elegirDestino(1, /Transporte/)

    expect(screen.getByText('→').parentElement).toHaveTextContent('+Bs. 20,00→+Bs. 40,00')
    expect(screen.getByText('Arranca con Bs. 10,00 ya utilizado por el déficit.')).toBeInTheDocument()
    expect(screen.getByText('De Comida')).toBeInTheDocument()

    fireEvent.change(tramo('Comida', 1), { target: { value: '50' } })
    fireEvent.change(tramo('Comida', 2), { target: { value: '40' } })

    expect(screen.getByText('Va al extra: +Bs. 10,00.')).toBeInTheDocument()
  })

  it('concluye con lo editado aunque no se haya pulsado «Listo»', async () => {
    const conclude = renderDialog([row('cat_food', 'Comida', 100, 10), row('cat_transport', 'Transporte', 50, 80)])

    editar('Comida')
    fireEvent.click(screen.getByRole('button', { name: 'Monto' }))
    fireEvent.change(tramo('Comida', 1), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))
    await elegirDestino(1, /Transporte/)

    expect(screen.getByRole('button', { name: 'Listo' })).toBeInTheDocument()
    fireEvent.click(concluir())

    expect(conclude).toHaveBeenCalledWith('2026-09', '2026-10', [
      { fromCategoryId: 'cat_food', destination: { kind: 'category', categoryId: 'cat_food' }, amount: 60 },
      { fromCategoryId: 'cat_food', destination: { kind: 'category', categoryId: 'cat_transport' }, amount: 30 },
      { fromCategoryId: 'cat_transport', destination: { kind: 'category', categoryId: 'cat_transport' }, amount: -30 },
    ])
  })

  it('quitar un tramo vuelve a dejar el reparto incompleto', () => {
    renderDialog([row('cat_food', 'Comida', 100, 10)])
    editar('Comida')

    fireEvent.change(tramo('Comida', 1), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar destino a Comida' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar destino 2 de Comida' }))

    expect(concluir()).toBeDisabled()
  })
})
