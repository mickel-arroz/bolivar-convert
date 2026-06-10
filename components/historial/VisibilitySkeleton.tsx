import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const VisibilitySkeleton = () => {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Visibilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 h-14 w-full p-2 rounded-md border border-border/50">
            <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex flex-col gap-2 w-full">
              <div className="w-24 h-4 bg-muted rounded animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
