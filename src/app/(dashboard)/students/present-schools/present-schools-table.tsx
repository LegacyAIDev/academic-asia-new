"use client"

import { useMemo, useState } from "react"
import { Plus, School, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { filterPresentSchools, indexPresentSchools, type PresentSchoolSource } from "@/lib/students/present-school-name"
import type { PresentSchoolListRow } from "@/lib/supabase/queries/present-schools"
import { PresentSchoolDialog } from "./present-school-dialog"
import { PresentSchoolRow } from "./present-school-row"

const PAGE = 100

type SourceFilter = "all" | PresentSchoolSource

/**
 * Every school on the list, searched the same way as the student form's picker
 * so both find the same schools for the same text. The whole list is in the
 * browser (about 1,200 rows), shown 100 at a time.
 */
export function PresentSchoolsTable({ schools, canManage }: { schools: PresentSchoolListRow[]; canManage: boolean }) {
  const [query, setQuery] = useState("")
  const [source, setSource] = useState<SourceFilter>("all")
  const [shown, setShown] = useState(PAGE)

  const index = useMemo(() => indexPresentSchools(schools), [schools])
  const fromSource = useMemo(
    () => (source === "all" ? index : index.filter((e) => e.school.source === source)),
    [index, source]
  )
  const { matches, more, total } = useMemo(() => filterPresentSchools(fromSource, query, shown), [fromSource, query, shown])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-2 shadow-sm sm:p-3">
        <div className="relative min-w-0 flex-1 basis-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }}
            placeholder="Search by name or short form"
            aria-label="Search schools"
            className="h-9 pl-9"
          />
        </div>
        <Select value={source} onValueChange={(value) => { setSource(value as SourceFilter); setShown(PAGE) }}>
          <SelectTrigger className="h-9 w-[170px] rounded-full text-xs" aria-label="Where the school came from">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All schools</SelectItem>
            <SelectItem value="hk_list">Hong Kong list</SelectItem>
            <SelectItem value="staff">Added by staff</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {more && `Showing ${matches.length.toLocaleString("en-GB")} of `}
          {total.toLocaleString("en-GB")} {total === 1 ? "school" : "schools"}
        </p>
        {canManage && (
          <div className="ml-auto">
            <PresentSchoolDialog mode="create" defaultName={query} />
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <School className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-semibold">{query ? `No school matches “${query.trim()}”` : "No schools here yet"}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canManage ? "Check the spelling, or add the school so everyone can pick it." : "Check the spelling or try another filter."}
            </p>
          </div>
          {canManage && query.trim() && (
            <PresentSchoolDialog mode="create" defaultName={query} trigger={
              <Button size="sm" className="h-9 gap-2"><Plus className="h-4 w-4" /> Add this school</Button>
            } />
          )}
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">School</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Students</p>
          </header>
          <ul className="divide-y divide-border">
            {matches.map((school) => (
              <PresentSchoolRow key={school.id} school={school} canManage={canManage} />
            ))}
          </ul>
        </section>
      )}

      {more && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" className="h-9" onClick={() => setShown((n) => n + PAGE)}>
            Show more
          </Button>
        </div>
      )}
    </div>
  )
}
