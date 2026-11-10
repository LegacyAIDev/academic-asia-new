import Link from "next/link"
import { CheckCircle2, ChevronRight } from "lucide-react"
import type { AttentionItem, AttentionTone } from "@/lib/dashboard/attention"
import { cn } from "@/lib/utils"
import { DashboardPanel } from "./dashboard-panel"

const TONE: Record<AttentionTone, string> = {
  urgent: "bg-red-50 text-red-700 ring-red-200",
  due: "bg-amber-50 text-amber-800 ring-amber-200",
  info: "bg-slate-100 text-slate-700 ring-slate-200",
}

/** The first thing on the dashboard: what is waiting for the person signed in. */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <DashboardPanel title="Needs your attention" className="lg:col-span-2">
      {items.length === 0 ? (
        <div className="flex flex-1 items-center gap-4 rounded-lg bg-emerald-50/70 px-5 py-6">
          <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-emerald-900">You&apos;re all caught up</p>
            <p className="mt-0.5 text-sm text-emerald-800/80">No overdue tasks and no exams waiting to be confirmed.</p>
          </div>
        </div>
      ) : (
        <ul className="-mx-2 divide-y">
          {items.map(item => (
            <li key={item.key}>
              <Link href={item.href} className="group flex items-center gap-4 rounded-lg px-2 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold tabular-nums ring-1 ring-inset", TONE[item.tone])}>
                  {item.count}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{item.label}</span>
                  <span className="block text-sm text-muted-foreground">{item.detail}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
