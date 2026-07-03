'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  AlertIcon,
  DownloadIcon,
  TransferIcon,
  UploadIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'
import {
  applyImport,
  buildExportFilename,
  collectLocalStorage,
  parseImport,
  serializeExport,
  type StorageSnapshot,
} from '@/lib/dataTransfer'

interface DataTransferDialogProps {
  variant?: 'footer' | 'menu'
}

export function DataTransferDialog({
  variant = 'footer',
}: DataTransferDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<StorageSnapshot | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleExport() {
    setError(null)
    const snapshot = collectLocalStorage()
    const blob = new Blob([serializeExport(snapshot)], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = buildExportFilename()
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = event.target.files?.[0]
    // Permitir reseleccionar el mismo archivo más adelante.
    event.target.value = ''
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setError('Solo se aceptan archivos .txt')
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setError('No se pudo leer el archivo.')
      return
    }

    const result = parseImport(text)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setPending(result.data)
    setPendingCount(result.keyCount)
    setConfirmOpen(true)
  }

  function handleConfirmImport() {
    if (!pending) return
    applyImport(pending)
    // Los hooks solo leen localStorage al montar: recargar para re-hidratar.
    window.location.reload()
  }

  const triggerClassName =
    variant === 'footer'
      ? 'inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 font-medium underline underline-offset-4 decoration-border/50 hover:text-muted-foreground hover:decoration-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded'
      : 'flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-muted-foreground/90 hover:text-foreground hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button type="button" className={triggerClassName}>
              <TransferIcon className={cn(variant === 'menu' ? 'w-5 h-5' : 'w-3.5 h-3.5')} />
              Transferencia de datos
            </button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferencia de datos</DialogTitle>
            <DialogDescription>
              Exporta tus datos para llevarlos a otro dispositivo, o importa un
              archivo previamente exportado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="justify-start h-auto py-3 whitespace-normal"
              onClick={handleExport}
            >
              <DownloadIcon className="size-5 shrink-0 text-primary" />
              <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="font-bold">Exportar datos</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Descarga un archivo .txt con tu información guardada.
                </span>
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="justify-start h-auto py-3 whitespace-normal"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="size-5 shrink-0 text-primary" />
              <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                <span className="font-bold">Importar datos</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Carga un archivo .txt y reemplaza tus datos actuales.
                </span>
              </span>
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={handleFileChange}
            />

            {error && (
              <p className="flex items-start gap-2 text-sm text-destructive">
                <AlertIcon className="size-4 mt-0.5 shrink-0" />
                {error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar tus datos actuales?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán <strong>todos los datos guardados</strong> en este
              dispositivo y se reemplazarán por los {pendingCount} elementos del
              archivo. Esta acción no se puede deshacer. La página se recargará
              al terminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>
              Importar y reemplazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
