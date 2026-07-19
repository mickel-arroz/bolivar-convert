import { Card, CardContent } from '@/components/ui/card'

const pulse = 'animate-pulse rounded bg-muted'

function MovementRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-3 py-2.5">
      <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className={`${pulse} h-3.5 w-28`} />
        <div className={`${pulse} h-3 w-44 max-w-[70%]`} />
      </div>
      <div className={`${pulse} h-4 w-16 shrink-0`} />
    </div>
  )
}

export function MovementListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <MovementRowSkeleton key={i} />
      ))}
    </div>
  )
}

export function ResumenSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className={`${pulse} h-3 w-28`} />
          <div className={`${pulse} h-8 w-40`} />
          <div className="flex gap-2">
            <div className={`${pulse} h-6 w-16 rounded-full`} />
            <div className={`${pulse} h-6 w-16 rounded-full`} />
            <div className={`${pulse} h-6 w-16 rounded-full`} />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex flex-col gap-2">
                  <div className={`${pulse} h-4 w-24`} />
                  <div className={`${pulse} h-3 w-16`} />
                </div>
              </div>
              <div className={`${pulse} h-7 w-28`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function EstadisticasSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-2">
              <div className={`${pulse} h-3 w-16`} />
              <div className={`${pulse} h-6 w-24`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex flex-col gap-4 py-2">
              <div className={`${pulse} h-4 w-40`} />
              <div className={`${pulse} h-56 w-full`} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
