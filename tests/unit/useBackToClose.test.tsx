import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const depth = () => (window.history.state?.__modalDepth as number | undefined) ?? 0

function back() {
  act(() => window.history.back())
}

function Modal({
  open,
  onOpenChange,
  title,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
      </DialogContent>
    </Dialog>
  )
}

afterEach(async () => {
  cleanup()
  await waitFor(() => expect(depth()).toBe(0))
})

describe('useBackToClose — gesto de atrás en modales', () => {
  it('atrás cierra la modal abierta sin salir de la página', async () => {
    function Single() {
      const [open, setOpen] = useState(true)
      return <Modal open={open} onOpenChange={setOpen} title="A" />
    }
    const { queryByText } = render(<Single />)
    await waitFor(() => expect(depth()).toBe(1))

    back()
    await waitFor(() => expect(queryByText('A')).toBeNull())
    expect(depth()).toBe(0)
  })

  it('con dos modales apiladas, atrás cierra solo la de arriba', async () => {
    function Stack() {
      const [a, setA] = useState(true)
      const [b, setB] = useState(true)
      return (
        <>
          <Modal open={a} onOpenChange={setA} title="Abajo" />
          <Modal open={b} onOpenChange={setB} title="Arriba" />
          <span data-testid="state">{`${a}-${b}`}</span>
        </>
      )
    }
    const { getByTestId } = render(<Stack />)
    await waitFor(() => expect(depth()).toBe(2))

    back()
    await waitFor(() => expect(getByTestId('state').textContent).toBe('true-false'))
    await waitFor(() => expect(depth()).toBe(1))

    back()
    await waitFor(() => expect(getByTestId('state').textContent).toBe('false-false'))
  })

  it('cerrar la modal por otro medio retira su entrada del historial', async () => {
    function Toggle() {
      const [open, setOpen] = useState(true)
      return (
        <>
          <Modal open={open} onOpenChange={setOpen} title="A" />
          <button onClick={() => setOpen(false)}>cerrar</button>
        </>
      )
    }
    const { getByText } = render(<Toggle />)
    await waitFor(() => expect(depth()).toBe(1))

    act(() => getByText('cerrar').click())
    await waitFor(() => expect(depth()).toBe(0))
  })

  it('si la modal rechaza el cierre, sigue abierta y recupera su entrada', async () => {
    const onOpenChange = vi.fn()
    const { getByText } = render(<Modal open onOpenChange={onOpenChange} title="Bloqueada" />)
    await waitFor(() => expect(depth()).toBe(1))

    back()
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()))
    await waitFor(() => expect(depth()).toBe(1))
    expect(getByText('Bloqueada')).toBeInTheDocument()
  })
})
