import Link from "next/link"
import {
  Banknote, Building2, CalendarDays, CalendarSearch, ChevronDown, ClipboardCheck, Contact, Files,
  GraduationCap, Landmark, StickyNote, Trophy,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { SCHOOL_TABS, isMoreTab, schoolTabHref, schoolTabLabel, type SchoolTabKey } from "@/lib/schools/school-tabs"

const TAB_ICONS: Record<SchoolTabKey, React.ElementType> = {
  basic: Building2,
  "entrance-exams": ClipboardCheck,
  fees: Banknote,
  "academic-results": Trophy,
  contacts: Contact,
  events: CalendarDays,
  notes: StickyNote,
  documents: Files,
  courses: GraduationCap,
  "bank-details": Landmark,
  visits: CalendarSearch,
}

/** Only these counts are worth a query on every view; the rest show inside their tab. */
export type SchoolTabCounts = Partial<Record<SchoolTabKey, number>>

const itemClass =
  "inline-flex h-[calc(100%-1px)] items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2.5 py-1 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
const activeClass = "bg-background text-foreground shadow-sm"

function CountBadge({ count }: { count: number | undefined }) {
  if (count == null) return null
  return <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-xs">{count}</Badge>
}

/**
 * Tab bar of the school page. Each tab is a plain link, so the server loads
 * only the open tab's data; the three rarely used tabs sit in a "More" menu
 * that names the open one when it is selected.
 */
export function SchoolTabNav({ schoolId, current, counts }: { schoolId: string; current: SchoolTabKey; counts: SchoolTabCounts }) {
  const main = SCHOOL_TABS.filter(tab => tab.group === "main")
  const more = SCHOOL_TABS.filter(tab => tab.group === "more")
  const moreOpen = isMoreTab(current)

  return (
    <div className="-mx-1 overflow-x-auto px-1 scrollbar-hide">
      <nav aria-label="School sections" className="inline-flex h-9 w-max items-center rounded-lg bg-muted/50 p-[3px] text-muted-foreground">
        {main.map(tab => {
          const Icon = TAB_ICONS[tab.key]
          const active = tab.key === current
          return (
            <Link key={tab.key} href={schoolTabHref(schoolId, tab.key)} scroll={false}
              aria-current={active ? "page" : undefined} className={cn(itemClass, active && activeClass)}>
              <Icon className="h-4 w-4" />
              {tab.label}
              <CountBadge count={counts[tab.key]} />
            </Link>
          )
        })}
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(itemClass, moreOpen && activeClass)}>
            {moreOpen ? `More: ${schoolTabLabel(current)}` : "More"}
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {more.map(tab => {
              const Icon = TAB_ICONS[tab.key]
              return (
                <DropdownMenuItem key={tab.key} asChild>
                  <Link href={schoolTabHref(schoolId, tab.key)} scroll={false}
                    aria-current={tab.key === current ? "page" : undefined} className="gap-2">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    <span className="ml-auto pl-4 text-xs tabular-nums text-muted-foreground">{counts[tab.key] ?? ""}</span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  )
}
