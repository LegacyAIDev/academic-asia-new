"use client"

import { useMemo, useState } from "react"
import { FilePlus2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Panel, PanelEmpty } from "@/components/ui/panel"
import type { EmailContext } from "@/lib/emails/email-draft"
import type { FiledEmailDetail, FiledEmailSummary } from "@/lib/emails/filed-email"
import {
  EMAIL_PAGE_SIZE, EMPTY_FILTERS, filterEmails, hasActiveFilters, nextEmailSort, sortEmails,
  type EmailListFilters, type EmailSortKey, type SortDirection,
} from "@/lib/emails/email-list"
import { EmailListToolbar } from "./email-list-toolbar"
import { EmailListTable } from "./email-list-table"
import { FileEmailDialog } from "./file-email-dialog"
import { EmailRecordDialog } from "./email-record-dialog"
import { EmailViewerDialog } from "./email-viewer-dialog"
import { useBodySearch } from "./use-body-search"

type Props = {
  context: EmailContext
  /** null when the list could not be read; the tab says so instead of showing an empty list. */
  emails: FiledEmailSummary[] | null
  canWrite: boolean
  /** Managers and above may delete for good (D5). */
  canDelete: boolean
  applications?: { id: string; label: string }[]
  title?: string
}

type Editor = { mode: "manual" } | { mode: "edit"; email: FiledEmailDetail } | null

/**
 * The Communications list on a student, school or application page (EF-14 to
 * EF-16): emails filed against the record, with search, filters, sorting, and
 * the filing, typing, viewing and editing dialogs.
 */
export function CommunicationsPanel({ context, emails, canWrite, canDelete, applications, title = "Communications" }: Props) {
  const [filters, setFilters] = useState<EmailListFilters>(EMPTY_FILTERS)
  const [sort, setSort] = useState<{ key: EmailSortKey; dir: SortDirection }>({ key: "sentAt", dir: "desc" })
  const [limit, setLimit] = useState(EMAIL_PAGE_SIZE)
  const [filing, setFiling] = useState(false)
  const [editor, setEditor] = useState<Editor>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const bodyMatches = useBodySearch(context, filters.query)
  const visible = useMemo(
    () => (emails ? sortEmails(filterEmails(emails, filters, bodyMatches), sort.key, sort.dir) : []),
    [emails, filters, sort, bodyMatches],
  )
  const liveCount = emails?.filter(e => !e.archivedAt).length ?? 0
  const linkColumn = context.kind === "student" ? "application" : context.kind === "school" ? "student" : null
  const changeFilters = (next: EmailListFilters) => { setFilters(next); setLimit(EMAIL_PAGE_SIZE) }

  return (
    <Panel
      title={title}
      count={liveCount}
      action={canWrite ? (
        <>
          <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5" onClick={() => setEditor({ mode: "manual" })}>
            <FilePlus2 className="h-3.5 w-3.5" />Log a call or meeting
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setFiling(true)}>
            <Upload className="h-3.5 w-3.5" />File email
          </Button>
        </>
      ) : null}
    >
      <div className="space-y-4">
        {emails === null ? (
          <p className="text-sm text-destructive" role="alert">The emails could not be loaded. Refresh the page to try again.</p>
        ) : emails.length === 0 ? (
          <PanelEmpty title="Nothing filed yet">
            {canWrite
              ? "Use File email to drop in an .eml, .msg or PDF email, or log a call or meeting by hand."
              : "Emails, calls and meetings filed here will be listed."}
          </PanelEmpty>
        ) : (
          <>
            <EmailListToolbar filters={filters} onChange={changeFilters} applications={context.kind === "student" ? applications : undefined} />
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <p>No emails match these filters.</p>
                {hasActiveFilters(filters) && <Button type="button" variant="outline" size="sm" onClick={() => changeFilters(EMPTY_FILTERS)}>Clear filters</Button>}
              </div>
            ) : (
              <>
                <EmailListTable emails={visible.slice(0, limit)} sort={sort} linkColumn={linkColumn}
                  onSort={key => setSort(current => nextEmailSort(current, key))} onOpen={setOpenId} />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {Math.min(limit, visible.length)} of {visible.length}</span>
                  {visible.length > limit && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setLimit(l => l + EMAIL_PAGE_SIZE)}>Show more</Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {filing && <FileEmailDialog open={filing} onOpenChange={setFiling} context={context} />}
      {editor && (
        <EmailRecordDialog key={editor.mode === "edit" ? editor.email.id : "manual"} open onOpenChange={next => { if (!next) setEditor(null) }}
          context={context} email={editor.mode === "edit" ? editor.email : undefined} />
      )}
      <EmailViewerDialog emailId={openId} onClose={() => setOpenId(null)} canWrite={canWrite} canDelete={canDelete}
        onEdit={email => { setOpenId(null); setEditor({ mode: "edit", email }) }} />
    </Panel>
  )
}
