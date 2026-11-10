import { Loader2 } from "lucide-react"

/** Shown in the page area while a page's data loads from the server; the sidebar and header stay put. */
export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-sm">Loading…</p>
    </div>
  )
}
