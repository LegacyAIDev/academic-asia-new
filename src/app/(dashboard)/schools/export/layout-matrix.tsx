import type { ExamColumns, Figure, SchoolExportPayload, SchoolExportRow } from '@/lib/schools/export-types'
import { DocumentMasthead } from './components/document-masthead'
import { DocumentFooter } from './components/document-footer'
import { MatrixFigurePair, MatrixHead, ProfileRow, leadIndexes } from './components/matrix-parts'

/**
 * Layout B — comparison matrix, A4 landscape.
 *
 * Schools become columns and attributes become rows, which is the reading
 * direction the document's purpose actually demands: "which is cheapest, most
 * boarding, strongest at A-Level" is answered by reading across one row.
 *
 * Caps at about six schools — past that the columns fall below ~40mm and names
 * stop fitting, at which point the caller falls back to Layout A.
 */
export function LayoutMatrix({ payload }: { payload: SchoolExportPayload }) {
  const { schools, gcse, aLevel, ib, meta } = payload

  const money = (school: SchoolExportRow) =>
    school.fees?.bands.map((band, i) => (
      <div key={i} className={i > 0 ? 'b2' : undefined}>
        <span className="amt">
          £{band.amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
        </span>
        <span className="yr">
          {band.yearLevelFrom && band.yearLevelTo && band.yearLevelFrom !== band.yearLevelTo
            ? `${band.yearLevelFrom} – ${band.yearLevelTo}`
            : (band.yearLevelFrom ?? band.yearLevelTo ?? 'All years')}
        </span>
      </div>
    )) ?? <span className="mx-note">Not published</span>

  /** A band of result rows for one exam, with its threshold labels down the side. */
  const examRows = (columns: ExamColumns, pick: (s: SchoolExportRow, key: string) => { prior: Figure; current: Figure }, caption: string) => {
    if (columns.currentYear === null) return null
    return (
      <>
        <tr className="band-row">
          <th>{caption}</th>
          <td colSpan={schools.length}>
            <span className="unit">cumulative % of entries at or above the stated grade</span>
          </td>
        </tr>
        {columns.bands.map((band) => {
          const values = schools.map((s) => pick(s, band.key).current)
          const leaders = leadIndexes(values)
          return (
            <tr key={band.key}>
              <th>Grade {band.label}</th>
              {schools.map((school, i) => (
                <td key={school.id}>
                  <MatrixFigurePair figures={pick(school, band.key)} isLead={leaders.has(i)} />
                </td>
              ))}
            </tr>
          )
        })}
      </>
    )
  }

  const ibValues = schools.map((s) => s.ib.current)
  const ibLeaders = leadIndexes(ibValues)

  // A4 landscape (297mm) less the 14mm side margins, less the 50mm label column.
  const columnWidthMm = (269 - 50) / Math.max(schools.length, 1)

  return (
    <div
      className="sheet sheet--land doc--b"
      style={{ ['--mx-col-w' as string]: `${columnWidthMm.toFixed(2)}mm` }}
    >
      <DocumentMasthead meta={meta} schoolCount={schools.length} />

      <table className="matrix">
        <colgroup>
          <col className="c-lab" />
          {schools.map((s) => (
            <col key={s.id} className="c-sch" />
          ))}
        </colgroup>

        <MatrixHead schools={schools} gcse={gcse} aLevel={aLevel} ib={ib} />

        <tbody>
          <tr className="band-row">
            <th>Profile</th>
            <td colSpan={schools.length} />
          </tr>
          <ProfileRow label="Type" schools={schools} value={(s) => s.genderType ?? '—'} />
          <ProfileRow label="Religious affiliation" schools={schools} value={(s) => s.religion ?? '—'} />
          <ProfileRow
            label="Pupils"
            schools={schools}
            value={(s) => <span className="mx-num">{s.pupilCount?.toLocaleString('en-GB') ?? '—'}</span>}
          />
          <ProfileRow
            label="Boarders"
            schools={schools}
            value={(s) => (
              <>
                <span className="mx-num">{s.boarderCount?.toLocaleString('en-GB') ?? '—'}</span>{' '}
                {s.boardingPercent !== null && <span className="mx-sub">{s.boardingPercent}% of roll</span>}
                {s.boardingPercent !== null && (
                  <div className="mx-prop">
                    <i style={{ width: `${s.boardingPercent}%` }} />
                  </div>
                )}
              </>
            )}
          />
          <ProfileRow
            label="Boarding age range"
            schools={schools}
            value={(s) => (s.boarderAge ? `${s.boarderAge.min}–${s.boarderAge.max ?? '+'}` : '—')}
          />
          <ProfileRow
            label="School age range"
            schools={schools}
            value={(s) => (s.schoolAge ? `${s.schoolAge.min}–${s.schoolAge.max ?? '+'}` : '—')}
          />

          <tr className="band-row">
            <th>Fees</th>
            <td colSpan={schools.length}>
              <span className="unit">per year, three terms</span>
            </td>
          </tr>
          <tr>
            <th>Annual fee</th>
            {schools.map((school) => (
              <td key={school.id} className="mx-fee">
                {money(school)}
              </td>
            ))}
          </tr>
          <ProfileRow
            label="Remark"
            schools={schools}
            value={(s) => (s.remark ? <span className="mx-note">{s.remark}</span> : '—')}
          />

          {examRows(gcse, (s, key) => s.gcse[key], 'GCSE results')}
          {examRows(aLevel, (s, key) => s.aLevel[key], 'A-Level results')}

          {ib.currentYear !== null && (
            <>
              <tr className="band-row">
                <th>IB Diploma</th>
                <td colSpan={schools.length}>
                  <span className="unit">average diploma points, out of 45</span>
                </td>
              </tr>
              <tr>
                <th>Average points score</th>
                {schools.map((school, i) => (
                  <td key={school.id}>
                    <MatrixFigurePair figures={school.ib} isLead={ibLeaders.has(i)} />
                  </td>
                ))}
              </tr>
            </>
          )}
        </tbody>
      </table>

      <DocumentFooter meta={meta} gcse={gcse} currentYear={gcse.currentYear ?? aLevel.currentYear} tight />
    </div>
  )
}
