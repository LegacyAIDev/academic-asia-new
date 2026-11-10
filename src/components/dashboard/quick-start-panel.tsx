import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronRight } from "lucide-react"
import { DashboardPanel } from "./dashboard-panel"

export type QuickStart = { label: string; description: string; href: string; icon: LucideIcon }

/** Where to begin common jobs, for people who have not learned the menu yet. */
export function QuickStartPanel({ actions }: { actions: QuickStart[] }) {
  if (actions.length === 0) return null
  return (
    <DashboardPanel title="Start something">
      <ul className="-mx-2 space-y-1">
        {actions.map(({ label, description, href, icon: Icon }) => (
          <li key={label}>
            <Link href={href} className="group flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gold/15 text-brand-navy">
                <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  )
}
