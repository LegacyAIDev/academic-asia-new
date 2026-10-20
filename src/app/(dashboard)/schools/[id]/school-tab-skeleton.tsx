import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder shown while a school tab loads its data; header and tab bar stay in place. */
export function SchoolTabSkeleton() {
  return (
    <Card className="border-0 shadow-sm" aria-busy="true" aria-label="Loading">
      <CardHeader className="pb-4">
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
      </CardContent>
    </Card>
  )
}
