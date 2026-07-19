import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Skeleton del card de Comparativa (mismo layout que HistoryComparativa). */
export const ComparativaSkeleton = () => {
  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-0">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Comparativa
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex flex-col gap-2">
                <div className="w-20 h-4 bg-muted rounded animate-pulse" />
                <div className="w-12 h-3 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="w-16 h-4 bg-muted rounded animate-pulse" />
              <div className="w-10 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
