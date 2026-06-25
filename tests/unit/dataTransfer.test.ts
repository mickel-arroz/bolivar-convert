import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyImport,
  buildExportFilename,
  collectLocalStorage,
  parseImport,
  serializeExport,
} from '@/lib/dataTransfer'

describe('dataTransfer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('collectLocalStorage', () => {
    it('collects every key/value pair from storage', () => {
      localStorage.setItem('bolivar_wallet_v1', '{"a":1}')
      localStorage.setItem('theme', 'dark')

      const snapshot = collectLocalStorage()

      expect(snapshot).toEqual({
        bolivar_wallet_v1: '{"a":1}',
        theme: 'dark',
      })
    })

    it('returns an empty object when storage is empty', () => {
      expect(collectLocalStorage()).toEqual({})
    })
  })

  describe('serializeExport', () => {
    it('produces indented JSON that round-trips back to the snapshot', () => {
      const snapshot = { theme: 'dark', bolivar_nav_order_v1: '["/"]' }
      const text = serializeExport(snapshot)

      expect(text).toContain('\n')
      expect(JSON.parse(text)).toEqual(snapshot)
    })
  })

  describe('buildExportFilename', () => {
    it('formats the date as bolivar-convert-data-YYYY-MM-DD.txt', () => {
      const date = new Date(2026, 5, 25) // junio = mes 5
      expect(buildExportFilename(date)).toBe('bolivar-convert-data-2026-06-25.txt')
    })
  })

  describe('parseImport', () => {
    it('accepts a valid flat object of strings', () => {
      const result = parseImport('{"theme":"dark","x":"1"}')
      expect(result).toEqual({
        ok: true,
        data: { theme: 'dark', x: '1' },
        keyCount: 2,
      })
    })

    it('rejects invalid JSON', () => {
      const result = parseImport('{not json}')
      expect(result.ok).toBe(false)
    })

    it('rejects a JSON array', () => {
      const result = parseImport('["a","b"]')
      expect(result.ok).toBe(false)
    })

    it('rejects null', () => {
      const result = parseImport('null')
      expect(result.ok).toBe(false)
    })

    it('rejects an empty object', () => {
      const result = parseImport('{}')
      expect(result.ok).toBe(false)
    })

    it('rejects objects with non-string values', () => {
      const result = parseImport('{"theme":"dark","count":3}')
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toContain('count')
      }
    })
  })

  describe('applyImport', () => {
    it('clears previous data before writing the new snapshot', () => {
      localStorage.setItem('old_key', 'old')

      applyImport({ theme: 'light', bolivar_wallet_v1: '{}' })

      expect(localStorage.getItem('old_key')).toBeNull()
      expect(localStorage.getItem('theme')).toBe('light')
      expect(localStorage.getItem('bolivar_wallet_v1')).toBe('{}')
    })
  })
})
