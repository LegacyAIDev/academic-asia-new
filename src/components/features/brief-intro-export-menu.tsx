'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadBriefIntroExport, type ExportFormat } from '@/lib/brief-intro/download-export'

/**
 * Export menu for Brief Introductions, shared by the student profile card and
 * the bulk picker. The profile passes a single id; the picker passes the
 * selection. Neither needs to know which route serves which format.
 *
 * Errors render beside the button rather than throwing: a failed download is a
 * routine outcome here (nothing selected, no introduction written yet) and the
 * message from the route is the useful part.
 */
export function BriefIntroExportMenu({
  studentIds,
  disabled = false,
  size = 'sm',
  variant = 'outline',
  align = 'end',
}: {
  studentIds: string[]
  disabled?: boolean
  size?: 'sm' | 'default'
  variant?: 'outline' | 'default' | 'ghost'
  align?: 'start' | 'end'
}) {
  const [downloading, setDownloading] = useState<ExportFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (format: ExportFormat) => {
    setDownloading(format)
    setError(null)
    try {
      await downloadBriefIntroExport(format, studentIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the file')
    } finally {
      setDownloading(null)
    }
  }

  const busy = downloading !== null

  return (
    <div className="flex flex-col items-end gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={disabled || busy} className="gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {busy ? 'Preparing…' : 'Export'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuItem onClick={() => run('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run('xlsx')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Download Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
