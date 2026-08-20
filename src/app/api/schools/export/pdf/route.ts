import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { getSchoolExportData } from '@/lib/supabase/queries/school-export'
import { AGENCY_CONTACT } from '@/lib/schools/agency-contact'
import { buildExportHtml, exportFilename, type ExportLayout } from '@/lib/schools/build-export-html'
import { renderDocumentPdf } from '@/lib/pdf/render-document-pdf'

/**
 * Download the Selected School List as a PDF.
 *
 * The document is rendered here and handed to headless Chromium as HTML, rather
 * than pointing the browser at /schools/export: the browser carries no session
 * and would be redirected to /login, and giving it a URL to fetch would open an
 * SSRF surface for no benefit.
 *
 * This is also the only path that can produce page numbers — Chrome ignores CSS
 * @page margin boxes, so "Page 1 of 2" is unreachable from the print dialog.
 */

/** Chromium cold start plus render; well inside the platform default of 300s. */
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // The session is required here, not on the render: the PDF contains the same
  // data the page would show, so the same authorisation applies.
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (!(await canAccess(MODULES.SCHOOLS))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { ids?: unknown; layout?: unknown; student?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : []
  const layout: ExportLayout = body.layout === 'matrix' ? 'matrix' : 'stacked'
  const student = typeof body.student === 'string' && body.student.trim() ? body.student.trim() : null

  const result = await getSchoolExportData(ids, {
    studentName: student,
    adviserName: [user.first_name, user.surname].filter(Boolean).join(' ') || null,
    adviserTelephone: AGENCY_CONTACT.telephone,
    adviserFax: AGENCY_CONTACT.fax,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  try {
    const html = await buildExportHtml(result.payload, layout)
    const pdf = await renderDocumentPdf(html, {
      landscape: layout === 'matrix',
      footerText: 'Academic Asia · Selected School List',
    })

    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${exportFilename(result.payload, 'pdf')}"`,
        // The document names a student and is not fit for any shared cache.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    // Never log the payload: it carries the student's name.
    console.error('Failed to render the school comparison PDF:', err)
    return NextResponse.json({ error: 'Could not generate the PDF' }, { status: 500 })
  }
}
