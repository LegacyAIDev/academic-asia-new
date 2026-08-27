/**
 * Client-side download for the Brief Introduction export.
 *
 * Both entry points — the button on a student's profile and the bulk picker —
 * go through here, and a single student is simply a selection of one. The
 * response is a file rather than JSON, so it cannot be navigated to: the POST
 * carries the selection and the body comes back as a blob.
 */

const FALLBACK_FILENAME: Record<ExportFormat, string> = {
  pdf: 'brief-introduction.pdf',
  xlsx: 'brief-introductions.xlsx',
}

const GENERIC_ERROR: Record<ExportFormat, string> = {
  pdf: 'Could not generate the PDF',
  xlsx: 'Could not generate the spreadsheet',
}

export type ExportFormat = 'pdf' | 'xlsx'

export async function downloadBriefIntroExport(
  format: ExportFormat,
  studentIds: string[]
): Promise<void> {
  const response = await fetch(`/api/students/brief-intro/export/${format}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: studentIds }),
  })

  if (!response.ok) {
    // The route explains refusals ("none of these have an introduction yet") and
    // those messages are worth showing; anything unparseable falls back.
    const { error } = await response.json().catch(() => ({ error: null }))
    throw new Error(error ?? GENERIC_ERROR[format])
  }

  const blob = await response.blob()
  const filename =
    response.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
    FALLBACK_FILENAME[format]

  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  } finally {
    // Revoked in a finally: an object URL that outlives its click holds the
    // whole file in memory until the tab is closed.
    URL.revokeObjectURL(url)
  }
}
