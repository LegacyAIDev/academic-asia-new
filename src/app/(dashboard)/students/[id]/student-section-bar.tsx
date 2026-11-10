import Link from "next/link"
import { cn } from "@/lib/utils"
import type { StudentSectionCounts } from "@/lib/supabase/queries/student-sections"
import { STUDENT_SECTIONS, type StudentSectionKey } from "./student-sections"

/**
 * The student's sections as one bar that stays at the top while scrolling,
 * each with how many records it holds, so where to go is never a guess.
 */
export function StudentSectionBar({ studentId, current, counts }: {
  studentId: string
  current: StudentSectionKey
  counts: StudentSectionCounts
}) {
  return (
    <nav aria-label="Student sections" className="sticky top-14 z-30 -mx-4 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {STUDENT_SECTIONS.map(section => {
          const count = section.key in counts ? counts[section.key as keyof StudentSectionCounts] : null
          const active = section.key === current
          return (
            <li key={section.key} className="shrink-0">
              <Link
                href={`/students/${studentId}?tab=${section.key}`}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                  active ? "border-brand-navy text-brand-navy" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {section.label}
                {count ? (
                  <span className={cn("rounded-full px-1.5 py-px text-xs tabular-nums", active ? "bg-brand-navy text-white" : "bg-muted text-muted-foreground")}>
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
