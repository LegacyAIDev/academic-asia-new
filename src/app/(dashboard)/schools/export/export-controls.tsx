'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Download, Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * On-screen controls. Carries `no-print` so none of it reaches the paper.
 *
 * The layout choice lives in the URL rather than component state so a consultant
 * can send a colleague the exact sheet they are looking at.
 */
export function ExportControls({
  layout,
  schoolCount,
  matrixDisabledReason,
  schoolIds,
  studentName,
}: {
  layout: 'stacked' | 'matrix'
  schoolCount: number
  matrixDisabledReason: string | null
  schoolIds: string[]
  studentName: string | null
}) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * The PDF is generated server-side rather than through the print dialog: it
   * produces a real file to email, and it is the only route that can number the
   * pages, which Chrome cannot do from CSS.
   */
  const downloadPdf = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      const response = await fetch('/api/schools/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: schoolIds, layout, student: studentName }),
      })

      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }))
        throw new Error(error ?? 'Could not generate the PDF')
      }

      const blob = await response.blob()
      const filename =
        response.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
        'selected-schools.pdf'

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Could not generate the PDF')
    } finally {
      setDownloading(false)
    }
  }

  const setLayout = (next: 'stacked' | 'matrix') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('layout', next)
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="no-print mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-3 print:hidden">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/schools">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to schools
        </Link>
      </Button>

      <div className="flex items-center gap-1 rounded-md border p-0.5">
        <Button
          variant={layout === 'stacked' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setLayout('stacked')}
        >
          Stacked profiles
        </Button>
        <Button
          variant={layout === 'matrix' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setLayout('matrix')}
          disabled={matrixDisabledReason !== null}
          title={matrixDisabledReason ?? undefined}
        >
          Comparison matrix
        </Button>
      </div>

      {matrixDisabledReason && (
        <span className="text-xs text-muted-foreground">{matrixDisabledReason}</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {schoolCount} {schoolCount === 1 ? 'school' : 'schools'} &middot;{' '}
          {layout === 'matrix' ? 'A4 landscape' : 'A4 portrait'}
        </span>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" />
          Print
        </Button>
        <Button size="sm" onClick={downloadPdf} disabled={downloading}>
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          {downloading ? 'Preparing…' : 'Download PDF'}
        </Button>
      </div>

      {downloadError && (
        <p className="w-full text-xs text-destructive" role="alert">
          {downloadError}
        </p>
      )}
    </div>
  )
}
