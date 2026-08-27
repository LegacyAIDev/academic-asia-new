import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import {
  getBriefIntroExportData,
  MAX_PDF_INTROS,
} from '@/lib/supabase/queries/brief-intro-export'
import { buildExportHtml } from '@/lib/brief-intro/build-export-html'
import { exportFilename } from '@/lib/brief-intro/export-shaping'
import { renderDocumentPdf } from '@/lib/pdf/render-document-pdf'

/**
 * Download one or more Brief Introductions as a PDF booklet.
 *
 * The document is rendered here and handed to headless Chromium as HTML, rather
 * than pointing the browser at the preview page: the browser carries no session
 * and would be redirected to /login, and giving it a URL to fetch would open an
 * SSRF surface for no benefit.
 *
 * NOTE: this route needs its own entry in `outputFileTracingIncludes`
 * (next.config.ts) for the Chromium binary. Without it the route works locally
 * and fails only once deployed.
 */

/** Chromium cold start plus render; well inside the platform default of 300s. */
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // The session is required here, not on the render: the PDF contains the same
  // data the profile would show, so the same authorisation applies.
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!(await canAccess(MODULES.STUDENTS))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { ids?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === 'string')
    : []

  const result = await getBriefIntroExportData(ids, {
    preparedBy: [user.first_name, user.surname].filter(Boolean).join(' ') || null,
    limit: MAX_PDF_INTROS,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  try {
    const html = await buildExportHtml(result.payload)
    const pdf = await renderDocumentPdf(html, {
      footerText: 'Academic Asia · Brief Introduction',
    })

    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportFilename(result.payload, 'pdf')}"`,
        // The document names students and is not fit for any shared cache.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    // Never log the payload: it carries student names.
    console.error('Failed to render the brief introduction PDF:', err)
    return NextResponse.json({ error: 'Could not generate the PDF' }, { status: 500 })
  }
}
