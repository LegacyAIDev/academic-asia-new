'use client'

import Link from 'next/link'
import { X, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSchoolSelection } from '@/lib/schools/use-school-selection'

/** Matches MAX_EXPORT_SCHOOLS in the export query; above this it stops being a comparison. */
const MAX_SCHOOLS = 30
/** Comparing one school against nothing is not a comparison. */
const MIN_SCHOOLS = 2

/**
 * Sticky bar summarising the shortlist.
 *
 * Lists the selected schools by name rather than just a count, because a
 * consultant building a shortlist across several pages of results otherwise has
 * no way to see what is already in it — including schools the current filter has
 * hidden.
 */
export function SchoolSelectionToolbar() {
  const { selected, count, remove, clear } = useSchoolSelection()

  if (count === 0) return null

  const tooFew = count < MIN_SCHOOLS
  const tooMany = count > MAX_SCHOOLS
  const canExport = !tooFew && !tooMany

  const reason = tooFew
    ? `Select at least ${MIN_SCHOOLS} schools to compare`
    : tooMany
      ? `Too many to compare — remove ${count - MAX_SCHOOLS} to get to ${MAX_SCHOOLS}`
      : null

  const exportHref = `/schools/export?ids=${selected.map((s) => s.id).join(',')}`

  return (
    <div className="sticky bottom-0 z-20 border-t bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="shrink-0">
          {count} selected
        </Badge>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.map((school) => (
            <span
              key={school.id}
              className="inline-flex max-w-[16rem] items-center gap-1 rounded-md border bg-muted/40 py-0.5 pl-2 pr-1 text-xs"
            >
              <span className="truncate">{school.name}</span>
              <button
                type="button"
                onClick={() => remove(school.id)}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${school.name} from the shortlist`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {reason && <span className="text-xs text-muted-foreground">{reason}</span>}
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          {canExport ? (
            <Button size="sm" asChild>
              <Link href={exportHref}>
                <FileText className="mr-1.5 h-4 w-4" />
                Compare {count} schools
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled>
              <FileText className="mr-1.5 h-4 w-4" />
              Compare {count} schools
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
