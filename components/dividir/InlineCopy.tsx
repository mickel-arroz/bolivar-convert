'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export function InlineCopy({ textToCopy, className }: { textToCopy: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className={cn("p-1.5 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10 shrink-0", className)}
      aria-label="Copiar valor"
      title="Copiar"
    >
      {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4 opacity-50 hover:opacity-100" />}
    </button>
  )
}
