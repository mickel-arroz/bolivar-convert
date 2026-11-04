import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { BudgetUsageCard } from '@/components/billetera/BudgetUsageCard'
import { formatMoney as rawFormatMoney } from '@/components/billetera/format'
import type { Budget, BudgetStatusRow } from '@/hooks/useWallet'
import type { BudgetUsage } from '@/lib/wallet/compute'
import type { CurrencyId } from '@/constants/currencies'

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: () => <div data-testid="chart" />,
}))

/** Como lo lee `toHaveTextContent`, que convierte el espacio de no separación en uno normal. */
const formatMoney = (...args: Parameters<typeof rawFormatMoney>) =>
  rawFormatMoney(...args).replace(/ /g, ' ')

function row(name: string, limit: number, actual: number, currency: CurrencyId = 'VES'): BudgetStatusRow {
  return {
    budget: { id: name, templateId: 't', categoryId: name, month: '2026-11', limit: String(limit), currency } as Budget,
    categoryName: name,
    categoryIcon: 'other',
    actual,
    limit,
    carryover: 0,
    carriedDeficit: 0,
    effectiveLimit: limit,
    ratio: limit > 0 ? actual / limit : 0,
    isOver: actual > limit,
  }
}

const USAGE: BudgetUsage = { currency: 'VES', spent: 375, total: 1000, ratio: 0.375, onTrack: 1, over: 2 }

const bars = () => screen.getAllByTestId('budget-usage-row')

describe('BudgetUsageCard', () => {
  it('el anillo muestra el % usado del total y el conteo al día / sobrepasados', () => {
    render(<BudgetUsageCard rows={[row('A', 100, 10)]} usage={USAGE} />)

    expect(screen.getByText(/Usado 38\s?% del presupuesto total/)).toBeInTheDocument()
    expect(screen.getByText(/1 al día · 2 sobrepasados/)).toBeInTheDocument()
  })

  it('el top usa el % de cada presupuesto con montos en su moneda, de mayor a menor', () => {
    render(
      <BudgetUsageCard
        rows={[row('Bajo', 100, 10), row('Alto', 10, 12, 'USD'), row('Medio', 100, 50)]}
        usage={USAGE}
      />
    )

    expect(bars().map((b) => within(b).getByTestId('budget-usage-name').textContent)).toEqual([
      'Alto',
      'Medio',
      'Bajo',
    ])
    expect(bars()[0]).toHaveTextContent(`${formatMoney(12, 'USD')} / ${formatMoney(10, 'USD')}`)
    expect(bars()[0]).toHaveTextContent(/120\s?%/)
  })

  it('los sobrepasados van en rojo y los demás no', () => {
    render(<BudgetUsageCard rows={[row('Pasado', 100, 150), row('Bien', 100, 20)]} usage={USAGE} />)

    expect(bars()[0].querySelector('.bg-destructive')).not.toBeNull()
    expect(bars()[1].querySelector('.bg-destructive')).toBeNull()
  })

  it('con 5 o menos no ofrece «Ver todos»', () => {
    render(<BudgetUsageCard rows={[1, 2, 3, 4, 5].map((i) => row(`P${i}`, 100, i))} usage={USAGE} />)

    expect(bars()).toHaveLength(5)
    expect(screen.queryByRole('button', { name: /Ver todos/ })).not.toBeInTheDocument()
  })

  it('con más de 5 muestra el top 5 y «Ver todos (N)» despliega el resto', () => {
    render(<BudgetUsageCard rows={[1, 2, 3, 4, 5, 6, 7].map((i) => row(`P${i}`, 100, i))} usage={USAGE} />)

    expect(bars()).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Ver todos (7)' }))
    expect(bars()).toHaveLength(7)
  })
})
