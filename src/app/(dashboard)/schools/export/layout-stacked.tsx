import type { SchoolExportPayload } from '@/lib/schools/export-types'
import { DocumentMasthead } from './components/document-masthead'
import { DocumentFooter } from './components/document-footer'
import { ResultsKey } from './components/results-grid'
import { SchoolProfile } from './components/school-profile'

/**
 * Layout A — stacked profiles, A4 portrait.
 *
 * One block per school, flowing onto as many pages as needed. The roster is a
 * real <table> for one reason: browsers repeat <thead> across page breaks, so
 * the column key reappears at the top of every continuation page instead of
 * being stated once and lost.
 */
export function LayoutStacked({ payload }: { payload: SchoolExportPayload }) {
  const shape = { gcse: payload.gcse, aLevel: payload.aLevel, ib: payload.ib }

  return (
    <div className="sheet doc--a">
      <DocumentMasthead meta={payload.meta} schoolCount={payload.schools.length} />

      <table className="roster">
        <thead>
          <tr>
            <th>
              <ResultsKey shape={shape} />
            </th>
          </tr>
        </thead>
        <tbody>
          {payload.schools.map((school, index) => (
            <tr key={school.id}>
              <td>
                <SchoolProfile school={school} index={index} shape={shape} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <DocumentFooter meta={payload.meta} gcse={payload.gcse} />
    </div>
  )
}
