"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Phone } from "lucide-react"
import type { StudentContactWithRelations } from "@/lib/supabase/queries/students"
import { EditContactButton, DeleteContactButton } from "./contact-dialog"

export type ContactReferenceData = {
  relationships: { id: number; code: string; label: string }[]
  titles: { id: number; code: string; label: string }[]
}

/** A family member typed in by staff (not a student): name, relationship, how to reach them. */
export function FamilyMemberCard({
  contact,
  studentId,
  referenceData,
  studentAddress,
  canWrite,
}: {
  contact: StudentContactWithRelations
  studentId: string
  referenceData: ContactReferenceData
  studentAddress?: string | null
  canWrite: boolean
}) {
  const title = contact.title?.label ?? ''
  const firstName = contact.first_name ?? ''
  const surname = contact.surname ?? ''
  const fullName = [title, firstName, surname].filter(Boolean).join(' ')
  const initials = `${firstName?.[0] ?? ''}${surname?.[0] ?? ''}`.toUpperCase() || '?'
  // AA emails parents/guardians — use the first available email for the action
  const contactEmail = contact.email_1 || contact.email_2 || contact.email_3

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
            {canWrite && (
              <>
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
              </>
            )}
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
        {contactEmail && (
          <Button variant="outline" size="sm" className="mt-3 w-full gap-2" asChild>
            <a href={`mailto:${contactEmail}`}>
              <Mail className="h-3.5 w-3.5" />
              Send Email
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
