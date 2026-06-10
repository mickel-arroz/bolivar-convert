import { Card, CardContent, CardHeader } from "@/components/ui/card"

export const RateCardSkeleton = () => {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-linear-to-b from-card to-card/50">
      <div className="absolute top-0 left-0 w-full h-1 bg-muted"></div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse shrink-0" />
      </CardHeader>
      <CardContent>
        <div className="mt-2">
          <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="mt-4">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )
}
