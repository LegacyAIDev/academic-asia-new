"use client"

import { Panel, PanelEmpty } from "@/components/ui/panel"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, Phone as PhoneIcon } from "lucide-react"
import { SchoolContactDialog, EditSchoolContactButton, DeleteSchoolContactButton } from "./contact-dialog"
import { ContactActiveToggle } from "./contact-active-toggle"
import { countInactive, visibleContacts } from "@/lib/schools/contact-visibility"
import type { SchoolContactWithJoins } from "@/lib/supabase/queries/school-contacts"

type SchoolContactsSectionProps = {
  schoolId: string
  contacts: SchoolContactWithJoins[]
  canWrite: boolean
}

/** A school's contacts. Only active ones are listed until "Show inactive" is switched on. */
export function SchoolContactsSection({ schoolId, contacts, canWrite }: SchoolContactsSectionProps) {
  const [showInactive, setShowInactive] = useState(false)
  const inactive = countInactive(contacts)
  const listed = visibleContacts(contacts, showInactive)

  if (contacts.length === 0) {
    return (
      <Panel title="Contacts">
        <PanelEmpty title="No contacts recorded" action={canWrite && <SchoolContactDialog schoolId={schoolId} mode="create" />}>
          Add contact persons for this school
        </PanelEmpty>
      </Panel>
    )
  }

  return (
    <Panel title="Contacts" flush action={<><div className="flex items-center gap-4">
            {inactive > 0 && (
              <div className="flex items-center gap-2">
                <Switch id="show-inactive-contacts" checked={showInactive} onCheckedChange={setShowInactive} />
                <Label htmlFor="show-inactive-contacts" className="text-sm font-normal text-muted-foreground">Show inactive ({inactive})</Label>
              </div>
            )}
            {canWrite && <SchoolContactDialog schoolId={schoolId} mode="create" />}
          </div></>}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-[220px] pl-4">Name and role</TableHead>
                <TableHead className="min-w-[140px]">Phone</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[120px]">Responsible</TableHead>
                <TableHead className="min-w-[80px]">Status</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No active contacts. Switch on &quot;Show inactive&quot; to see earlier ones.
                  </TableCell>
                </TableRow>
              )}
              {listed.map((item) => {
                const fullName = [item.title, item.first_name, item.surname].filter(Boolean).join(" ")
                return (
                  <TableRow key={item.id} className={item.is_active ? undefined : "opacity-60"}>
                    <TableCell className="pl-4">
                      <p className="text-sm font-medium">
                        {fullName || <span className="font-normal text-muted-foreground">Name not recorded</span>}
                        {/* Priority 1 is who staff call first. */}
                        {item.priority === 1 && <Badge variant="outline" className="ml-2 border-brand-navy/30 text-[10px] font-medium text-brand-navy">Main contact</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.position || "Role not recorded"}</p>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {item.telephone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <PhoneIcon className="h-3 w-3" />
                            {item.telephone}
                          </div>
                        )}
                        {item.mobile && (
                          <div className="text-xs text-muted-foreground">
                            Mob: {item.mobile}
                          </div>
                        )}
                        {!item.telephone && !item.mobile && "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.email_1 ? (
                        <a
                          href={`mailto:${item.email_1}`}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.email_1}</span>
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.responsible || "—"}
                    </TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        {item.email_1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title={`Email ${item.email_1}`}
                            aria-label={`Email ${fullName || item.email_1}`}
                            asChild
                          >
                            <a href={`mailto:${item.email_1}`}>
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        {canWrite && (
                          <>
                            <ContactActiveToggle contactId={item.id} schoolId={schoolId} isActive={item.is_active} label={fullName || "Contact"} />
                            <EditSchoolContactButton contact={item} schoolId={schoolId} />
                            <DeleteSchoolContactButton contactId={item.id} schoolId={schoolId} label={fullName || "this contact"} />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </Panel>
  )
}
