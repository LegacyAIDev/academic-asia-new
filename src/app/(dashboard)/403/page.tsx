import Link from "next/link"
import { ShieldOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

/**
 * Shown when a signed-in user reaches a module they have no access to.
 * Lives inside the dashboard group so they keep the sidebar and can navigate
 * somewhere they are allowed, rather than hitting a dead end.
 */
export default function ForbiddenPage() {
  return (
    <div className="flex items-center justify-center py-16">
      <Card className="max-w-md border-0 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-muted p-3">
            <ShieldOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">No access to this section</h1>
            <p className="text-sm text-muted-foreground">
              Your account does not have permission to view this page. Ask an
              administrator if you need it.
            </p>
          </div>
          <Button asChild variant="secondary" className="mt-2">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
