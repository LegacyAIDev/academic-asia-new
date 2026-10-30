"use client"

import { ArrowDown, ArrowUp, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DIRECTION_LABELS, formatEmailDate, formatEmailDay } from "@/lib/emails/email-form"
import type { EmailSortKey, SortDirection } from "@/lib/emails/email-list"
import type { FiledEmailSummary } from "@/lib/emails/filed-email"

type Props = {
  emails: FiledEmailSummary[]
  sort: { key: EmailSortKey; dir: SortDirection }
  onSort: (key: EmailSortKey) => void
  onOpen: (id: string) => void
  /** Which linked record to show in its own column: the other side of the page's record. */
  linkColumn: "application" | "student" | null
}

function SortHead({ label, column, sort, onSort }: {
  label: string; column: EmailSortKey; sort: Props["sort"]; onSort: Props["onSort"]
}) {
  const active = sort.key === column
  return (
    <TableHead aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(column)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {label}
        {active && (sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
      </button>
    </TableHead>
  )
}

/** Filed emails, one row each, newest first by default (EF-14, EF-15). */
export function EmailListTable({ emails, sort, onSort, onOpen, linkColumn }: Props) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortHead label="Date" column="sentAt" sort={sort} onSort={onSort} />
            <SortHead label="Subject" column="subject" sort={sort} onSort={onSort} />
            <SortHead label="From" column="from" sort={sort} onSort={onSort} />
            <TableHead>Direction</TableHead>
            {linkColumn === "application" && <TableHead>Application</TableHead>}
            {linkColumn === "student" && <TableHead>Student</TableHead>}
            <SortHead label="Filed" column="createdAt" sort={sort} onSort={onSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {emails.map(e => (
            <TableRow key={e.id} className={`cursor-pointer ${e.archivedAt ? "opacity-60" : ""}`} onClick={() => onOpen(e.id)}>
              <TableCell className="whitespace-nowrap align-top text-sm" title={formatEmailDate(e.sentAt)}>{formatEmailDay(e.sentAt)}</TableCell>
              <TableCell className="max-w-md align-top">
                <button type="button" className="text-left font-medium hover:underline" onClick={ev => { ev.stopPropagation(); onOpen(e.id) }}>
                  {e.subject}
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {e.attachments.length > 0 && (
                    <span className="inline-flex items-center gap-0.5" title={e.attachments.map(a => a.name).join(", ")}>
                      <Paperclip className="h-3 w-3" aria-hidden />{e.attachments.length}
                      <span className="sr-only"> attachment{e.attachments.length === 1 ? "" : "s"}</span>
                    </span>
                  )}
                  {e.archivedAt && <Badge variant="outline" className="h-5 px-1.5 text-[11px]">Archived</Badge>}
                  {e.staffNote && <span className="line-clamp-1">{e.staffNote}</span>}
                </div>
              </TableCell>
              <TableCell className="max-w-56 align-top text-sm">
                <span className="line-clamp-1" title={e.from}>{e.from}</span>
                {e.to.length > 0 && <span className="line-clamp-1 text-xs text-muted-foreground" title={e.to.join("; ")}>to {e.to.join("; ")}</span>}
              </TableCell>
              <TableCell className="align-top">
                <Badge variant={e.direction === "sent" ? "outline" : "secondary"} className="whitespace-nowrap">{DIRECTION_LABELS[e.direction]}</Badge>
              </TableCell>
              {linkColumn === "application" && <TableCell className="align-top text-sm">{e.application?.label ?? "—"}</TableCell>}
              {linkColumn === "student" && <TableCell className="align-top text-sm">{e.student?.name ?? "—"}</TableCell>}
              <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">
                {e.createdByName}<br />{formatEmailDay(e.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
