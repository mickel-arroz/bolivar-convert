'use client'

import Link from 'next/link'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVerticalIcon } from '@/components/icons'
import { NAV_ITEMS } from '@/constants/site'
import { cn } from '@/lib/utils'

type NavItem = (typeof NAV_ITEMS)[number]

interface SortableNavListProps {
  items: NavItem[]
  pathname: string
  reorder: (activeHref: string, overHref: string) => void
  onNavigate: () => void
}

function SortableNavRow({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem
  isActive: boolean
  onNavigate: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.href,
  })

  // El propio elemento se mueve con un transform relativo (no usamos DragOverlay para
  // evitar el desfase de position:fixed dentro del Sheet con backdrop-blur/transform).
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex items-center rounded-xl transition-colors',
        isActive ? 'bg-primary/10' : 'bg-muted/30 hover:bg-muted/50',
        // Elevación clara del elemento mientras se arrastra
        isDragging && 'shadow-2xl ring-2 ring-primary/40 scale-[1.02] cursor-grabbing'
      )}
    >
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex flex-1 items-center gap-4 p-5 rounded-l-xl transition-transform active:scale-95',
          isActive ? 'text-primary' : 'text-foreground'
        )}
      >
        <div className="w-6 h-6 flex items-center justify-center opacity-70">{item.icon}</div>
        <span className="text-lg font-bold">{item.label}</span>
      </Link>
      <button
        type="button"
        aria-label={`Reordenar ${item.label}`}
        className="flex items-center justify-center p-5 text-muted-foreground/50 hover:text-foreground transition-colors touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-r-xl"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="w-5 h-5" />
      </button>
    </div>
  )
}

export function SortableNavList({ items, pathname, reorder, onNavigate }: SortableNavListProps) {
  const sensors = useSensors(
    // Long-press: el arrastre se activa al dejar presionado ~200ms sobre el handle.
    useSensor(PointerSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorder(String(active.id), String(over.id))
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.href)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <SortableNavRow
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
