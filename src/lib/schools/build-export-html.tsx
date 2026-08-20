import 'server-only'
import { LayoutStacked } from '@/app/(dashboard)/schools/export/layout-stacked'
import { LayoutMatrix } from '@/app/(dashboard)/schools/export/layout-matrix'
import { EXPORT_DOCUMENT_CSS } from '@/app/(dashboard)/schools/export/export-document-styles'
import type { SchoolExportPayload } from './export-types'

export type ExportLayout = 'stacked' | 'matrix'

/**
 * Render the comparison document to a standalone HTML string.
 *
 * Used by the PDF route, which hands this straight to headless Chromium via
 * setContent. It renders the same components and the same stylesheet the page
 * uses, so the downloaded PDF cannot drift from what the consultant saw on
 * screen — there is no second implementation to keep in step.
 *
 * react-dom/server is imported dynamically: the App Router rejects a static
 * import of it, since in almost every other case reaching for it means a Server
 * Component would have done. Here the output is a standalone HTML file for a
 * browser that is not rendering our app, so there is nothing to return instead.
 */
export async function buildExportHtml(
  payload: SchoolExportPayload,
  layout: ExportLayout
): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')

  const body = renderToStaticMarkup(
    layout === 'matrix' ? <LayoutMatrix payload={payload} /> : <LayoutStacked payload={payload} />
  )

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Selected School List</title>
<style>${EXPORT_DOCUMENT_CSS}</style>
</head>
<body>${body}</body>
</html>`
}

/** Filename for the download, e.g. selected-schools-charlotte-chan-2026-08-20.pdf */
export function exportFilename(payload: SchoolExportPayload, extension: string): string {
  const slug = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const date = payload.meta.generatedOn.slice(0, 10)
  const who = payload.meta.studentName ? slug(payload.meta.studentName) : null

  return ['selected-schools', who, date].filter(Boolean).join('-') + `.${extension}`
}
