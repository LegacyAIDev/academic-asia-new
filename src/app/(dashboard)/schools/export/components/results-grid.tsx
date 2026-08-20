import type { BandFigures, ExamColumns, Figure } from '@/lib/schools/export-types'

/**
 * The results rail.
 *
 * Every school's grid and the page-level key share one <colgroup>, which is what
 * keeps each figure on the same x position down the whole sheet — the property
 * that makes the document scannable as a comparison rather than a list.
 */

interface GridShape {
  gcse: ExamColumns
  aLevel: ExamColumns
  ib: ExamColumns
}

function ResultsColgroup({ shape }: { shape: GridShape }) {
  return (
    <colgroup>
      <col className="c-year" />
      {shape.gcse.bands.map((b) => (
        <col key={b.key} className="c-g" />
      ))}
      <col className="c-gap" />
      {shape.aLevel.bands.map((b) => (
        <col key={b.key} className="c-a" />
      ))}
      <col className="c-gap" />
      <col className="c-ib" />
    </colgroup>
  )
}

/**
 * Split a figure onto the decimal rail: the integer part right-aligns in one
 * track, the fraction left-aligns in a fixed track beside it. Without this,
 * "100" and "45.4" do not line up on the decimal point.
 */
function FigureCell({ figure }: { figure: Figure }) {
  if (figure.state === 'na') {
    return (
      <td className="val">
        <span className="n">
          <i>
            <span className="na">&mdash;</span>
          </i>
          <u />
        </span>
      </td>
    )
  }

  if (figure.state === 'np' || figure.value === null) {
    return (
      <td className="val">
        <span className="n">
          <i>
            <span className="np">NP</span>
          </i>
          <u />
        </span>
      </td>
    )
  }

  // Source precision is preserved: a school that published "98" should not be
  // reprinted as "98.0", which would claim a precision it did not give.
  const [whole, fraction] = String(figure.value).split('.')

  return (
    <td className="val">
      <span className="n">
        <i>{whole}</i>
        <u>{fraction ? `.${fraction}` : ''}</u>
      </span>
    </td>
  )
}

/** Column key: exam group captions over their threshold labels. */
export function ResultsKey({ shape }: { shape: GridShape }) {
  return (
    <div className="keybar">
      <div className="spacer">School</div>
      <table className="grid">
        <ResultsColgroup shape={shape} />
        <tbody>
          <tr>
            <td />
            <td className="grp" colSpan={shape.gcse.bands.length}>
              GCSE <span className="unit">cumulative&nbsp;%</span>
            </td>
            <td className="grp-gap" />
            <td className="grp" colSpan={shape.aLevel.bands.length}>
              A-Level <span className="unit">cumulative&nbsp;%</span>
            </td>
            <td className="grp-gap" />
            <td className="grp">
              IB <span className="unit">pts</span>
            </td>
          </tr>
          <tr>
            <td className="thr" />
            {shape.gcse.bands.map((b) => (
              <td key={b.key} className="thr">
                {b.label}
              </td>
            ))}
            <td className="thr-gap" />
            {shape.aLevel.bands.map((b) => (
              <td key={b.key} className="thr">
                {b.label}
              </td>
            ))}
            <td className="thr-gap" />
            <td className="thr">avg</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface SchoolResults {
  gcse: BandFigures
  aLevel: BandFigures
  ib: { prior: Figure; current: Figure }
}

/**
 * One school's figures: a row per year, so a reader compares years across and
 * schools down. The year label is per row because the three qualifications
 * publish on different cycles and may not share a year pair.
 */
export function ResultsGrid({
  shape,
  results,
}: {
  shape: GridShape
  results: SchoolResults
}) {
  const rows = [
    { cls: 'prev', which: 'prior' as const, gcseYear: shape.gcse.priorYear, aLevelYear: shape.aLevel.priorYear },
    { cls: 'now', which: 'current' as const, gcseYear: shape.gcse.currentYear, aLevelYear: shape.aLevel.currentYear },
  ].filter((row) => row.gcseYear !== null || row.aLevelYear !== null)

  return (
    <div className="res">
      <table className="grid">
        <ResultsColgroup shape={shape} />
        <tbody>
          {rows.map((row) => (
            <tr key={row.cls} className={row.cls}>
              <td className="yr-lab">{row.gcseYear ?? row.aLevelYear ?? ''}</td>
              {shape.gcse.bands.map((b) => (
                <FigureCell key={b.key} figure={results.gcse[b.key][row.which]} />
              ))}
              <td className="gap gap-rule" />
              {shape.aLevel.bands.map((b) => (
                <FigureCell key={b.key} figure={results.aLevel[b.key][row.which]} />
              ))}
              <td className="gap gap-rule" />
              <FigureCell figure={results.ib[row.which]} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type { GridShape }
