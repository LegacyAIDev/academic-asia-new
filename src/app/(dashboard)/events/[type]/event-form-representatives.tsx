"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, Plus, Trash2 } from "lucide-react"
import { inputStyles } from "./event-form-types"

export type RepresentativeRow = {
  id?: string
  name: string
  role: string
  venue_room: string
  available_from: string
  available_to: string
  slot_length_minutes: string
  remarks: string
}

const emptyRep = (): RepresentativeRow => ({
  name: "", role: "", venue_room: "", available_from: "", available_to: "",
  slot_length_minutes: "", remarks: "",
})

type Props = {
  representatives: RepresentativeRow[]
  onChange: (reps: RepresentativeRow[]) => void
}

/** Repeatable representative rows for 1-to-1 scheduling mode */
export function EventFormRepresentatives({ representatives, onChange }: Props) {
  const addRep = () => onChange([...representatives, emptyRep()])
  const removeRep = (idx: number) => onChange(representatives.filter((_, i) => i !== idx))
  const updateRep = (idx: number, field: keyof RepresentativeRow, value: string) => {
    const updated = [...representatives]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

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
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addRep}>
          <Plus className="h-3.5 w-3.5" /> Add Representative
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {representatives.length === 0 && (
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
                <Input className={inputStyles} value={rep.name} onChange={(e) => updateRep(idx, "name", e.target.value)} placeholder="Representative name" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input className={inputStyles} value={rep.role} onChange={(e) => updateRep(idx, "role", e.target.value)} placeholder="e.g. Admissions Officer" />
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
