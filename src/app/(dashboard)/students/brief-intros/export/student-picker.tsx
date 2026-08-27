'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Check, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type PickerStudent = {
  id: string
  name: string
  code: string | null
  hasIntro: boolean
}

/**
 * Student selection for the bulk export.
 *
 * The selection lives in the URL rather than in component state, so it survives
 * a refresh, can be shared as a link, and — the reason that actually matters —
 * is not silently discarded when the consultant changes a filter or pages
 * through the list to find the next student.
 */
export function StudentPicker({
  students,
  selectedIds,
  cap,
}: {
  students: PickerStudent[]
  selectedIds: string[]
  cap: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selected = new Set(selectedIds)

  const commit = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString())
      if (ids.length === 0) params.delete('ids')
      else params.set('ids', ids.join(','))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  const atCap = selectedIds.length >= cap

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else if (atCap) return // The cap is real, so refuse rather than warn and allow.
    else next.add(id)
    commit([...next])
  }

  // Only students on the current page are added or removed, so paging through a
  // filter builds a selection up rather than replacing it.
  const pageIds = students.map((s) => s.id)
  const pageSelectedCount = pageIds.filter((id) => selected.has(id)).length
  const allOnPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length

  const togglePage = () => {
    const next = new Set(selected)
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id))
    } else {
      // Fill up to the cap and stop, rather than overshooting into a selection
      // the server will reject.
      for (const id of pageIds) {
        if (next.size >= cap) break
        next.add(id)
      }
    }
    commit([...next])
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={togglePage} disabled={students.length === 0}>
          {allOnPageSelected ? 'Clear this page' : 'Select this page'}
        </Button>
        {selectedIds.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => commit([])}>
            Clear all {selectedIds.length}
          </Button>
        )}
        {atCap && (
          <p className="text-xs text-amber-700">
            At the {cap} student limit — remove one before adding another.
          </p>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={togglePage}
                  aria-label="Select every student on this page"
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="w-36">Code</TableHead>
              <TableHead className="w-44">Introduction</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No students match these filters.
                </TableCell>
              </TableRow>
            )}
            {students.map((student) => (
              <TableRow key={student.id} data-state={selected.has(student.id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(student.id)}
                    onCheckedChange={() => toggle(student.id)}
                    disabled={atCap && !selected.has(student.id)}
                    aria-label={`Select ${student.name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/students/${student.id}`} className="hover:underline">
                    {student.name}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {student.code ?? '—'}
                </TableCell>
                <TableCell>
                  {student.hasIntro ? (
                    <Badge
                      variant="outline"
                      className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                    >
                      <Check className="h-3 w-3" /> Written
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <Minus className="h-3 w-3" /> Not written
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
