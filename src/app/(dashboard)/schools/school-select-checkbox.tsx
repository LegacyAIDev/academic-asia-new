'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { useSchoolSelection, type SelectedSchool } from '@/lib/schools/use-school-selection'

/**
 * Row checkbox. Kept as a leaf client component so the surrounding table row can
 * stay server-rendered.
 */
export function SchoolSelectCheckbox({ school }: { school: SelectedSchool }) {
  const { isSelected, toggle } = useSchoolSelection()

  return (
    <Checkbox
      checked={isSelected(school.id)}
      onCheckedChange={() => toggle(school)}
      aria-label={`Select ${school.name} for export`}
      // The row links through to the school; ticking the box should not navigate.
      onClick={(e) => e.stopPropagation()}
    />
  )
}

/**
 * Header checkbox, scoped to the schools currently on screen.
 *
 * Deliberately not "select all 707" — the label says so explicitly, because a
 * header checkbox above a paginated table is otherwise ambiguous and the export
 * caps out at 30 anyway.
 */
export function SchoolSelectAllCheckbox({ pageSchools }: { pageSchools: SelectedSchool[] }) {
  const { isSelected, setMany } = useSchoolSelection()

  const selectedOnPage = pageSchools.filter((s) => isSelected(s.id)).length
  const allSelected = pageSchools.length > 0 && selectedOnPage === pageSchools.length
  const someSelected = selectedOnPage > 0 && !allSelected

  return (
    <Checkbox
      checked={allSelected ? true : someSelected ? 'indeterminate' : false}
      onCheckedChange={() => setMany(pageSchools, !allSelected)}
      aria-label={
        allSelected ? 'Deselect all schools on this page' : 'Select all schools on this page'
      }
      disabled={pageSchools.length === 0}
    />
  )
}
