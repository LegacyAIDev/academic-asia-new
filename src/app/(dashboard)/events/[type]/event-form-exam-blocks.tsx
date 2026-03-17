"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { BookOpen, Plus, Trash2, ChevronsUpDown } from "lucide-react"
import { inputStyles, selectTriggerStyles } from "./event-form-types"

const EXAM_SUBJECTS = ["Maths", "English", "Verbal", "Others"] as const
const APPLY_YEARS = Array.from({ length: 13 }, (_, i) => `Year ${i + 1}`)
const ALLOWED_ITEMS = ["Calculator allowed", "Dictionary allowed", "Pencil only", "Scratch paper provided"] as const
const splitCsv = (s: string) => s ? s.split(", ").filter(Boolean) : []

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

type StaffProfile = { id: string; first_name: string | null; surname: string | null }

type Props = {
  examBlocks: ExamBlockRow[]
  onChange: (blocks: ExamBlockRow[]) => void
  profiles: StaffProfile[]
}

/** Repeatable exam block cards for group sitting scheduling mode */
export function EventFormExamBlocks({ examBlocks, onChange, profiles }: Props) {
  const addBlock = () => onChange([...examBlocks, emptyBlock()])
  const removeBlock = (idx: number) => onChange(examBlocks.filter((_, i) => i !== idx))
  const updateBlock = (idx: number, field: keyof ExamBlockRow, value: string) => {
    const updated = [...examBlocks]
    updated[idx] = { ...updated[idx], [field]: value }
    onChange(updated)
  }

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
        {examBlocks.map((block, idx) => (
          <div key={idx} className="rounded-lg border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Exam {idx + 1}</span>
              {examBlocks.length > 1 && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeBlock(idx)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={block.subject || undefined} onValueChange={(v) => updateBlock(idx, "subject", v)}>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {EXAM_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Exam Name</Label>
                <Input className={inputStyles} value={block.name} onChange={(e) => updateBlock(idx, "name", e.target.value)} placeholder="Exam name" />
              </div>
              <div className="space-y-2">
                <Label>Apply Year</Label>
                <Select value={block.apply_year || undefined} onValueChange={(v) => updateBlock(idx, "apply_year", v)}>
                  <SelectTrigger className={selectTriggerStyles}><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {APPLY_YEARS.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Venue / Room</Label>
                <Input className={inputStyles} value={block.venue_room} onChange={(e) => updateBlock(idx, "venue_room", e.target.value)} placeholder="Room" />
              </div>
              <div className="space-y-2">
                <Label>Invigilator(s)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={`${selectTriggerStyles} justify-between font-normal`}>
                      <span className="truncate">
                        {block.invigilator_names || "Select staff..."}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-60 p-2 max-h-60 overflow-y-auto" align="start">
                    {profiles.map((p) => {
                      const name = `${p.first_name ?? ""} ${p.surname ?? ""}`.trim()
                      const selected = splitCsv(block.invigilator_names)
                      const checked = selected.includes(name)
                      return (
                        <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted cursor-pointer">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = c ? [...selected, name] : selected.filter((s) => s !== name)
                              updateBlock(idx, "invigilator_names", next.join(", "))
                            }}
                          />
                          {name}
                        </label>
                      )
                    })}
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input type="number" min="0" className={inputStyles} value={block.capacity} onChange={(e) => updateBlock(idx, "capacity", e.target.value)} placeholder="Seats" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Allowed Items</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ALLOWED_ITEMS.map((item) => {
                    const selected = splitCsv(block.allowed_items)
                    const checked = selected.includes(item)
                    return (
                      <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const next = c ? [...selected, item] : selected.filter((s) => s !== item)
                            updateBlock(idx, "allowed_items", next.join(", "))
                          }}
                        />
                        {item}
                      </label>
                    )
                  })}
                </div>
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
