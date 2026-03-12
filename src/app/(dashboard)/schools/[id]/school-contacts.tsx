"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Contact, Mail, Phone as PhoneIcon } from "lucide-react"
import { SchoolContactDialog, EditSchoolContactButton, DeleteSchoolContactButton } from "./contact-dialog"
import type { SchoolContactWithJoins } from "@/lib/supabase/queries/school-contacts"

type SchoolContactsSectionProps = {
  schoolId: string
  contacts: SchoolContactWithJoins[]
}

export function SchoolContactsSection({ schoolId, contacts }: SchoolContactsSectionProps) {
  if (contacts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Contact className="h-4 w-4 text-muted-foreground" />
              Contacts
            </CardTitle>
            <SchoolContactDialog schoolId={schoolId} mode="create" />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Contact className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No contacts recorded</h3>
            <p className="text-sm text-muted-foreground">
              Add contact persons for this school
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Contact className="h-4 w-4 text-muted-foreground" />
            Contacts ({contacts.length})
          </CardTitle>
          <SchoolContactDialog schoolId={schoolId} mode="create" />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 min-w-[50px]">#</TableHead>
                <TableHead className="min-w-[180px]">Name</TableHead>
                <TableHead className="min-w-[160px]">Position</TableHead>
                <TableHead className="min-w-[140px]">Phone</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[120px]">Responsible</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((item) => {
                const fullName = [item.title, item.first_name, item.surname].filter(Boolean).join(" ")
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-6">
                      {item.priority != null ? (
                        <Badge variant="outline" className="text-xs font-medium tabular-nums">
                          {item.priority}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{fullName || "—"}</p>
                        {item.gender && (
                          <span className="text-xs text-muted-foreground">{item.gender === "M" ? "Male" : "Female"}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.position || "—"}
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
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.email_1}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.responsible || "—"}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <EditSchoolContactButton
                          contact={item}
                          schoolId={schoolId}
                        />
                        <DeleteSchoolContactButton
                          contactId={item.id}
                          schoolId={schoolId}
                          label={fullName || "this contact"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
