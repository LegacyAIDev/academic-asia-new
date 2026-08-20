import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSchoolExportData, MAX_EXPORT_SCHOOLS } from '@/lib/supabase/queries/school-export'
import { AGENCY_CONTACT } from '@/lib/schools/agency-contact'
import { ExportControls } from './export-controls'
import { LayoutStacked } from './layout-stacked'
import { LayoutMatrix } from './layout-matrix'
import { EXPORT_DOCUMENT_CSS } from './export-document-styles'

/**
 * The matrix reserves 50mm for the label column inside 269mm of usable landscape
 * width, leaving 43.8mm per school at five — exactly what the layout was tuned
 * at. Six would squeeze columns to 36.5mm and push the sheet onto a second page,
 * and a comparison split across pages is not a comparison. Beyond five, Layout A
 * takes over and flows across as many pages as it needs.
 */
const MATRIX_MAX_SCHOOLS = 5

type SearchParams = Promise<{ ids?: string; layout?: string; student?: string }>

export default async function SchoolExportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const ids = (params.ids ?? '').split(',').map((id) => id.trim()).filter(Boolean)

  // The adviser block is the logged-in consultant preparing the sheet.
  const user = await getCurrentUser()

  const result = await getSchoolExportData(ids, {
    studentName: params.student ?? null,
    adviserName: [user?.first_name, user?.surname].filter(Boolean).join(' ') || null,
    adviserTelephone: AGENCY_CONTACT.telephone,
    adviserFax: AGENCY_CONTACT.fax,
  })

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-lg font-medium">Cannot build this comparison</h1>
        <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        <Link href="/schools" className="mt-4 inline-block text-sm underline">
          Back to schools
        </Link>
      </div>
    )
  }

  const { payload } = result
  const schoolCount = payload.schools.length

  // The matrix is the stronger comparison, so it is the default whenever the
  // shortlist is small enough to fit one landscape page.
  const matrixTooWide = schoolCount > MATRIX_MAX_SCHOOLS
  const requested = params.layout === 'matrix' ? 'matrix' : params.layout === 'stacked' ? 'stacked' : null
  const layout: 'stacked' | 'matrix' =
    matrixTooWide ? 'stacked' : (requested ?? (schoolCount <= MATRIX_MAX_SCHOOLS ? 'matrix' : 'stacked'))

  return (
    <div className="export-stage">
      <style dangerouslySetInnerHTML={{ __html: EXPORT_DOCUMENT_CSS }} />
      <ExportControls
        layout={layout}
        schoolCount={schoolCount}
        schoolIds={payload.schools.map((s) => s.id)}
        studentName={params.student ?? null}
        matrixDisabledReason={
          matrixTooWide
            ? `The matrix fits ${MATRIX_MAX_SCHOOLS} schools; this shortlist has ${schoolCount}`
            : null
        }
      />

      {layout === 'matrix' ? (
        <LayoutMatrix payload={payload} />
      ) : (
        <LayoutStacked payload={payload} />
      )}
    </div>
  )
}

export const metadata = {
  title: 'Selected School List',
}

export { MAX_EXPORT_SCHOOLS }
