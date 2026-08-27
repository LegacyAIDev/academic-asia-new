import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/auth'
import { canAccess } from '@/lib/permissions/guard'
import { MODULES } from '@/lib/permissions/modules'
import {
  getBriefIntroExportData,
  MAX_EXCEL_INTROS,
} from '@/lib/supabase/queries/brief-intro-export'
import { buildExportWorkbook } from '@/lib/brief-intro/build-export-workbook'
import { exportFilename } from '@/lib/brief-intro/export-shaping'

/**
 * Download one or more Brief Introductions as a spreadsheet.
 *
 * Same authorisation and same payload as the PDF route — only the rendering
 * differs. No browser is involved, so this needs neither an extended duration
 * nor an entry in outputFileTracingIncludes.
 */

export const dynamic = 'force-dynamic'

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export async function POST(request: NextRequest) {
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
    limit: MAX_EXCEL_INTROS,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  try {
    const workbook = await buildExportWorkbook(result.payload)

    return new NextResponse(workbook as BodyInit, {
      headers: {
        'Content-Type': XLSX_CONTENT_TYPE,
        'Content-Disposition': `attachment; filename="${exportFilename(result.payload, 'xlsx')}"`,
        // The sheet names students and is not fit for any shared cache.
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    // Never log the payload: it carries student names.
    console.error('Failed to build the brief introduction spreadsheet:', err)
    return NextResponse.json({ error: 'Could not generate the spreadsheet' }, { status: 500 })
  }
}
