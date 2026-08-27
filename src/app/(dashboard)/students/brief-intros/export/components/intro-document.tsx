import { looksLikeHtml } from '@/lib/utils'
import type { BriefIntroExportRow } from '@/lib/brief-intro/export-types'

/**
 * One student's introduction, as it goes to a school. Prints what it is given —
 * every fallback and every date format is resolved in export-shaping.ts, so the
 * booklet and the spreadsheet cannot disagree about the same record.
 *
 * Approval state is not shown, by decision: an unapproved introduction exports
 * exactly like an approved one.
 */
export function IntroDocument({ row }: { row: BriefIntroExportRow }) {
  return (
    <article className="intro">
      <div className="student">
        <h2 className="student-name">{row.studentName}</h2>
        {row.studentCode && <p className="student-code">{row.studentCode}</p>}
      </div>

      <div className="field-pair">
        <Field label="Spoken English" value={row.spokenEnglish} />
        <Field label="Intended subjects" value={row.subjects} />
      </div>

      <Field label="Hobbies & interests" value={row.hobbies} />

      <section className="field">
        <p className="field-label">Remarks</p>
        {row.remarksHtml ? (
          looksLikeHtml(row.remarksHtml) ? (
            // Sanitized on save in upsertStudentBriefIntro, so this is the same
            // markup the profile card already renders.
            <div className="rich" dangerouslySetInnerHTML={{ __html: row.remarksHtml }} />
          ) : (
            <p className="field-value">{row.remarksHtml}</p>
          )
        ) : (
          <p className="field-value empty">—</p>
        )}
      </section>
    </article>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <section className="field">
      <p className="field-label">{label}</p>
      <p className={value ? 'field-value' : 'field-value empty'}>{value || '—'}</p>
    </section>
  )
}
