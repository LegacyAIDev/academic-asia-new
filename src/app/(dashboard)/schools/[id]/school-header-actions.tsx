"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronDown, ExternalLink, Mail, MoreHorizontal, Plus, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouterWithProgress } from "@/components/layout/navigation-progress"
import { EditSchoolSheet } from "../school-form-sheet"
import { DeleteSchoolDialog } from "./delete-school-dialog"

/** What Add can start on a school: the section it lives in and the pop-up key it opens (see useAddParam). */
const ADD_ACTIONS = [
  { label: "Contact", tab: "contacts", add: "contact" },
  { label: "Entrance exam", tab: "entrance-exams", add: "entrance-exam" },
  { label: "Fee", tab: "fees", add: "fee" },
  { label: "Exam result", tab: "academic-results", add: "exam-result" },
  { label: "Note", tab: "notes", add: "note" },
  { label: "Background information", tab: "notes", add: "info" },
  { label: "Course", tab: "courses", add: "course" },
  { label: "Bank details", tab: "bank-details", add: "bank-detail" },
  { label: "Visit", tab: "visits", add: "visit" },
] as const

/** Add (each kind of record, its form opening straight away), Edit details (a drawer) and More. */
export function SchoolHeaderActions({ schoolId, schoolName, canWrite, website, email }: {
  schoolId: string
  schoolName: string
  canWrite: boolean
  website: string | null
  email: string | null
}) {
  const router = useRouterWithProgress()
  const pathname = usePathname()
  const [deleting, setDeleting] = useState(false)
  const go = (tab: string, add?: string) => router.push(`${pathname}?tab=${tab}${add ? `&add=${add}` : ""}`, { scroll: false })
  const site = website ? (/^https?:\/\//.test(website) ? website : `https://${website}`) : null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add <ChevronDown className="h-3.5 w-3.5 opacity-70" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={event => event.preventDefault()}>
            <DropdownMenuItem onSelect={() => go("documents")}><Upload className="h-4 w-4" /> Document</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => go("communications")}><Mail className="h-4 w-4" /> Email (file or log)</DropdownMenuItem>
            <DropdownMenuSeparator />
            {ADD_ACTIONS.map(action => (
              <DropdownMenuItem key={action.add} onSelect={() => go(action.tab, action.add)}>
                <Plus className="h-4 w-4 text-muted-foreground" /> {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canWrite && <EditSchoolSheet schoolId={schoolId} schoolName={schoolName} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {site && (
            <DropdownMenuItem asChild>
              <a href={site} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open website</a>
            </DropdownMenuItem>
          )}
          {email && (
            <DropdownMenuItem asChild>
              <a href={`mailto:${email}`}><Mail className="h-4 w-4" /> Email the school</a>
            </DropdownMenuItem>
          )}
          {!site && !email && <DropdownMenuLabel className="font-normal text-muted-foreground">No website or email on file</DropdownMenuLabel>}
          {canWrite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDeleting(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Delete school
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {canWrite && <DeleteSchoolDialog schoolId={schoolId} schoolName={schoolName} open={deleting} onOpenChange={setDeleting} />}
    </div>
  )
}
