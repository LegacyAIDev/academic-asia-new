import { AGENCY_CONTACT } from '@/lib/schools/agency-contact'
import { formatExportDate } from '@/lib/brief-intro/export-shaping'

/**
 * Letterhead for the exported document. Printed once at the top of the booklet
 * rather than on every page — the page footer already carries the running
 * identification, and repeating the letterhead wastes a third of each page.
 */
export function DocumentMasthead({
  preparedBy,
  generatedOn,
}: {
  preparedBy: string | null
  generatedOn: string
}) {
  return (
    <header className="masthead">
      <h1 className="masthead-agency">Academic Asia</h1>
      <p className="masthead-title">Brief Introduction</p>
      <div className="masthead-meta">
        <span>
          {preparedBy ? `Prepared by ${preparedBy} · ` : ''}
          {AGENCY_CONTACT.telephone} · Fax {AGENCY_CONTACT.fax}
        </span>
        <span>{formatExportDate(generatedOn) ?? ''}</span>
      </div>
    </header>
  )
}
