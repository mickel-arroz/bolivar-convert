'use client'

import { ComponentProps } from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { cn } from '@/lib/utils'
import { useBackDismissProps } from '@/hooks/useBackToClose'
import { Button } from '@/components/ui/button'

function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  const backDismiss = useBackDismissProps(props)
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} {...backDismiss} />
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: AlertDialogPrimitive.Portal.Props) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-[6px] transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0',
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          'fixed inset-0 z-50 m-auto h-fit w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-card ring-1 ring-border/70 p-6 shadow-[0_24px_64px_-16px_rgb(0_0_0/0.5)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:translate-y-2 data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:translate-y-4 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
          'max-lg:flex max-lg:flex-col max-lg:justify-center max-lg:overflow-y-auto max-lg:h-dvh! max-lg:max-h-dvh! max-lg:w-screen! max-lg:max-w-[100vw]! max-lg:rounded-none! max-lg:border-0! max-lg:shadow-none max-lg:ring-0 max-lg:data-starting-style:translate-y-12 max-lg:data-starting-style:scale-100 max-lg:data-ending-style:scale-100',
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn('mb-6 flex flex-col gap-1', className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end gap-2', className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn('text-xl font-black leading-tight tracking-tight text-foreground', className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn('text-sm leading-relaxed text-muted-foreground', className)}
      {...props}
    />
  )
}

function AlertDialogAction({ className, ...props }: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-action"
      render={<Button variant="destructive" className={cn(className)} />}
      {...props}
    />
  )
}

function AlertDialogCancel({ className, ...props }: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      render={<Button variant="outline" className={cn(className)} />}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
