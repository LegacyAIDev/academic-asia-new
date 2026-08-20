import type { ReactNode } from 'react'
import type { ExamColumns, Figure, SchoolExportRow } from '@/lib/schools/export-types'

/** Split a figure onto the decimal rail. Shared shape with Layout A's grid. */
function Rail({ figure }: { figure: Figure }) {
  if (figure.state === 'na') {
    return (
      <span className="n">
        <i>
          <span className="na">&mdash;</span>
        </i>
        <u />
      </span>
    )
  }
  if (figure.state === 'np' || figure.value === null) {
    return (
      <span className="n">
        <i>
          <span className="np">NP</span>
        </i>
        <u />
      </span>
    )
  }
  const [whole, fraction] = String(figure.value).split('.')
  return (
    <span className="n">
      <i>{whole}</i>
      <u>{fraction ? `.${fraction}` : ''}</u>
    </span>
  )
}

/**
 * Which columns hold the highest current-year figure in a row.
 *
 * Returns nothing when fewer than two schools published — an unopposed number is
 * not a comparison, and marking it would imply a ranking that does not exist.
 * Ties are all marked rather than arbitrarily picking one.
 */
export function leadIndexes(values: Figure[]): Set<number> {
  const published = values
    .map((f, i) => ({ value: f.state === 'ok' ? f.value : null, i }))
    .filter((v): v is { value: number; i: number } => v.value !== null)

  if (published.length < 2) return new Set()

  const best = Math.max(...published.map((p) => p.value))
  return new Set(published.filter((p) => p.value === best).map((p) => p.i))
}

/** Prior and current year figures side by side on their two fixed rails. */
export function MatrixFigurePair({
  figures,
  isLead = false,
}: {
  figures: { prior: Figure; current: Figure }
  isLead?: boolean
}) {
  return (
    <div className="pair">
      <span className="p24">
        <Rail figure={figures.prior} />
      </span>
      <span className={isLead ? 'p25 lead' : 'p25'}>
        <Rail figure={figures.current} />
      </span>
    </div>
  )
}

/** A plain attribute row: label down the side, one value per school column. */
export function ProfileRow({
  label,
  schools,
  value,
}: {
  label: string
  schools: SchoolExportRow[]
  value: (school: SchoolExportRow) => ReactNode
}) {
  return (
    <tr>
      <th>{label}</th>
      {schools.map((school) => (
        <td key={school.id}>{value(school)}</td>
      ))}
    </tr>
  )
}

/**
 * Column headers plus the year sub-header.
 *
 * The year pair is declared once here and every figure below lands on one of the
 * two rails. Each exam publishes on its own cycle, so the sub-header shows the
 * years actually used rather than assuming one pair for the whole sheet.
 */
export function MatrixHead({
  schools,
  gcse,
  aLevel,
  ib,
}: {
  schools: SchoolExportRow[]
  gcse: ExamColumns
  aLevel: ExamColumns
  ib: ExamColumns
}) {
  // The columns share a rail, so show the span they cover rather than one year.
  const priorYears = [gcse.priorYear, aLevel.priorYear, ib.priorYear].filter(
    (y): y is number => y !== null
  )
  const currentYears = [gcse.currentYear, aLevel.currentYear, ib.currentYear].filter(
    (y): y is number => y !== null
  )

  const shortYear = (years: number[]) => {
    if (years.length === 0) return ''
    const min = Math.min(...years)
    const max = Math.max(...years)
    return min === max ? `’${String(min).slice(2)}` : `’${String(min).slice(2)}–’${String(max).slice(2)}`
  }

  return (
    <thead>
      <tr>
        <th className="mx-corner">
          <div className="cap">Academic year</div>
        </th>
        {schools.map((school, i) => (
          <th key={school.id} className="mx-col">
            <div className="mx-head">
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <div className="mx-name">{school.name}</div>
              <div className="mx-loc">
                {[school.city, school.county].filter(Boolean).join(', ') || ' '}
              </div>
              {school.website && (
                <div className="mx-web">
                  <a href={school.website.startsWith('http') ? school.website : `https://${school.website}`}>
                    {school.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              )}
            </div>
          </th>
        ))}
      </tr>
      <tr className="mx-years">
        <th className="mx-corner" />
        {schools.map((school) => (
          <th key={school.id}>
            <div className="yy">
              <span>{shortYear(priorYears)}</span>
              <span className="now">{shortYear(currentYears)}</span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}
