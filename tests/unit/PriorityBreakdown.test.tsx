import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PriorityBreakdown } from '@/components/billetera/PriorityBreakdown'
import type { PriorityTotal } from '@/lib/wallet/shoppingTotals'

function row(priority: 1 | 2 | 3 | 4, total: number | null, remaining: number | null): PriorityTotal {
  return { priority, total, remaining }
}

function Harness({ byPriority }: { byPriority: PriorityTotal[] }) {
  const [open, setOpen] = useState(false)
  return <PriorityBreakdown byPriority={byPriority} displayCurrency="VES" open={open} onOpenChange={setOpen} />
}

function expand() {
  fireEvent.click(screen.getByText('Por prioridad'))
}

describe('PriorityBreakdown', () => {
  it('no se renderiza cuando solo hay una prioridad presente', () => {
    const { container } = render(
      <PriorityBreakdown
        byPriority={[row(4, 300, 300)]}
        displayCurrency="VES"
        open={false}
        onOpenChange={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('no se renderiza cuando no hay prioridades', () => {
    const { container } = render(
      <PriorityBreakdown byPriority={[]} displayCurrency="VES" open={false} onOpenChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('colapsado muestra la etiqueta y un punto por prioridad, sin las cards', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)

    expect(screen.getByText('Por prioridad')).toBeInTheDocument()
    expect(screen.getAllByTestId('priority-dot')).toHaveLength(2)
    expect(screen.queryByTestId('priority-card')).not.toBeInTheDocument()
    expect(screen.queryByText('Alta')).not.toBeInTheDocument()
  })

  it('atenúa el punto de una prioridad sin restante', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)

    const dots = screen.getAllByTestId('priority-dot')
    expect(dots[0]).toHaveAttribute('data-covered', 'false')
    expect(dots[1]).toHaveAttribute('data-covered', 'true')
  })

  it('al abrirlo muestra una card por prioridad con el restante y el total', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)
    expand()

    const cards = screen.getAllByTestId('priority-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('1')
    expect(cards[0]).toHaveTextContent('Alta')
    expect(cards[0]).toHaveTextContent('Bs. 300,00')
    expect(cards[0]).toHaveTextContent('de Bs. 500,00')
    expect(cards[1]).toHaveTextContent('Mínima')
    expect(cards[1]).toHaveTextContent('de Bs. 300,00')
  })

  it('atenúa la card de una prioridad completamente comprada', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)
    expand()

    const cards = screen.getAllByTestId('priority-card')
    expect(cards[0]).toHaveAttribute('data-covered', 'false')
    expect(cards[1]).toHaveAttribute('data-covered', 'true')
  })

  it('la barra refleja la proporción ya comprada', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(2, 400, 400), row(4, 300, 0)]} />)
    expand()

    const bars = screen.getAllByTestId('priority-progress')
    expect(bars[0]).toHaveStyle({ width: '40%' })
    expect(bars[1]).toHaveStyle({ width: '0%' })
    expect(bars[2]).toHaveStyle({ width: '100%' })
  })

  it('no dibuja barra cuando falta la tasa', () => {
    render(<Harness byPriority={[row(1, null, null), row(3, null, null)]} />)
    expand()

    const cards = screen.getAllByTestId('priority-card')
    expect(cards[0]).toHaveTextContent('—')
    expect(cards[0]).not.toHaveTextContent('Bs.')
    expect(cards[0]).toHaveAttribute('data-covered', 'false')
    expect(screen.queryByTestId('priority-progress')).not.toBeInTheDocument()
  })

  it('no divide por cero cuando el total de una prioridad es cero', () => {
    render(<Harness byPriority={[row(1, 0, 0), row(2, 100, 100)]} />)
    expand()

    const bars = screen.getAllByTestId('priority-progress')
    expect(bars[0]).toHaveStyle({ width: '0%' })
  })

  it('formatea las cifras en la moneda de visualización', () => {
    render(
      <PriorityBreakdown
        byPriority={[row(1, 20, 12), row(2, 8, 8)]}
        displayCurrency="USD"
        open
        onOpenChange={vi.fn()}
      />
    )

    const cards = screen.getAllByTestId('priority-card')
    expect(cards[0]).toHaveTextContent('$ 12.00')
    expect(cards[0]).toHaveTextContent('de $ 20.00')
  })
})
