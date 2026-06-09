import { ComponentType, ComponentProps } from 'react'

export interface HistoryEntry {
  date: string
  [key: string]: number | string | null | undefined
}

export type TimeRange = '7d' | '30d' | '1y' | 'all'

export interface RateMetadata {
  label: string
  color: string
  icon: ComponentType<ComponentProps<'svg'>>
  sub: string
}
