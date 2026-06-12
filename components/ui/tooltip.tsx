"use client"

import { useState, useEffect } from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 0,
  closeDelay = 500,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  const [open, setOpen] = useState(false)

  // Cerrar al hacer scroll o click fuera
  useEffect(() => {
    if (!open) return

    const handleClose = () => setOpen(false)

    window.addEventListener("scroll", handleClose, { passive: true })
    window.addEventListener("click", handleClose)
    window.addEventListener("touchstart", handleClose, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleClose)
      window.removeEventListener("click", handleClose)
      window.removeEventListener("touchstart", handleClose)
    }
  }, [open])

  return (
    <TooltipPrimitive.Root 
      data-slot="tooltip" 
      open={open}
      onOpenChange={setOpen}
      {...props} 
    />
  )
}

function TooltipTrigger({ className, onClick, ...props }: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger 
      data-slot="tooltip-trigger" 
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        // Prevenir que el listener global de click cierre el tooltip inmediatamente
        e.stopPropagation()
        onClick?.(e)
      }}
      {...props} 
    />
  )
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "side" | "sideOffset" | "align" | "alignOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        data-slot="tooltip-positioner"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "z-50 max-w-64 rounded-lg bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-xs bg-popover border-l border-t border-border/50 data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
}
