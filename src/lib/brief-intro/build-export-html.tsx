import 'server-only'
import { DocumentMasthead } from '@/app/(dashboard)/students/brief-intros/export/components/document-masthead'
import { IntroDocument } from '@/app/(dashboard)/students/brief-intros/export/components/intro-document'
import { BRIEF_INTRO_DOCUMENT_CSS } from '@/app/(dashboard)/students/brief-intros/export/export-document-styles'
import type { BriefIntroExportPayload } from './export-types'

/**
 * Render the introduction booklet to a standalone HTML string.
 *
 * Used by the PDF route, which hands this straight to headless Chromium via
 * setContent. It renders the same components and the same stylesheet the
 * preview page uses, so the downloaded PDF cannot drift from what the
 * consultant saw on screen — there is no second implementation to keep in step.
 *
 * react-dom/server is imported dynamically: the App Router rejects a static
 * import of it, since in almost every other case reaching for it means a Server
 * Component would have done. Here the output is a standalone HTML file for a
 * browser that is not rendering our app, so there is nothing to return instead.
 */
export async function buildExportHtml(payload: BriefIntroExportPayload): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')

  const body = renderToStaticMarkup(
    <div className="sheet">
      <DocumentMasthead preparedBy={payload.preparedBy} generatedOn={payload.generatedOn} />
      {payload.rows.map((row) => (
        <IntroDocument key={row.studentId} row={row} />
      ))}
    </div>
  )

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Brief Introduction</title>
<style>${BRIEF_INTRO_DOCUMENT_CSS}</style>
</head>
<body>${body}</body>
</html>`
}
