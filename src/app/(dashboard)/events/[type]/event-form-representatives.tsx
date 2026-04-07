"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Users, Plus, Trash2, AlertCircle } from "lucide-react"
import { inputStyles } from "./event-form-types"
import type { SchoolContactOption } from "@/lib/supabase/actions/school-contacts"

export type RepresentativeRow = {
  id?: string
  school_contact_id: string
  school_id: string
  name: string
  role: string
  venue_room: string
  available_from: string
  available_to: string
  slot_length_minutes: string
  remarks: string
}

type Props = {
  representatives: RepresentativeRow[]
  onChange: (reps: RepresentativeRow[]) => void
  schoolContacts: SchoolContactOption[]
  eventStartTime: string
  eventEndTime: string
  eventDuration: string
}

/** Repeatable representative rows sourced from school contacts */
export function EventFormRepresentatives({
  representatives, onChange, schoolContacts, eventStartTime, eventEndTime, eventDuration,
}: Props) {
  const addRep = () => onChange([...representatives, {
    school_contact_id: "", school_id: "", name: "", role: "",
    venue_room: "",
    available_from: eventStartTime,
    available_to: eventEndTime,
    slot_length_minutes: eventDuration,
    remarks: "",
  }])

  const removeRep = (idx: number) => onChange(representatives.filter((_, i) => i !== idx))

  const updateRep = (idx: number, field: keyof RepresentativeRow, value: string) => {
    const updated = [...representatives]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  const handleContactSelect = (idx: number, contactId: string) => {
    const contact = schoolContacts.find(c => c.id === contactId)
    if (!contact) return
    const fullName = [contact.first_name, contact.surname].filter(Boolean).join(" ")
    const updated = [...representatives]
    updated[idx] = {
      ...updated[idx],
      school_contact_id: contact.id,
      school_id: contact.school_id,
      name: fullName,
      role: contact.position ?? "",
    }
    onChange(updated)
  }

  // Group contacts by school for the dropdown
  const contactsBySchool = schoolContacts.reduce<Record<string, { schoolName: string; contacts: SchoolContactOption[] }>>((acc, c) => {
    if (!acc[c.school_id]) acc[c.school_id] = { schoolName: c.school_name ?? "Unknown School", contacts: [] }
    acc[c.school_id].contacts.push(c)
    return acc
  }, {})

  const usedContactIds = new Set(representatives.map(r => r.school_contact_id).filter(Boolean))

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Representatives
          </CardTitle>
          <CardDescription>School representatives with availability for 1-to-1 slots</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRep}
          disabled={schoolContacts.length === 0}>
          <Plus className="h-3.5 w-3.5" /> Add Representative
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {schoolContacts.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Select schools with contacts first to add representatives.
          </div>
        )}

        {representatives.length === 0 && schoolContacts.length > 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No representatives added. Click &quot;Add Representative&quot; to start.
          </p>
        )}

        {representatives.map((rep, idx) => (
          <div key={idx} className="rounded-lg border border-border p-4 space-y-4 relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Representative {idx + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRep(idx)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Select value={rep.school_contact_id} onValueChange={(v) => handleContactSelect(idx, v)}>
                  <SelectTrigger className={inputStyles}>
                    <SelectValue placeholder="Select a contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactsBySchool).map(([schoolId, group]) => (
                      <SelectGroup key={schoolId}>
                        <SelectLabel>{group.schoolName}</SelectLabel>
                        {group.contacts.map((c) => {
                          const label = [c.first_name, c.surname].filter(Boolean).join(" ")
                          const taken = usedContactIds.has(c.id) && rep.school_contact_id !== c.id
                          return (
                            <SelectItem key={c.id} value={c.id} disabled={taken}>
                              {label}{c.position ? ` — ${c.position}` : ""}{taken ? " (added)" : ""}
                            </SelectItem>
                          )
                        })}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input className={inputStyles} value={rep.role} onChange={(e) => updateRep(idx, "role", e.target.value)} placeholder="Auto-filled from contact" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Venue / Room</Label>
                <Input className={inputStyles} value={rep.venue_room} onChange={(e) => updateRep(idx, "venue_room", e.target.value)} placeholder="Room name" />
              </div>
              <div className="space-y-2">
                <Label>Available From</Label>
                <Input type="time" className={inputStyles} value={rep.available_from} onChange={(e) => updateRep(idx, "available_from", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Available To</Label>
                <Input type="time" className={inputStyles} value={rep.available_to} onChange={(e) => updateRep(idx, "available_to", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Slot Length (min)</Label>
                <Input type="number" min="5" step="5" className={inputStyles} value={rep.slot_length_minutes} onChange={(e) => updateRep(idx, "slot_length_minutes", e.target.value)} placeholder="e.g. 20" />
              </div>
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input className={inputStyles} value={rep.remarks} onChange={(e) => updateRep(idx, "remarks", e.target.value)} placeholder="Notes" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
