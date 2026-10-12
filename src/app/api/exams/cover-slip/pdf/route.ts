import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import { coverSlipHtml } from '@/lib/exams/cover-slip-html'
import { buildCoverSlips, coverSlipFilename, isCoverSlipBooking } from '@/lib/exams/cover-slip-shaping'
import { escapeHtml } from '@/lib/pdf/escape-html'
import { renderDocumentPdf } from '@/lib/pdf/render-document-pdf'
import { isUuid } from '@/lib/scheduler/uuid'
import { getBooking } from '@/lib/supabase/queries/scheduler-bookings'

/**
 * Cover slips of one examination booking as a PDF, one page per candidate,
 * opened in the browser's own viewer so it can be printed straight away.
 *
 * The slips are rendered here and handed to headless Chromium as HTML: the
 * renderer has no session and never fetches a URL.
 *
 * NOTE: this route needs its own entry in `outputFileTracingIncludes`
 * (next.config.ts) for the Chromium binary. Without it the route works locally
 * and fails only once deployed.
 */

/** Chromium cold start plus render; well inside the platform default. */
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * A refusal opens in a new browser tab like the PDF would, so it is a short
 * page a person can read rather than a JSON error.
 */
function refuse(message: string, status: number) {
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Cover slip</title></head>
<body style="font-family: system-ui, sans-serif; margin: 3rem; max-width: 36rem; line-height: 1.5">
<h1 style="font-size: 1.25rem">The cover slip could not be opened</h1>
<p>${escapeHtml(message)}</p>
<p>You can close this tab and go back to the exam desk.</p>
</body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

export async function GET(request: NextRequest) {
  // API routes are not covered by the page guard, so the session and the right
  // to see exams are checked here before anything is looked up.
  const user = await getCurrentUser()
  if (!user) return refuse('You are not signed in.', 401)
  if (!(await canAccess(MODULES.EXAMS))) return refuse('You do not have access to exams.', 403)

  const bookingId = request.nextUrl.searchParams.get('booking') ?? ''
  if (!isUuid(bookingId)) return refuse('This link does not point at a booking.', 400)

  const booking = await getBooking(bookingId)
  if (!booking) return refuse('This booking could not be found.', 404)
  if (!isCoverSlipBooking(booking)) return refuse('Cover slips exist only for examinations that are going ahead. This booking is cancelled or is not an examination.', 400)

  const slips = buildCoverSlips(booking)
  if (slips.length === 0) return refuse('This booking has no candidate to print a slip for.', 400)

  try {
    const pdf = await renderDocumentPdf(coverSlipHtml(slips))
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${coverSlipFilename(booking)}"`,
        // The slips name students and are not fit for any shared cache.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    // Never log the slips themselves: they carry student names.
    console.error('Failed to render the cover slip PDF:', err)
    return refuse('The PDF could not be generated. Please try again.', 500)
  }
}
