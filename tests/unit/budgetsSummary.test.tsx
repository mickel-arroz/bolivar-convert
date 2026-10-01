import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { summarizeBudgets } from '@/lib/wallet/compute'
import { BudgetsSummaryCard } from '@/components/billetera/BudgetsSummaryCard'
import type { Budget, BudgetStatusRow } from '@/hooks/useWallet'
import type { CurrencyId } from '@/constants/currencies'
import type { Rates } from '@/constants/rates'

const RATES: Rates = { bcvUsd: '40', bcvEur: '45', binanceUsdAvg: '42', lastUpdate: '' }

let n = 0
const row = (o: {
  limit: number
  carryover?: number
  actual?: number
  currency?: CurrencyId
}): BudgetStatusRow => {
  const carryover = o.carryover ?? 0
  const id = `b${n++}`
  return {
    budget: {
      id,
      templateId: 't',
      categoryId: id,
      month: '2026-09',
      limit: String(o.limit),
      currency: o.currency ?? 'VES',
    } as Budget,
    categoryName: 'X',
    categoryIcon: 'food',
    actual: o.actual ?? 0,
    limit: o.limit,
    carryover,
    effectiveLimit: o.limit + carryover,
    ratio: 0,
    isOver: false,
  }
}

const summarize = (rows: BudgetStatusRow[], display: CurrencyId = 'VES', rates = RATES) =>
  summarizeBudgets(rows, display, rates, 'bcvUsd')

describe('summarizeBudgets', () => {
  it('sin gastos: todo libre y la barra sin rojo', () => {
    const s = summarize([row({ limit: 100, carryover: 20 }), row({ limit: 200, carryover: 30 })])

    expect(s).toMatchObject({
      currency: 'VES',
      count: 2,
      budget: 300,
      extra: 50,
      total: 350,
      spentBudget: 0,
      spentExtra: 0,
      freeBudget: 300,
      extraLeft: 50,
      overflow: 0,
      spent: 0,
      ratio: 0,
    })
  })

  it('el gasto consume primero el estimado: el extra queda intacto', () => {
    const s = summarize([
      row({ limit: 100, carryover: 20, actual: 60 }),
      row({ limit: 200, carryover: 30, actual: 100 }),
    ])

    expect(s.spentBudget).toBe(160)
    expect(s.spentExtra).toBe(0)
    expect(s.freeBudget).toBe(140)
    expect(s.extraLeft).toBe(50)
    expect(s.ratio).toBeCloseTo(160 / 350)
  })

  it('agotado el estimado, el gasto sigue con el extra', () => {
    const s = summarize([row({ limit: 100, carryover: 50, actual: 130 }), row({ limit: 100 })])

    expect(s.spentBudget).toBe(100)
    expect(s.spentExtra).toBe(30)
    expect(s.freeBudget).toBe(100) // el del segundo presupuesto
    expect(s.extraLeft).toBe(20)
    expect(s.overflow).toBe(0)
  })

  it('gastar más que la suma de presupuesto + extra de todos lo deja excedido', () => {
    // Total general: 100 + 10 + 50 = 160. Gastado: 150 + 20 = 170.
    const s = summarize([
      row({ limit: 100, carryover: 10, actual: 150 }),
      row({ limit: 50, actual: 20 }),
    ])

    expect(s.total).toBe(160)
    expect(s.spent).toBe(170)
    expect(s.overflow).toBe(10)
    expect(s.ratio).toBe(1)
  })

  it('un presupuesto que se pasó no cuenta como excedido si la suma general alcanza', () => {
    // El primero gastó 150 de 100, pero entre los dos hay 300 y solo se gastaron 150.
    const s = summarize([row({ limit: 100, actual: 150 }), row({ limit: 200 })])

    expect(s.total).toBe(300)
    expect(s.spent).toBe(150)
    expect(s.overflow).toBe(0)
  })

  it('gastar exactamente la suma de todo no es excederse', () => {
    const s = summarize([row({ limit: 100, carryover: 20, actual: 120 }), row({ limit: 80, actual: 80 })])

    expect(s.total).toBe(200)
    expect(s.spent).toBe(200)
    expect(s.overflow).toBe(0)
    expect(s.ratio).toBe(1)
  })

  it('sin presupuesto disponible, cualquier gasto es excedido', () => {
    // Déficit mayor que el estimado: lo disponible en total no es positivo.
    const s = summarize([row({ limit: 50, carryover: -80, actual: 10 }), row({ limit: 0 })])

    expect(s.total).toBe(-30)
    expect(s.overflow).toBe(10)
  })

  it('con todo gastado y más, la barra queda llena (ratio 1)', () => {
    const s = summarize([row({ limit: 100, actual: 150 }), row({ limit: 100, actual: 100 })])
    expect(s.ratio).toBe(1)
  })

  it('un extra negativo (déficit) reduce lo disponible y sigue figurando', () => {
    const s = summarize([row({ limit: 100, carryover: -30, actual: 90 }), row({ limit: 100 })])

    expect(s.budget).toBe(200)
    expect(s.extra).toBe(-30)
    expect(s.total).toBe(170)
    expect(s.spentExtra).toBe(0) // un déficit no se gasta
    expect(s.extraLeft).toBe(-30)
    expect(s.overflow).toBe(0) // gastó 90 y entre los dos hay 170
  })

  it('libre + extra libre = total − gastado cuando nada se excede', () => {
    const cases = [
      [row({ limit: 100, carryover: 20, actual: 60 }), row({ limit: 200, carryover: 30, actual: 220 })],
      [row({ limit: 100, carryover: 50, actual: 130 }), row({ limit: 80, actual: 10 })],
      [row({ limit: 100 }), row({ limit: 100, carryover: -10, actual: 20 })],
    ]
    for (const rows of cases) {
      const s = summarize(rows)
      expect(s.overflow).toBe(0)
      expect(s.freeBudget + s.extraLeft).toBeCloseTo(s.total - s.spent)
    }
  })

  it('con una sola moneda se queda en ella aunque la preferida sea otra, sin necesitar tasas', () => {
    const s = summarize(
      [row({ limit: 10, currency: 'USD' }), row({ limit: 5, actual: 2, currency: 'USD' })],
      'VES',
      { bcvUsd: '0', bcvEur: '0', binanceUsdAvg: '0', lastUpdate: '' }
    )

    expect(s.currency).toBe('USD')
    expect(s.converted).toBe(false)
    expect(s.ratesMissing).toBe(false)
    expect(s.total).toBe(15)
  })

  it('con monedas distintas convierte a la moneda preferida', () => {
    // 400 Bs. a 40 Bs./$ = 10 $; más 10 $ de presupuesto en dólares.
    const s = summarize(
      [row({ limit: 400, actual: 40 }), row({ limit: 10, actual: 1, currency: 'USD' })],
      'USD'
    )

    expect(s.currency).toBe('USD')
    expect(s.converted).toBe(true)
    expect(s.budget).toBe(20)
    expect(s.spent).toBe(2)
    expect(s.ratesMissing).toBe(false)
  })

  it('si falta la tasa, lo avisa y no suma esa parte', () => {
    const s = summarize([row({ limit: 400 }), row({ limit: 10, currency: 'USD' })], 'USD', {
      ...RATES,
      bcvUsd: '0',
    })

    expect(s.ratesMissing).toBe(true)
    expect(s.budget).toBe(10)
  })
})

describe('BudgetsSummaryCard', () => {
  const summary = summarize([
    row({ limit: 100, carryover: 20, actual: 60 }),
    row({ limit: 200, carryover: 30, actual: 100 }),
  ])

  it('muestra los siete datos pedidos', () => {
    render(<BudgetsSummaryCard summary={summary} />)

    for (const label of [
      'Presupuesto total',
      'Extra',
      'Presupuesto + extra',
      'Presupuesto libre',
      'Extra libre',
      'Presupuesto gastado',
      'Extra gastado',
    ]) {
      expect(screen.getByText(new RegExp(`^${label.replace('+', '\\+')}:`))).toBeInTheDocument()
    }
    expect(screen.getByText('Todos los presupuestos')).toBeInTheDocument()
    expect(screen.getByText('2 presupuestos')).toBeInTheDocument()
  })

  it('la barra es toda verde sin gastos y el rojo crece con el gasto', () => {
    const { rerender } = render(
      <BudgetsSummaryCard summary={summarize([row({ limit: 100 }), row({ limit: 100 })])} />
    )
    const bar = () => screen.getByRole('progressbar')
    expect(bar()).toHaveClass('bg-green-500')
    expect(bar()).toHaveAttribute('aria-valuenow', '0')
    expect((bar().firstElementChild as HTMLElement).style.width).toBe('0%')

    rerender(<BudgetsSummaryCard summary={summarize([row({ limit: 100, actual: 50 }), row({ limit: 100 })])} />)
    expect(bar()).toHaveAttribute('aria-valuenow', '25')
    expect((bar().firstElementChild as HTMLElement).style.width).toBe('25%')
  })

  it('avisa solo cuando lo gastado supera la suma general, y por cuánto', () => {
    // Total 150, gastado 170: se pasó por 20.
    render(
      <BudgetsSummaryCard
        summary={summarize([row({ limit: 100, actual: 150 }), row({ limit: 50, actual: 20 })])}
      />
    )
    expect(screen.getByText(/Superaste lo disponible en/)).toHaveTextContent('20,00')
  })

  it('no avisa si un presupuesto se pasó pero la suma general alcanza', () => {
    render(<BudgetsSummaryCard summary={summarize([row({ limit: 100, actual: 150 }), row({ limit: 200 })])} />)
    expect(screen.queryByText(/Superaste lo disponible/)).not.toBeInTheDocument()
  })

  it('no avisa de nada de más cuando todo está en orden', () => {
    render(<BudgetsSummaryCard summary={summary} />)
    expect(screen.queryByText(/Superaste/)).not.toBeInTheDocument()
    expect(screen.queryByText(/distintas monedas/)).not.toBeInTheDocument()
  })
})
