import type { ExamColumns, ExportMeta } from '@/lib/schools/export-types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Legend, standing caveats and provenance.
 *
 * The legend is not decoration: NP and the em dash are different claims about a
 * school, and a family reading the sheet without a consultant present needs to
 * know which is which.
 *
 * `tight` is for the landscape matrix, which has to fit one page. It folds the
 * signature into the legend and runs the caveat inline rather than stacking
 * three separate blocks.
 */
export function DocumentFooter({
  meta,
  gcse,
  currentYear,
  tight = false,
}: {
  meta: ExportMeta
  gcse: ExamColumns
  currentYear?: number | null
  tight?: boolean
}) {
  const provenance = `Academic Asia · Hong Kong · ${formatDate(meta.generatedOn)}`

  const caveat = (
    <>
      Fees are on a per-year basis (three terms per year) and are subject to an increase of
      approximately 3&ndash;5% each year. Figures are as published by the schools and are provided
      for guidance only.
      {/* A dropped comparison year needs a reason, or it reads as missing data. */}
      {gcse.priorYearSuppressed && (
        <>
          {' '}
          GCSE grading changed from letters to numbers in 2022; only years using the same scale are
          shown side by side, so no earlier GCSE year appears here.
        </>
      )}
    </>
  )

  return (
    <footer className={tight ? 'docfoot docfoot--tight' : 'docfoot'}>
      <div className="legend">
        <span>
          <b>NP</b>&nbsp; Not published by the school
        </span>
        <span>
          <b>&mdash;</b>&nbsp; Not offered / not applicable
        </span>
        <span>
          <b>GCSE &amp; A-Level</b>&nbsp; cumulative % of entries at or above the stated grade
        </span>
        <span>
          <b>IB</b>&nbsp; average diploma points
        </span>
        {tight && (
          <span>
            <b>
              <span style={{ boxShadow: 'inset 0 -.4mm 0 0 var(--accent)' }}>00.0</span>
            </b>
            &nbsp; Highest {currentYear ?? 'current-year'} figure in the row
          </span>
        )}
        {tight && <span className="sig-inline">{provenance}</span>}
      </div>

      <p className="thanks">
        Thank you for your interest. Please contact Academic Asia for all your enquiries and
        requirements.{' '}
        {tight ? <span className="small">{caveat}</span> : null}
      </p>

      {!tight && <p className="small">{caveat}</p>}

      {!tight && (
        <div className="sig">
          <span>Academic Asia &middot; Hong Kong</span>
          <span>Selected School List &middot; {formatDate(meta.generatedOn)}</span>
        </div>
      )}
    </footer>
  )
}
