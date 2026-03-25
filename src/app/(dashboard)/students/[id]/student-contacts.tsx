"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Phone, Users } from "lucide-react"
import { ContactDialog, EditContactButton, DeleteContactButton } from "./contact-dialog"

type ReferenceItem = {
  id: number
  code: string
  label: string
}

type ContactWithRelations = {
  id: string
  student_id: string
  first_name: string | null
  surname: string | null
  mobile: string | null
  telephone: string | null
  fax: string | null
  email_1: string | null
  email_2: string | null
  email_3: string | null
  address_1: string | null
  address_2: string | null
  occupation: string | null
  office_telephone: string | null
  office_fax: string | null
  priority: number | null
  gender: string | null
  status: string | null
  remarks: string | null
  relationship_id: number | null
  title_id: number | null
  relationship: { id: number; code: string; label: string } | null
  title: { id: number; code: string; label: string } | null
}

type StudentContactsSectionProps = {
  studentId: string
  contacts: ContactWithRelations[]
  referenceData: {
    relationships: ReferenceItem[]
    titles: ReferenceItem[]
  }
  studentAddress?: string | null
}

export function StudentContactsSection({ studentId, contacts, referenceData, studentAddress }: StudentContactsSectionProps) {
  if (contacts.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Family & Guardian Contacts
            </CardTitle>
            <ContactDialog
              studentId={studentId}
              referenceData={referenceData}
              mode="create"
              studentAddress={studentAddress}
            />
          </div>
        </CardHeader>
        <CardContent className="py-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-sm font-medium text-foreground mb-1">No contacts yet</h3>
            <p className="text-sm text-muted-foreground">
              Add family members, guardians, or other contacts
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Family & Guardian Contacts ({contacts.length})
          </CardTitle>
          <ContactDialog
            studentId={studentId}
            referenceData={referenceData}
            mode="create"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              studentId={studentId}
              referenceData={referenceData}
              studentAddress={studentAddress}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ContactCard({
  contact,
  studentId,
  referenceData,
  studentAddress,
}: {
  contact: ContactWithRelations
  studentId: string
  referenceData: { relationships: ReferenceItem[]; titles: ReferenceItem[] }
  studentAddress?: string | null
}) {
  const title = contact.title?.label ?? ''
  const firstName = contact.first_name ?? ''
  const surname = contact.surname ?? ''
  const fullName = [title, firstName, surname].filter(Boolean).join(' ')
  const initials = `${firstName?.[0] ?? ''}${surname?.[0] ?? ''}`.toUpperCase() || '?'

  return (
    <Card className="border shadow-none">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{fullName || 'Unknown'}</p>
              {contact.relationship && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {contact.relationship.label}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {contact.priority && (
              <Badge variant="outline" className="text-xs mr-1">
                P{contact.priority}
              </Badge>
            )}
            <EditContactButton
              contact={contact}
              studentId={studentId}
              referenceData={referenceData}
              studentAddress={studentAddress}
            />
            <DeleteContactButton
              contactId={contact.id}
              studentId={studentId}
              contactName={fullName || 'this contact'}
            />
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {contact.email_1 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.email_1}</span>
            </div>
          )}
          {contact.email_2 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.email_2}</span>
            </div>
          )}
          {contact.mobile && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              {contact.mobile}
            </div>
          )}
          {contact.telephone && !contact.mobile && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              {contact.telephone}
            </div>
          )}
          {contact.occupation && (
            <p className="text-xs text-muted-foreground mt-2">{contact.occupation}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
