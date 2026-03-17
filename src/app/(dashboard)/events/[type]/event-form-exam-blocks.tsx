"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BookOpen, Plus, Trash2 } from "lucide-react"
import { inputStyles } from "./event-form-types"

export type ExamBlockRow = {
  id?: string
  subject: string
  name: string
  apply_year: string
  duration_minutes: string
  start_time: string
  end_time: string
  venue_room: string
  invigilator_names: string
  capacity: string
  allowed_items: string
  special_instructions: string
}

const emptyBlock = (): ExamBlockRow => ({
  subject: "", name: "", apply_year: "", duration_minutes: "", start_time: "",
  end_time: "", venue_room: "", invigilator_names: "", capacity: "",
  allowed_items: "", special_instructions: "",
})

type Props = {
  examBlocks: ExamBlockRow[]
  onChange: (blocks: ExamBlockRow[]) => void
}

/** Repeatable exam block cards for group sitting scheduling mode */
export function EventFormExamBlocks({ examBlocks, onChange }: Props) {
  const addBlock = () => onChange([...examBlocks, emptyBlock()])
  const removeBlock = (idx: number) => onChange(examBlocks.filter((_, i) => i !== idx))
  const updateBlock = (idx: number, field: keyof ExamBlockRow, value: string) => {
    const updated = [...examBlocks]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

  // Auto-show first block if none exist
  const blocks = examBlocks.length === 0 ? [emptyBlock()] : examBlocks
  if (examBlocks.length === 0) onChange(blocks)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            Exam Blocks
          </CardTitle>
          <CardDescription>Exam sessions for group sitting</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addBlock}>
          <Plus className="h-3.5 w-3.5" /> Add Exam
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {blocks.map((block, idx) => (
          <div key={idx} className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Exam {idx + 1}</span>
              {blocks.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeBlock(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Row 1: Subject, Name, Apply Year */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input className={inputStyles} value={block.subject} onChange={(e) => updateBlock(idx, "subject", e.target.value)} placeholder="e.g. Mathematics" />
              </div>
              <div className="space-y-2">
                <Label>Exam Name</Label>
                <Input className={inputStyles} value={block.name} onChange={(e) => updateBlock(idx, "name", e.target.value)} placeholder="Exam name" />
              </div>
              <div className="space-y-2">
                <Label>Apply Year</Label>
                <Input className={inputStyles} value={block.apply_year} onChange={(e) => updateBlock(idx, "apply_year", e.target.value)} placeholder="e.g. 2026" />
              </div>
            </div>

            {/* Row 2: Duration, Start, End */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" min="5" step="5" className={inputStyles} value={block.duration_minutes} onChange={(e) => updateBlock(idx, "duration_minutes", e.target.value)} placeholder="e.g. 60" />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" className={inputStyles} value={block.start_time} onChange={(e) => updateBlock(idx, "start_time", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" className={inputStyles} value={block.end_time} onChange={(e) => updateBlock(idx, "end_time", e.target.value)} />
              </div>
            </div>

            {/* Row 3: Venue, Invigilator, Capacity */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Venue / Room</Label>
                <Input className={inputStyles} value={block.venue_room} onChange={(e) => updateBlock(idx, "venue_room", e.target.value)} placeholder="Room" />
              </div>
              <div className="space-y-2">
                <Label>Invigilator(s)</Label>
                <Input className={inputStyles} value={block.invigilator_names} onChange={(e) => updateBlock(idx, "invigilator_names", e.target.value)} placeholder="Names, comma separated" />
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" min="0" className={inputStyles} value={block.capacity} onChange={(e) => updateBlock(idx, "capacity", e.target.value)} placeholder="Seats" />
              </div>
            </div>

            {/* Row 4: Allowed items, Special instructions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Allowed Items</Label>
                <Input className={inputStyles} value={block.allowed_items} onChange={(e) => updateBlock(idx, "allowed_items", e.target.value)} placeholder="e.g. Calculator, ruler" />
              </div>
              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea rows={2} value={block.special_instructions} onChange={(e) => updateBlock(idx, "special_instructions", e.target.value)} placeholder="Any special instructions..." />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
