import type { ExportMeta } from '@/lib/schools/export-types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Document masthead: agency identity on the left, what this sheet is on the
 * right, then who it was prepared for and who to call about it.
 */
export function DocumentMasthead({
  meta,
  schoolCount,
}: {
  meta: ExportMeta
  schoolCount: number
}) {
  return (
    <header className="masthead">
      <div className="mast-top">
        <div>
          <div className="wordmark">
            ACADEMIC<span className="sp"> </span>ASIA
          </div>
          <div className="tagline">The best advice for the best education since 1980.</div>
        </div>
        <div className="doctitle">
          <div className="t">Selected School List</div>
          <div className="s">
            {schoolCount} {schoolCount === 1 ? 'school' : 'schools'} &middot; prepared{' '}
            {formatDate(meta.generatedOn)}
          </div>
        </div>
      </div>

      <div className="mast-rule" />
      <div className="mast-rule-thin" />

      <div className="mast-meta">
        <div className="mfield grow">
          <div className="l">Prepared for</div>
          <div className="v name">{meta.studentName ?? '—'}</div>
        </div>
        {meta.adviserName && (
          <div className="mfield">
            <div className="l">Adviser</div>
            <div className="v">{meta.adviserName}</div>
          </div>
        )}
        {meta.adviserTelephone && (
          <div className="mfield">
            <div className="l">Telephone</div>
            <div className="v">{meta.adviserTelephone}</div>
          </div>
        )}
        {meta.adviserFax && (
          <div className="mfield">
            <div className="l">Facsimile</div>
            <div className="v">{meta.adviserFax}</div>
          </div>
        )}
      </div>
    </header>
  )
}
