import Link from "next/link"
import { Check, ChevronRight } from "lucide-react"
import type { AttentionItem, AttentionTone } from "@/lib/dashboard/attention"
import { cn } from "@/lib/utils"
import { DashboardPanel } from "./dashboard-panel"

/** Red for what is late, gold for what waits on us, grey for what is merely coming. */
const TONE: Record<AttentionTone, string> = {
  urgent: "bg-red-600",
  due: "bg-brand-gold",
  info: "bg-slate-300",
}

/** The first thing on the dashboard: what is waiting for the person signed in. */
export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <DashboardPanel title="Needs you today" flush>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Check className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="font-medium">Nothing is waiting for you</p>
            <p className="text-sm text-muted-foreground">No overdue tasks and no exams to confirm.</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y">
          {items.map(item => (
            <li key={item.key}>
              <Link href={item.href} className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE[item.tone])} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground group-hover:text-brand-navy">{item.label}</span>
                  <span className="block text-sm text-muted-foreground">{item.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
