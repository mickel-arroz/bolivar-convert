import { renderHook, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAdvice } from '@/hooks/useAdvice'
import { AdviceCard } from '@/components/billetera/AdviceCard'
import { ADVICE_MAX_LENGTH, GENERIC_ADVICE, type StoredAdvice } from '@/lib/wallet/advice'

const todos = (text: string) => ({ '1m': text, '6m': text, '1y': text, all: text })

const SAVED: StoredAdvice = {
  stats: todos('En comida se te fue casi todo.'),
  budget: 'Recorta ocio este mes.',
  generatedAt: '2026-09-20T10:00:00.000Z',
}

const FRESH: StoredAdvice = {
  stats: todos('Hoy: vas bien con el ahorro.'),
  budget: 'Hoy: frena las compras.',
  generatedAt: '2026-09-21T10:00:00.000Z',
}

type Reply = { ok: boolean; json: () => Promise<unknown> }

const fetchMock = vi.fn()

function serve(
  advice: StoredAdvice | null,
  canAttempt: boolean,
  post: () => Promise<Reply> = async () => ({ ok: true, json: async () => ({ advice: FRESH, refreshed: true }) })
) {
  fetchMock.mockImplementation(async (_url: string, opts?: { method?: string }) => {
    if (opts?.method === 'POST') return post()
    return { ok: true, json: async () => ({ advice, canAttempt }) }
  })
}

/** Las peticiones POST registradas: las generaciones que se dispararon. */
function refreshes() {
  return fetchMock.mock.calls.filter((c) => c[1]?.method === 'POST')
}

vi.stubGlobal('fetch', fetchMock)

describe('useAdvice', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('con el consejo de hoy ya guardado lo muestra y no pide nada', async () => {
    serve(SAVED, false)
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.advice).toMatchObject({ stats: SAVED.stats, budget: SAVED.budget })
    expect(refreshes()).toHaveLength(0)
  })

  it('cuando toca generar, muestra el guardado y lo reemplaza apenas llega el nuevo', async () => {
    let release = () => {}
    serve(
      SAVED,
      true,
      () =>
        new Promise<Reply>((resolve) => {
          release = () => resolve({ ok: true, json: async () => ({ advice: FRESH, refreshed: true }) })
        })
    )
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(refreshes()).toHaveLength(1))
    expect(result.current.advice.stats).toEqual(SAVED.stats)

    release()
    await waitFor(() => expect(result.current.advice.stats).toEqual(FRESH.stats))
    expect(result.current.advice.budget).toBe(FRESH.budget)
  })

  it('si la generación falla, se queda lo guardado', async () => {
    serve(SAVED, true, async () => {
      throw new Error('sin conexión')
    })
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(refreshes()).toHaveLength(1))
    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.advice.stats).toEqual(SAVED.stats)
  })

  it('si no tocó generar (otra pestaña se llevó el intento), no cambia lo que se ve', async () => {
    serve(SAVED, true, async () => ({ ok: true, json: async () => ({ advice: SAVED, refreshed: false }) }))
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(refreshes()).toHaveLength(1))

    expect(result.current.advice.stats).toEqual(SAVED.stats)
  })

  it('sin consejo guardado muestra el texto genérico de cada pestaña', async () => {
    serve(null, false)
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.advice).toEqual(GENERIC_ADVICE)
  })

  it('si el endpoint falla, queda el texto genérico y la vista no se rompe', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('sin conexión')
    })
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.advice).toEqual(GENERIC_ADVICE)
  })

  it('las dos pestañas a la vez disparan una sola generación y ambas reciben lo nuevo', async () => {
    // La generación queda en vuelo hasta soltarla: la guardia se prueba sin depender
    // del orden en que resuelven las promesas.
    let release = () => {}
    const inFlight = new Promise<Reply>((resolve) => {
      release = () => resolve({ ok: true, json: async () => ({ advice: FRESH, refreshed: true }) })
    })
    serve(SAVED, true, () => inFlight)

    const estadisticas = renderHook(() => useAdvice())
    const presupuestos = renderHook(() => useAdvice())

    await waitFor(() => expect(estadisticas.result.current.loaded).toBe(true))
    await waitFor(() => expect(presupuestos.result.current.loaded).toBe(true))
    expect(refreshes()).toHaveLength(1)

    release()
    await waitFor(() => expect(estadisticas.result.current.advice.stats).toEqual(FRESH.stats))
    await waitFor(() => expect(presupuestos.result.current.advice.budget).toBe(FRESH.budget))
    expect(refreshes()).toHaveLength(1)
  })
})

describe('AdviceCard', () => {
  it('muestra el texto genérico cuando no hay consejo', () => {
    render(<AdviceCard title="En qué se te fue el dinero" text={GENERIC_ADVICE.stats['1m']} />)

    expect(screen.getByTestId('advice-text')).toHaveTextContent('Registra tus ingresos y gastos')
    expect(screen.getByText('En qué se te fue el dinero')).toBeInTheDocument()
  })

  it('muestra completo, sin «…», un consejo que se pasa del límite del prompt', () => {
    const long = 'z'.repeat(ADVICE_MAX_LENGTH + 50)
    render(<AdviceCard title="Consejo" text={long} />)

    expect(screen.getByTestId('advice-text').textContent).toBe(long)
  })

  it('mientras se lee lo guardado muestra un skeleton y no el texto genérico', () => {
    render(<AdviceCard title="Consejo" text={GENERIC_ADVICE.stats['1m']} loading />)

    expect(screen.getByTestId('advice-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('advice-text')).not.toBeInTheDocument()
    expect(screen.getByText('Consejo')).toBeInTheDocument()
  })

  it('el texto entra con una transición suave, sin spinner', () => {
    render(<AdviceCard title="Consejo" text="Un consejo." />)

    expect(screen.getByTestId('advice-text')).toHaveClass('animate-in', 'fade-in')
  })

  it('preserva los saltos de línea del consejo', () => {
    render(<AdviceCard title="Consejo" text={'Primera línea.\nSegunda línea.'} />)

    expect(screen.getByTestId('advice-text')).toHaveClass('whitespace-pre-line')
  })
})
