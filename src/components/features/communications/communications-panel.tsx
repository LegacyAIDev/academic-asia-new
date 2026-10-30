"use client"

import { useMemo, useState } from "react"
import { FilePlus2, Mail, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Mail className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="text-sm font-normal text-muted-foreground">({liveCount})</span>
        </CardTitle>
        {canWrite && (
          <div className="ml-auto flex gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setEditor({ mode: "manual" })}>
              <FilePlus2 className="h-4 w-4" />Add record
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setFiling(true)}>
              <Upload className="h-4 w-4" />File email
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {emails === null ? (
          <p className="text-sm text-destructive" role="alert">The emails could not be loaded. Refresh the page to try again.</p>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">No emails have been filed here yet.</p>
            {canWrite && <Button type="button" size="sm" className="gap-1.5" onClick={() => setFiling(true)}><Upload className="h-4 w-4" />File email</Button>}
          </div>
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
      </CardContent>

      {filing && <FileEmailDialog open={filing} onOpenChange={setFiling} context={context} />}
      {editor && (
        <EmailRecordDialog key={editor.mode === "edit" ? editor.email.id : "manual"} open onOpenChange={next => { if (!next) setEditor(null) }}
          context={context} email={editor.mode === "edit" ? editor.email : undefined} />
      )}
      <EmailViewerDialog emailId={openId} onClose={() => setOpenId(null)} canWrite={canWrite} canDelete={canDelete}
        onEdit={email => { setOpenId(null); setEditor({ mode: "edit", email }) }} />
    </Card>
  )
}
