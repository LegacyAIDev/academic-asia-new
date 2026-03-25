"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Trophy, Trash2, Check, Video } from "lucide-react"
import { createStudentTalent, deleteStudentTalent } from "@/lib/supabase/actions/student-resume-talents"
import type { ResumeTalentRecord } from "@/lib/supabase/queries/student-resume-profile"

type Props = { studentId: string; talents: ResumeTalentRecord[] }

const categoryLabels: Record<string, { label: string; style: string }> = {
  music: { label: "Music", style: "bg-violet-50 text-violet-700 border-violet-200" },
  sports: { label: "Sports", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  academic: { label: "Academic", style: "bg-blue-50 text-blue-700 border-blue-200" },
  art: { label: "Art", style: "bg-pink-50 text-pink-700 border-pink-200" },
  others: { label: "Others", style: "bg-slate-50 text-slate-700 border-slate-200" },
}

export function ResumeTalentsSection({ studentId, talents }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const category = fd.get("category") as string

    if (!category) { setError("Category is required"); return }

    startTransition(async () => {
      const result = await createStudentTalent({
        student_id: studentId,
        category: category as 'music' | 'sports' | 'academic' | 'art' | 'others',
        instrument_sport: (fd.get("instrument_sport") as string) || null,
        award_name: (fd.get("award_name") as string) || null,
        results: (fd.get("results") as string) || null,
      }, fd)
      if (result?.success) setShowForm(false)
      else setError(result?.error ?? "Failed to add talent")
    })
  }

  const handleDelete = (talentId: string) => {
    startTransition(async () => {
      await deleteStudentTalent(talentId, studentId)
    })
  }

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Special Talents</span>
          {talents.length > 0 && <Badge variant="secondary" className="text-xs">{talents.length}</Badge>}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Add Talent
        </Button>
      </div>

      {talents.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-2">No special talents added</p>
      )}

      {talents.map((t) => {
        const cat = categoryLabels[t.category] ?? categoryLabels.others
        return (
          <div key={t.id} className="flex items-center gap-3 text-sm bg-background rounded-lg p-3 border border-border/50">
            <Badge variant="outline" className={`${cat.style} border text-xs shrink-0`}>{cat.label}</Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t.award_name || t.instrument_sport || "Untitled"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {t.instrument_sport && <span>{t.instrument_sport}</span>}
                {t.results && <span>· {t.results}</span>}
                {t.video_file_name && (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <Video className="h-3 w-3" /> {t.video_file_name}
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(t.id)} disabled={isPending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-background rounded-lg p-4 border border-border/50 space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category *</Label>
              <Select name="category">
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="art">Art</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Instrument / Sport</Label>
              <Input name="instrument_sport" className="h-9 text-sm" placeholder="e.g. Piano, Football" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Award Name</Label>
              <Input name="award_name" className="h-9 text-sm" placeholder="e.g. Grade 8 Piano" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Results</Label>
              <Input name="results" className="h-9 text-sm" placeholder="e.g. Distinction" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Video (optional, max 50 MB)</Label>
            <Input name="video" type="file" className="h-9 text-sm" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isPending} className="gap-1">
              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Add
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
