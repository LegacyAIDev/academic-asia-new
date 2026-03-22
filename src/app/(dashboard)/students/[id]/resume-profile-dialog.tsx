"use client"

import { useState, useTransition } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Pencil, Loader2, FileText, Check, Plus } from "lucide-react"
import { upsertStudentResumeProfile, type UpsertResumeProfileInput } from "@/lib/supabase/actions/student-resume-profile"
import type { ResumeProfileRecord } from "@/lib/supabase/queries/student-resume-profile"

type Props = {
  studentId: string
  profile: ResumeProfileRecord | null
}

const textareaStyles = "resize-none bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
const selectStyles = "h-10 bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"

export function ResumeProfileDialog({ studentId, profile }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const isEdit = !!profile

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)

    const englishVal = fd.get("english_standard") as string
    const input: UpsertResumeProfileInput = {
      student_id: studentId,
      english_standard: (englishVal && englishVal !== "__none__") ? englishVal as 'fluent' | 'good' | 'not_good' : null,
      interests_hobbies: (fd.get("interests_hobbies") as string) || null,
      parents_input: (fd.get("parents_input") as string) || null,
    }

    startTransition(async () => {
      const result = await upsertStudentResumeProfile(input)
      if (result?.success) setOpen(false)
      else setError(result?.error ?? "An error occurred")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 shadow-sm bg-primary hover:bg-primary/90">
          {isEdit ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isEdit ? "Edit Resume" : "Add Resume"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-[560px] !max-h-[92vh] !overflow-hidden !p-0 !gap-0 bg-background flex flex-col" showCloseButton={false}>
        <div className="relative overflow-hidden border-b border-border/50">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <div className="relative flex items-center gap-4 px-6 py-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <DialogHeader className="flex-1 space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {isEdit ? "Edit Resume Profile" : "Add Resume Profile"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">English standard, interests, and parents input</p>
            </DialogHeader>
            <button onClick={() => setOpen(false)} aria-label="Close" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">English Standard</Label>
              <Select name="english_standard" defaultValue={profile?.english_standard ?? "__none__"}>
                <SelectTrigger className={selectStyles}><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not set</SelectItem>
                  <SelectItem value="fluent">Fluent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="not_good">Not Good</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Interests & Hobbies</Label>
              <Textarea name="interests_hobbies" rows={4} className={textareaStyles} defaultValue={profile?.interests_hobbies ?? ""} placeholder="Student interests and hobbies..." />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Parents Input</Label>
              <Textarea name="parents_input" rows={4} className={textareaStyles} defaultValue={profile?.parents_input ?? ""} placeholder="Parent expectations and input..." />
            </div>
          </div>

          <div className="border-t border-border bg-muted/50 px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="min-w-[140px] gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><Check className="h-4 w-4" />Save Changes</>}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
