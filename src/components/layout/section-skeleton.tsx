import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/** Placeholder while a record's open tab or section loads its data; the header and tab bar stay in place. */
export function SectionSkeleton() {
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
