"use client"

import { memo, useMemo } from "react"
import { groupByInitial } from "@/lib/students/present-school-name"
import type { PresentSchoolListRow } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolRow } from "./present-school-row"

const anchorFor = (letter: string) => `schools-${letter === "#" ? "other" : letter}`

/**
 * The whole list as a register, A to Z: a large letter heading per section that
 * stays in view (below the app header) while its schools scroll past, and a bar
 * of the letters that have schools to jump straight to one.
 */
export const PresentSchoolsDirectory = memo(function PresentSchoolsDirectory({ schools, canManage }: { schools: PresentSchoolListRow[]; canManage: boolean }) {
  const groups = useMemo(() => groupByInitial(schools), [schools])

  return (
    <div className="space-y-3">
      {/* Wraps on a wide screen; one scrollable row on a phone. */}
      <nav aria-label="Jump to a letter" className="flex gap-0.5 overflow-x-auto sm:flex-wrap sm:overflow-visible">
        {groups.map(({ letter }) => (
          <a key={letter} href={`#${anchorFor(letter)}`}
            aria-label={letter === "#" ? "Other" : undefined}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {letter}
          </a>
        ))}
      </nav>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">School</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
        </div>
        {groups.map(({ letter, schools: inGroup }) => (
          <section key={letter} id={anchorFor(letter)} className="scroll-mt-16">
            <header className="sticky top-16 z-10 flex items-baseline justify-between border-b border-border bg-card px-4 pb-2 pt-4">
              <h2 aria-label={letter === "#" ? "Other" : undefined} className="text-xl font-semibold leading-none tracking-tight">{letter}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {inGroup.length.toLocaleString("en-GB")} {inGroup.length === 1 ? "school" : "schools"}
              </p>
            </header>
            <ul role="list" className="divide-y divide-border">
              {inGroup.map((school) => <PresentSchoolRow key={school.id} school={school} canManage={canManage} />)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
})
