import { renderHook, act } from '@testing-library/react'
import { useBillSplitter } from '@/hooks/useBillSplitter'
import { describe, it, expect, beforeEach } from 'vitest'

describe('useBillSplitter Hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useBillSplitter())
    
    expect(result.current.state.splitMode).toBe('itemized')
    expect(result.current.state.currency).toBe('VES')
    expect(result.current.state.people).toEqual([])
    expect(result.current.state.ivaIncluded).toBe(true)
    expect(result.current.state.tipIncluded).toBe(true)
    expect(result.current.state.igtfIncluded).toBe(false)
  })

  it('can switch split modes', () => {
    const { result } = renderHook(() => useBillSplitter())
    
    act(() => {
      result.current.setSplitMode('equal')
    })
    
    expect(result.current.state.splitMode).toBe('equal')
  })

  it('can add and remove people', () => {
    const { result } = renderHook(() => useBillSplitter())
    
    act(() => {
      result.current.addPerson('Alice')
      result.current.addPerson('Bob')
    })
    
    expect(result.current.state.people).toHaveLength(2)
    expect(result.current.state.people[0].name).toBe('Alice')
    expect(result.current.state.people[1].name).toBe('Bob')

    act(() => {
      result.current.removePerson(result.current.state.people[0].id)
    })

    expect(result.current.state.people).toHaveLength(1)
    expect(result.current.state.people[0].name).toBe('Bob')
  })

  it('can add and remove items for a person', () => {
    const { result } = renderHook(() => useBillSplitter())
    
    act(() => {
      result.current.addPerson('Charlie')
    })
    const personId = result.current.state.people[0].id

    act(() => {
      result.current.addItem(personId, 'Burger', '15.50')
      result.current.addItem(personId, 'Fries', '4.50')
    })

    expect(result.current.state.people[0].items).toHaveLength(2)
    expect(result.current.state.people[0].items[0].title).toBe('Burger')
    expect(result.current.state.people[0].items[1].amount).toBe('4.50')

    const itemId = result.current.state.people[0].items[0].id
    act(() => {
      result.current.removeItem(personId, itemId)
    })

    expect(result.current.state.people[0].items).toHaveLength(1)
    expect(result.current.state.people[0].items[0].title).toBe('Fries')
  })

  it('calculates equal split correctly', () => {
    const { result } = renderHook(() => useBillSplitter())

    act(() => {
      result.current.setSplitMode('equal')
      result.current.setEqualSplitAmount('100')
      result.current.setEqualSplitPeopleCount('4')
      result.current.setIvaIncluded(true)
      result.current.setTipIncluded(true)
    })

    expect(result.current.calculations.rawTotal).toBe(100)
    expect(result.current.calculations.grandTotal).toBe(100)
    expect(result.current.calculations.perPersonTotal).toBe(25)
  })

  it('calculates itemized split with proportional IVA, Tip, and IGTF', () => {
    const { result } = renderHook(() => useBillSplitter())

    act(() => {
      // Setup currency and taxes
      result.current.setCurrency('USD')
      result.current.setIvaIncluded(false)
      result.current.setTipIncluded(false)
      result.current.setIgtfIncluded(true)
      result.current.setTipMode('percentage')
      result.current.setTipPercentage(10) // 10% tip

      // Add people and items
      result.current.addPerson('Dave')
      result.current.addPerson('Eve')
    })

    const daveId = result.current.state.people[0].id
    const eveId = result.current.state.people[1].id

    act(() => {
      result.current.addItem(daveId, 'Pizza', '60') // Dave = 60
      result.current.addItem(eveId, 'Pasta', '40') // Eve = 40
    })

    const calc = result.current.calculations
    
    // Global Totals
    expect(calc.rawTotal).toBe(100)
    
    // 10% Tip
    expect(calc.tipValue).toBe(10)
    
    // 16% IVA on rawTotal
    expect(calc.ivaValue).toBe(16)
    
    // 3% IGTF on rawTotal (since currency is USD)
    expect(calc.igtfValue).toBe(3)
    
    expect(calc.grandTotal).toBe(129) // 100 + 10 + 16 + 3

    // Breakdowns
    const dave = calc.breakdowns.find(p => p.id === daveId)
    const eve = calc.breakdowns.find(p => p.id === eveId)

    // Dave (60% of total)
    expect(dave?.subtotal).toBe(60)
    expect(dave?.tipShare).toBe(6) // 60% of 10
    expect(dave?.ivaShare).toBe(9.6) // 60% of 16
    expect(dave?.igtfShare).toBeCloseTo(1.8, 4) // 60% of 3
    expect(dave?.total).toBeCloseTo(60 + 6 + 9.6 + 1.8, 4) // 77.4

    // Eve (40% of total)
    expect(eve?.subtotal).toBe(40)
    expect(eve?.tipShare).toBe(4) // 40% of 10
    expect(eve?.ivaShare).toBe(6.4) // 40% of 16
    expect(eve?.igtfShare).toBeCloseTo(1.2, 4) // 40% of 3
    expect(eve?.total).toBeCloseTo(40 + 4 + 6.4 + 1.2, 4) // 51.6
  })

  it('does not calculate IGTF for Bs currency', () => {
    const { result } = renderHook(() => useBillSplitter())

    act(() => {
      result.current.setCurrency('VES')
      result.current.setIgtfIncluded(true) // Turned on, but shouldn't apply
      result.current.addPerson('Frank')
    })
    
    const frankId = result.current.state.people[0].id
    act(() => {
      result.current.addItem(frankId, 'Item', '100')
    })

    const calc = result.current.calculations
    expect(calc.igtfValue).toBe(0)
  })
})
