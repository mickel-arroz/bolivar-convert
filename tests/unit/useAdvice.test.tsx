import { renderHook, waitFor } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAdvice } from '@/hooks/useAdvice'
import { AdviceCard } from '@/components/billetera/AdviceCard'
import { ADVICE_MAX_LENGTH, GENERIC_ADVICE, type StoredAdvice } from '@/lib/wallet/advice'

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

const SAVED: StoredAdvice = {
  stats: 'En comida se te fue casi todo.',
  budget: 'Recorta ocio este mes.',
  generatedAt: daysAgo(2),
}

const fetchMock = vi.fn()

function serve(advice: StoredAdvice | null) {
  fetchMock.mockImplementation(async (_url: string, opts?: { method?: string }) => {
    if (opts?.method === 'POST') return { ok: true, json: async () => ({ refreshed: true }) }
    return { ok: true, json: async () => ({ advice }) }
  })
}

/** Las peticiones POST registradas: las actualizaciones que se dispararon. */
function refreshes() {
  return fetchMock.mock.calls.filter((c) => c[1]?.method === 'POST')
}

vi.stubGlobal('fetch', fetchMock)

describe('useAdvice', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('muestra un consejo guardado de menos de 7 días y no pide nada', async () => {
    serve(SAVED)
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.advice).toMatchObject({ stats: SAVED.stats, budget: SAVED.budget })
    expect(refreshes()).toHaveLength(0)
  })

  it('con un consejo de más de 7 días muestra el viejo y dispara la actualización', async () => {
    const old = { ...SAVED, generatedAt: daysAgo(9) }
    serve(old)
    const { result } = renderHook(() => useAdvice())

    await waitFor(() => expect(refreshes()).toHaveLength(1))

    // El texto en pantalla sigue siendo el guardado: el nuevo se ve en la visita siguiente.
    expect(result.current.advice.stats).toBe(old.stats)
  })

  it('sin consejo guardado muestra el texto genérico de cada pestaña', async () => {
    serve(null)
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

  it('entrar a las dos pestañas seguidas no dispara dos actualizaciones', async () => {
    const stale = { ...SAVED, generatedAt: daysAgo(9) }
    // La actualización queda en vuelo hasta que la soltemos: así la guardia se prueba
    // sin depender de en qué orden resuelven las promesas.
    let release = () => {}
    const inFlight = new Promise<{ ok: boolean; json: () => Promise<unknown> }>((resolve) => {
      release = () => resolve({ ok: true, json: async () => ({ refreshed: true }) })
    })
    fetchMock.mockImplementation(async (_url: string, opts?: { method?: string }) => {
      if (opts?.method === 'POST') return inFlight
      return { ok: true, json: async () => ({ advice: stale }) }
    })

    const estadisticas = renderHook(() => useAdvice())
    const presupuesto = renderHook(() => useAdvice())

    await waitFor(() => expect(estadisticas.result.current.loaded).toBe(true))
    await waitFor(() => expect(presupuesto.result.current.loaded).toBe(true))

    expect(refreshes()).toHaveLength(1)

    release()
    await waitFor(() => expect(refreshes()).toHaveLength(1))
  })
})

describe('AdviceCard', () => {
  it('muestra el texto genérico cuando no hay consejo', () => {
    render(<AdviceCard title="En qué se te fue el dinero" text={GENERIC_ADVICE.stats} />)

    expect(screen.getByTestId('advice-text')).toHaveTextContent('Registra tus ingresos y gastos')
    expect(screen.getByText('En qué se te fue el dinero')).toBeInTheDocument()
  })

  it('trunca de forma defensiva un consejo hablador', () => {
    render(<AdviceCard title="Consejo" text={'z'.repeat(ADVICE_MAX_LENGTH + 200)} />)

    expect(screen.getByTestId('advice-text').textContent).toHaveLength(ADVICE_MAX_LENGTH)
  })

  it('preserva los saltos de línea del consejo', () => {
    render(<AdviceCard title="Consejo" text={'Primera línea.\nSegunda línea.'} />)

    expect(screen.getByTestId('advice-text')).toHaveClass('whitespace-pre-line')
  })
})
