'use client'

import { Switch } from '@/components/ui/switch'

export function ToggleRow({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-5 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm">
      <div className="flex flex-col gap-0.5 flex-1">
        <label htmlFor={id} className="text-sm font-bold cursor-pointer select-none leading-snug">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
