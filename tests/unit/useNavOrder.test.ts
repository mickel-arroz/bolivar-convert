import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useNavOrder } from '@/hooks/useNavOrder'
import { NAV_ITEMS } from '@/constants/site'

const STORAGE_KEY = 'bolivar_nav_order_v1'
const DEFAULT_HREFS = NAV_ITEMS.map((i) => i.href)

const hrefs = (items: { href: string }[]) => items.map((i) => i.href)

describe('useNavOrder Hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('devuelve el orden por defecto cuando no hay nada guardado', async () => {
    const { result } = renderHook(() => useNavOrder())
    await waitFor(() => expect(result.current.isMounted).toBe(true))
    expect(hrefs(result.current.orderedItems)).toEqual(DEFAULT_HREFS)
  })

  it('persiste el orden tras reorder y lo rehidrata', async () => {
    const { result, unmount } = renderHook(() => useNavOrder())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    const first = DEFAULT_HREFS[0]
    const last = DEFAULT_HREFS[DEFAULT_HREFS.length - 1]

    // Mueve el último al lugar del primero
    act(() => result.current.reorder(last, first))

    expect(result.current.orderedItems[0].href).toBe(last)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0]).toBe(last)

    // Rehidratación: un nuevo montaje debe leer el orden guardado
    unmount()
    const { result: result2 } = renderHook(() => useNavOrder())
    await waitFor(() => expect(result2.current.isMounted).toBe(true))
    expect(result2.current.orderedItems[0].href).toBe(last)
  })

  it('reconcilia: ignora href inexistente y anexa tabs nuevos al final', async () => {
    // Guardamos solo un href válido + uno inexistente
    const validHref = DEFAULT_HREFS[2]
    localStorage.setItem(STORAGE_KEY, JSON.stringify([validHref, '/inexistente']))

    const { result } = renderHook(() => useNavOrder())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    const resultHrefs = hrefs(result.current.orderedItems)
    // El válido va primero, '/inexistente' se descarta, el resto se anexa en orden default
    expect(resultHrefs[0]).toBe(validHref)
    expect(resultHrefs).not.toContain('/inexistente')
    expect([...resultHrefs].sort()).toEqual([...DEFAULT_HREFS].sort())
  })

  it('resetOrder vuelve al orden por defecto', async () => {
    const { result } = renderHook(() => useNavOrder())
    await waitFor(() => expect(result.current.isMounted).toBe(true))

    act(() => result.current.reorder(DEFAULT_HREFS[DEFAULT_HREFS.length - 1], DEFAULT_HREFS[0]))
    expect(hrefs(result.current.orderedItems)).not.toEqual(DEFAULT_HREFS)

    act(() => result.current.resetOrder())
    expect(hrefs(result.current.orderedItems)).toEqual(DEFAULT_HREFS)
  })
})
