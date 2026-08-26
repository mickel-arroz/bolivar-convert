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

  it('colapsado muestra la etiqueta y un punto por prioridad, sin las filas', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)

    expect(screen.getByText('Por prioridad')).toBeInTheDocument()
    expect(screen.getAllByTestId('priority-dot')).toHaveLength(2)
    expect(screen.queryByText('Alta')).not.toBeInTheDocument()
    expect(screen.queryByText('restante')).not.toBeInTheDocument()
  })

  it('atenúa el punto de una prioridad sin restante', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)

    const dots = screen.getAllByTestId('priority-dot')
    expect(dots[0]).toHaveAttribute('data-covered', 'false')
    expect(dots[1]).toHaveAttribute('data-covered', 'true')
  })

  it('al abrirlo muestra los encabezados y una fila por prioridad', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)
    fireEvent.click(screen.getByText('Por prioridad'))

    expect(screen.getByText('total')).toBeInTheDocument()
    expect(screen.getByText('restante')).toBeInTheDocument()

    const rows = screen.getAllByTestId('priority-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('1')
    expect(rows[0]).toHaveTextContent('Alta')
    expect(rows[0]).toHaveTextContent('Bs. 500,00')
    expect(rows[0]).toHaveTextContent('Bs. 300,00')
    expect(rows[1]).toHaveTextContent('Mínima')
  })

  it('atenúa la fila de una prioridad completamente comprada', () => {
    render(<Harness byPriority={[row(1, 500, 300), row(4, 300, 0)]} />)
    fireEvent.click(screen.getByText('Por prioridad'))

    const rows = screen.getAllByTestId('priority-row')
    expect(rows[0]).toHaveAttribute('data-covered', 'false')
    expect(rows[1]).toHaveAttribute('data-covered', 'true')
  })

  it('muestra un guion cuando falta la tasa', () => {
    render(<Harness byPriority={[row(1, null, null), row(3, null, null)]} />)
    fireEvent.click(screen.getByText('Por prioridad'))

    const rows = screen.getAllByTestId('priority-row')
    expect(rows[0]).toHaveTextContent('—')
    expect(rows[0]).not.toHaveTextContent('Bs.')
    expect(rows[0]).toHaveAttribute('data-covered', 'false')
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

    const rows = screen.getAllByTestId('priority-row')
    expect(rows[0]).toHaveTextContent('$ 20.00')
    expect(rows[0]).toHaveTextContent('$ 12.00')
  })
})
