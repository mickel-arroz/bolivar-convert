'use client'

import {
  Children,
  KeyboardEvent,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { cn } from '@/lib/utils'
import { normalizeForSearch } from '@/lib/wallet/shoppingSearch'
import { useIsCompactScreen } from '@/hooks/useMediaQuery'
import { ChevronDownIcon, CheckIcon, SearchIcon } from '@/components/icons'

const Select = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

interface SelectSearchContextValue {
  query: string
  /** Texto de cada opción, leído del DOM la primera vez que se monta (con la búsqueda vacía). */
  texts: Map<unknown, string>
}

const SelectSearchContext = createContext<SelectSearchContextValue | null>(null)

const ITEM_SELECTOR = '[data-slot="select-item"]'

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-ring disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 [&>span]:truncate',
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
        <ChevronDownIcon className="size-4" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/**
 * Buscador al inicio de la lista. Las flechas pasan a la lista de base-ui (que mueve el
 * foco a las opciones y elige con Enter); Enter desde aquí elige la primera coincidencia.
 */
function SelectSearch({
  query,
  onQueryChange,
  popupRef,
}: {
  query: string
  onQueryChange: (q: string) => void
  popupRef: React.RefObject<HTMLDivElement | null>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const compact = useIsCompactScreen()

  // Al abrir, base-ui enfoca la opción elegida; el buscador toma el foco justo después.
  // En móviles y tablets no, para no abrir el teclado sin que el usuario lo pida.
  useEffect(() => {
    if (compact) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [compact])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Escape' || e.key === 'Tab') return
    e.stopPropagation()
    if (e.key !== 'Enter') return
    e.preventDefault()
    const first = popupRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)
    if (!first) return
    first.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
    first.click()
  }

  return (
    <div className="sticky top-0 z-10 -mx-1 -mt-1 mb-1 border-b border-border/60 bg-popover p-1">
      <div className="relative">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          data-slot="select-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar…"
          aria-label="Buscar opciones"
          autoComplete="off"
          className="h-8 w-full rounded-md bg-muted/50 pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        />
      </div>
    </div>
  )
}

/** Vive solo mientras la lista está abierta: al reabrirla la búsqueda arranca vacía. */
function SelectPopupBody({
  children,
  popupRef,
}: {
  children: ReactNode
  popupRef: React.RefObject<HTMLDivElement | null>
}) {
  const [query, setQuery] = useState('')
  const [empty, setEmpty] = useState(false)
  const [texts] = useState(() => new Map<unknown, string>())
  const search = useMemo(() => ({ query, texts }), [query, texts])

  useLayoutEffect(() => {
    setEmpty(!!query.trim() && !popupRef.current?.querySelector(ITEM_SELECTOR))
  }, [query, popupRef])

  return (
    <>
      <SelectSearch query={query} onQueryChange={setQuery} popupRef={popupRef} />
      <SelectSearchContext.Provider value={search}>{children}</SelectSearchContext.Provider>
      {empty && (
        <p className="break-words px-2.5 py-3 text-center text-xs text-muted-foreground">
          Sin resultados para «{query.trim()}»
        </p>
      )}
    </>
  )
}

// Una tecla imprimible sobre una opción vuelve al buscador en vez de saltar por la
// primera letra; la flecha arriba desde la primera opción también regresa.
function redirectToSearch(e: KeyboardEvent<HTMLDivElement>) {
  const popup = e.currentTarget
  const input = popup.querySelector<HTMLInputElement>('[data-slot="select-search"]')
  if (!input || e.target === input) return
  const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' '
  const backFromFirst = e.key === 'ArrowUp' && e.target === popup.querySelector(ITEM_SELECTOR)
  if (!printable && !backFromFirst) return
  e.stopPropagation()
  if (backFromFirst) e.preventDefault()
  input.focus()
}

function SelectContent({ className, children, ...props }: SelectPrimitive.Popup.Props) {
  const popupRef = useRef<HTMLDivElement>(null)

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        className="z-50 outline-none"
        sideOffset={6}
        alignItemWithTrigger={false}
      >
        <SelectPrimitive.Popup
          ref={popupRef}
          data-slot="select-content"
          onKeyDownCapture={redirectToSearch}
          className={cn(
            'max-h-(--available-height) w-(--anchor-width) min-w-36 max-w-(--available-width) origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-xl bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className
          )}
          {...props}
        >
          <SelectPopupBody popupRef={popupRef}>{children as ReactNode}</SelectPopupBody>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

/** Los textos sueltos van en un span que se corta con «…» en vez de desbordar la lista. */
function truncatable(children: ReactNode): ReactNode {
  return Children.map(children, (child) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <span className="min-w-0 truncate">{child}</span>
    ) : (
      child
    )
  )
}

function SelectItem({ className, children, value, label, ...props }: SelectPrimitive.Item.Props) {
  const search = useContext(SelectSearchContext)
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!search || label || search.query.trim()) return
    search.texts.set(value, ref.current?.textContent ?? '')
  })

  if (search) {
    const q = normalizeForSearch(search.query.trim())
    const text = label ?? search.texts.get(value)
    if (q && text !== undefined && !normalizeForSearch(text).includes(q)) return null
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      data-slot="select-item"
      value={value}
      label={label}
      className={cn(
        'relative flex min-w-0 cursor-default items-center gap-2 rounded-md py-1.5 pl-2.5 pr-8 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {truncatable(children as ReactNode)}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center">
        <CheckIcon className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn('not-has-[[data-slot=select-item]]:hidden', className)}
      {...props}
    />
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn('truncate px-2.5 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground', className)}
      {...props}
    />
  )
}

export { Select, SelectValue, SelectGroup, SelectLabel, SelectTrigger, SelectContent, SelectItem }
