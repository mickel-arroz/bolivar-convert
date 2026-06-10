import { Card, CardContent } from "@/components/ui/card"

export const RateDifferenceSkeleton = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto bg-linear-to-b from-card to-card/50 border-border/50 shadow-xs">
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 w-full md:w-auto">
            <div className="p-2.5 rounded-xl bg-muted w-10 h-10 animate-pulse shrink-0" />
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="w-24 h-3 bg-muted rounded animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="w-28 h-8 bg-muted rounded-lg animate-pulse" />
                <div className="w-4 h-4 bg-muted/50 rounded-full shrink-0" />
                <div className="w-28 h-8 bg-muted rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
          <div className="bg-secondary/30 rounded-2xl px-6 py-3 border border-border/40 w-full md:w-auto min-h-16 flex flex-col items-center justify-center gap-2">
             <div className="w-24 h-5 bg-muted rounded animate-pulse" />
             <div className="w-32 h-3 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
