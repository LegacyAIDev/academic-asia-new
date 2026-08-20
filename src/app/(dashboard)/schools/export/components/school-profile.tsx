import type { AgeRange, SchoolExportRow, SchoolFees } from '@/lib/schools/export-types'
import { ResultsGrid, type GridShape } from './results-grid'

const money = (amount: number) =>
  `£${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`

const ageLabel = (range: AgeRange | null) =>
  range === null ? null : range.max === null ? `${range.min}+` : `${range.min}–${range.max}`

/** "2025-26" reads better on a document as "2025–26". */
const financialYearLabel = (year: string) => year.replace('-', '–')

const bandLabel = (from: string | null, to: string | null) => {
  if (!from && !to) return 'All years'
  if (from && to && from !== to) return `${from} – ${to}`
  return from ?? to ?? 'All years'
}

const hostname = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')
const href = (url: string) => (url.startsWith('http') ? url : `https://${url}`)

function FeeBands({ fees }: { fees: SchoolFees }) {
  return (
    <span className="fee-l">
      <span className="cap">
        Fees <em>{financialYearLabel(fees.financialYear)} &middot; per year</em>
      </span>
      {fees.bands.map((band, i) => (
        <div className="band" key={`${band.yearLevelFrom}-${i}`}>
          <span className="yr">{bandLabel(band.yearLevelFrom, band.yearLevelTo)}</span>
          <span className="amt">{money(band.amount)}</span>
        </div>
      ))}
    </span>
  )
}

/**
 * One numbered school block: identity and figures on the top row, then a facts
 * strip and a fees strip. Three shallow bands rather than two tall columns, so a
 * two-row results grid never floats beside a nine-line stack of labels.
 */
export function SchoolProfile({
  school,
  index,
  shape,
}: {
  school: SchoolExportRow
  index: number
  shape: GridShape
}) {
  const location = [school.city, school.county].filter(Boolean).join(', ')
  const category = [school.genderType, school.religion].filter(Boolean)
  const boardingAge = ageLabel(school.boarderAge)
  const schoolAge = ageLabel(school.schoolAge)

  return (
    <article className="school">
      <div className="row-main">
        <div className="ident">
          <div className="idx">{String(index + 1).padStart(2, '0')}</div>
          <h2 className="sname">{school.name}</h2>
          {location && <div className="sloc">{location}</div>}
        </div>
        <ResultsGrid
          shape={shape}
          results={{ gcse: school.gcse, aLevel: school.aLevel, ib: school.ib }}
        />
      </div>

      <div className="strip strip-facts">
        {category.length > 0 && (
          <span className="cat">
            {category.map((part, i) => (
              <span key={part}>
                {i > 0 && <span className="sep">/</span>}
                {part}
              </span>
            ))}
          </span>
        )}
        {school.pupilCount !== null && (
          <span className="f">
            <span className="l">Pupils</span>
            <span className="v">{school.pupilCount.toLocaleString('en-GB')}</span>
          </span>
        )}
        {school.boarderCount !== null && (
          <span className="f">
            <span className="l">Boarders</span>
            <span className="v">{school.boarderCount.toLocaleString('en-GB')}</span>
            {school.boardingPercent !== null && (
              <>
                <span className="prop">
                  <i style={{ width: `${school.boardingPercent}%` }} />
                </span>
                <span className="v">{school.boardingPercent}%</span>
              </>
            )}
          </span>
        )}
        {boardingAge && (
          <span className="f">
            <span className="l">Boarding age</span>
            <span className="v">{boardingAge}</span>
          </span>
        )}
        {schoolAge && (
          <span className="f">
            <span className="l">School age</span>
            <span className="v">{schoolAge}</span>
          </span>
        )}
      </div>

      <div className="strip strip-fee">
        {school.fees ? (
          <FeeBands fees={school.fees} />
        ) : (
          <span className="fee-l">
            <span className="cap">
              Fees <em>not published</em>
            </span>
          </span>
        )}
        <span className="refs">
          {school.website && (
            <span>
              <span className="k">Web</span>
              <a href={href(school.website)}>{hostname(school.website)}</a>
            </span>
          )}
          {school.factsheetUrl && (
            <span>
              <span className="k">Factsheet</span>
              <a href={school.factsheetUrl}>PDF</a>
            </span>
          )}
          {school.remark && (
            <span>
              <span className="k">Remark</span>
              <em>{school.remark}</em>
            </span>
          )}
        </span>
      </div>
    </article>
  )
}
