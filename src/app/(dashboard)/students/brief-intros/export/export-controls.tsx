'use client'

import { AlertTriangle } from 'lucide-react'
import { BriefIntroExportMenu } from '@/components/features/brief-intro-export-menu'

/**
 * Summary bar above the picker: what is selected, what will actually end up in
 * the file, and the export menu itself.
 *
 * Students without an introduction are called out here rather than after the
 * download. A booklet that comes back three pages shorter than expected reads
 * as data loss unless the reason was visible beforehand.
 */
export function ExportControls({
  selectedIds,
  exportableCount,
  pdfCap,
  excelCap,
}: {
  selectedIds: string[]
  exportableCount: number
  pdfCap: number
  excelCap: number
}) {
  const missing = selectedIds.length - exportableCount

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {selectedIds.length === 0
            ? 'No students selected'
            : `${selectedIds.length} student${selectedIds.length === 1 ? '' : 's'} selected`}
        </p>

        {missing > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {missing} of them {missing === 1 ? 'has' : 'have'} no introduction yet and will be
            left out — {exportableCount} will be exported.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Up to {pdfCap} students per PDF, {excelCap} per spreadsheet.
        </p>
      </div>

      <BriefIntroExportMenu
        studentIds={selectedIds}
        disabled={exportableCount === 0}
        variant="default"
      />
    </div>
  )
}
