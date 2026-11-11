import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SCHOOL_TABS, isMoreTab, schoolTabHref, schoolTabLabel, type SchoolTabKey } from "@/lib/schools/school-tabs"
import type { SchoolSectionCounts } from "@/lib/supabase/queries/school-sections"

export type SchoolTabCounts = SchoolSectionCounts

const tabClass = (active: boolean) =>
  cn(
    "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
    active ? "border-brand-navy text-brand-navy" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
  )

function Count({ count, active }: { count: number | null | undefined; active: boolean }) {
  if (!count) return null
  return <span className={cn("rounded-full px-1.5 py-px text-xs tabular-nums", active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground")}>{count}</span>
}

/**
 * The school's sections as one bar that stays in view, each with how many
 * records it holds. The three rarely used ones sit under "More", which names
 * and underlines the one that is open.
 */
export function SchoolTabNav({ schoolId, current, counts }: { schoolId: string; current: SchoolTabKey; counts: SchoolTabCounts }) {
  const main = SCHOOL_TABS.filter(tab => tab.group === "main")
  const more = SCHOOL_TABS.filter(tab => tab.group === "more")
  const moreOpen = isMoreTab(current)
  const moreTotal = more.reduce((sum, tab) => sum + (counts[tab.key] ?? 0), 0)

  return (
    <nav aria-label="School sections" className="sticky top-14 z-30 -mx-4 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <ul className="flex gap-1 overflow-x-auto">
        {main.map(tab => {
          const active = tab.key === current
          return (
            <li key={tab.key} className="shrink-0">
              <Link href={schoolTabHref(schoolId, tab.key)} scroll={false} aria-current={active ? "page" : undefined} className={tabClass(active)}>
                {tab.label}
                <Count count={counts[tab.key]} active={active} />
              </Link>
            </li>
          )
        })}
        <li className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger className={tabClass(moreOpen)} aria-current={moreOpen ? "page" : undefined}>
              {moreOpen ? schoolTabLabel(current) : "More"}
              {!moreOpen && <Count count={moreTotal} active={false} />}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {more.map(tab => (
                <DropdownMenuItem key={tab.key} asChild>
                  <Link href={schoolTabHref(schoolId, tab.key)} scroll={false} aria-current={tab.key === current ? "page" : undefined}>
                    {tab.label}
                    <span className="ml-auto pl-4 text-xs tabular-nums text-muted-foreground">{counts[tab.key] || ""}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </li>
      </ul>
    </nav>
  )
}
